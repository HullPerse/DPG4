import type {
  BlackjackResult,
  BlackjackState,
  BlackjackDevOverrides,
  ActiveGame,
} from "@/types/gambling";
import {
  createShoe,
  draw,
  handValue,
  isBlackjack,
  isPeekCard,
  computeOutcome,
  resolveLabels,
  dealerPlay,
} from "@/lib/blackjack.utils";
import type { Db } from "@/types/server";
import UserService from "@/services/user.service";
import EconomyService from "@/services/economy.service";
import { GAMBLING_MIN_BET, GAMBLING_MAX_BET } from "@/lib/gambling.constants";
import Logger from "@/lib/logger.utils";
import { processPayout, recordHistory } from "@/lib/gambling/payout.utils";
import { loadSession, saveSession, closeSession } from "@/lib/gambling/session.utils";

export default class BlackjackService {
  private logger = new Logger("BLACKJACK");

  constructor(
    private db: Db,
    private userService: UserService,
    private economyService: EconomyService,
  ) {}

  private async finishGame(
    game: ActiveGame,
    devMode?: boolean,
  ): Promise<BlackjackState> {
    game.phase = "ended";
    const { payout, outcome } = computeOutcome(
      game.playerHand,
      game.dealerHand,
      game.bid,
    );
    const pv = handValue(game.playerHand);
    const dv = handValue(game.dealerHand);
    const { label, tone } = resolveLabels(outcome, pv, dv);

    let banned = false;
    let balance = 0;
    if (!devMode) {
      const result = await processPayout(
        this.db,
        this.economyService,
        game.userId,
        game.bid,
        payout,
      );
      banned = result.banned;
      balance = result.balance;
    }

    await closeSession(this.db, game.userId, 'blackjack');

    if (!devMode) {
      await recordHistory(this.db, game.userId, "blackjack", label, "",
        game.bid, payout, -game.bid + payout, {
        outcome,
        playerHand: game.playerHand,
        dealerHand: game.dealerHand,
        playerValue: handValue(game.playerHand),
        dealerValue: handValue(game.dealerHand),
      });
      this.logger.info(`blackjack ${outcome} net:${-game.bid + payout}`);
    }
    return this.toState(game, balance, {
      outcome,
      payout,
      net: -game.bid + payout,
      label,
      tone: tone as "win" | "lose" | "jackpot" | "chance",
      banned,
    });
  }

  private toState(
    game: ActiveGame,
    balance: number,
    result: BlackjackResult | null = null,
  ): BlackjackState {
    const ended = game.phase === "ended";
    return {
      phase: game.phase,
      playerHand: [...game.playerHand],
      dealerHand: ended ? [...game.dealerHand] : [game.dealerHand[0]],
      dealerHoleHidden: !ended && game.dealerHand.length > 1,
      playerValue: handValue(game.playerHand),
      dealerValue: ended ? handValue(game.dealerHand) : null,
      bid: game.bid,
      balance,
      result,
    };
  }

  private async maybeResolveAfterDeal(
    game: ActiveGame,
  ): Promise<BlackjackState | null> {
    if (isBlackjack(game.playerHand)) return this.finishGame(game);
    const dealerUp = game.dealerHand[0];
    if (isPeekCard(dealerUp) && isBlackjack(game.dealerHand))
      return this.finishGame(game);
    return null;
  }

  async deal(
    userId: string,
    bid: number,
    devMode?: boolean,
    devOverrides?: BlackjackDevOverrides,
  ): Promise<BlackjackState> {
    let balance = 0;
    if (!devMode) {
      if (
        bid < GAMBLING_MIN_BET ||
        bid > GAMBLING_MAX_BET ||
        !Number.isInteger(bid)
      )
        throw new Error("Invalid bid");
      const existing = await loadSession(this.db, userId, 'blackjack'); if (existing) throw new Error("Game already in progress");
      const user = await this.userService.getById(userId);
      if (!user) throw new Error("User not found");
      if (user.tickets < bid) throw new Error("Insufficient balance");
      if (user.gamblingBanned) throw new Error("Banned from gambling");
      await this.economyService.deductTickets(userId, bid);
      const updated = await this.userService.getById(userId);
      balance = updated?.tickets ?? 0;
    }

    const game: ActiveGame = {
      userId,
      bid,
      deck: createShoe(),
      playerHand: [],
      dealerHand: [],
      phase: "player",
    };

    if (
      devOverrides?.devForcePlayerCards &&
      devOverrides.devForcePlayerCards.length >= 2
    ) {
      game.playerHand = devOverrides.devForcePlayerCards.slice(0, 2);
    } else {
      game.playerHand.push(draw(game.deck));
      game.playerHand.push(draw(game.deck));
    }

    if (
      devOverrides?.devForceDealerCards &&
      devOverrides.devForceDealerCards.length >= 2
    ) {
      game.dealerHand = devOverrides.devForceDealerCards.slice(0, 2);
    } else {
      game.dealerHand.push(draw(game.deck));
      game.dealerHand.push(draw(game.deck));
    }

    await saveSession(this.db, userId, 'blackjack', game as unknown as Record<string, unknown>, bid);

    const instant = await this.maybeResolveAfterDeal(game);
    if (instant) return instant;
    if (handValue(game.playerHand) >= 21) return this.finishGame(game, devMode);
    return this.toState(game, balance);
  }

  async hit(
    userId: string,
    devMode?: boolean,
    devOverrides?: BlackjackDevOverrides,
  ): Promise<BlackjackState> {
    const session = await loadSession(this.db, userId, 'blackjack');
    if (!session) throw new Error("No active game");
    const game = session.state as unknown as ActiveGame;
    if (game.phase !== "player") throw new Error("No active game");
    const card = devOverrides?.devForceHitCard
      ? devOverrides.devForceHitCard[0]
      : draw(game.deck);
    game.playerHand.push(card);
    const updated = devMode ? null : await this.userService.getById(userId);
    const balance = updated?.tickets ?? 0;
    if (handValue(game.playerHand) > 21) { await closeSession(this.db, userId, 'blackjack'); return this.finishGame(game, devMode); }
    if (handValue(game.playerHand) === 21) {
      dealerPlay(game.dealerHand, game.deck);
      await closeSession(this.db, userId, 'blackjack');
      return this.finishGame(game, devMode);
    }
    await saveSession(this.db, userId, 'blackjack', game as unknown as Record<string, unknown>, game.bid);
    return this.toState(game, balance);
  }

  async stand(userId: string, devMode?: boolean): Promise<BlackjackState> {
    const session = await loadSession(this.db, userId, 'blackjack');
    if (!session) throw new Error("No active game");
    const game = session.state as unknown as ActiveGame;
    if (game.phase !== "player") throw new Error("No active game");
    dealerPlay(game.dealerHand, game.deck);
    await closeSession(this.db, userId, 'blackjack');
    return this.finishGame(game, devMode);
  }

  async getState(userId: string): Promise<BlackjackState | null> {
    const session = await loadSession(this.db, userId, 'blackjack');
    if (!session || session.phase !== "active") return null;
    const game = session.state as unknown as ActiveGame;
    const user = await this.userService.getById(userId);
    return this.toState(game, user?.tickets ?? 0);
  }

  async abandon(userId: string): Promise<void> {
    await closeSession(this.db, userId, 'blackjack');
  }
}
