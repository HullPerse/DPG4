import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { nowIso, newId } from "@/lib/index.utils";
import {
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
import { Db } from "@/types/server";
import UserService from "@/services/user.service";
import EconomyService from "@/services/economy.service";
import {
  GAMBLING_BAN_THRESHOLD,
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
} from "@/lib/gambling.constants";
import Logger from "@/lib/logger.utils";

export default class BlackjackService {
  private games = new Map<string, ActiveGame>();
  private logger = new Logger("BLACKJACK");

  constructor(
    private db: Db,
    private userService: UserService,
    private economyService: EconomyService,
  ) {}

  private async applyGamblingPayout(
    userId: string,
    bid: number,
    payout: number,
    devMode?: boolean,
  ): Promise<{ banned: boolean; balance: number }> {
    const user = devMode ? null : await this.userService.getById(userId);
    if (!devMode && !user) throw new Error("User not found");
    let gamblingWinnings = user?.gamblingWinnings ?? 0;
    let gamblingBanned = user?.gamblingBanned ?? false;
    if (!devMode && payout > 0) {
      const profit = Math.max(0, payout - bid);
      gamblingWinnings += profit;
      if (gamblingWinnings >= GAMBLING_BAN_THRESHOLD && !gamblingBanned)
        gamblingBanned = true;
      await this.economyService.addTickets(userId, payout);
    }
    if (!devMode) {
      await this.db
        .update(schema.users)
        .set({ gamblingWinnings, gamblingBanned, updated: nowIso() })
        .where(eq(schema.users.id, userId));
    }
    const updated = devMode ? null : await this.userService.getById(userId);
    return { banned: gamblingBanned, balance: updated?.tickets ?? 0 };
  }

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
    const { banned, balance } = await this.applyGamblingPayout(
      game.userId,
      game.bid,
      payout,
      devMode,
    );
    this.games.delete(game.userId);

    if (!devMode) {
      const user = await this.userService.getById(game.userId);
      if (user) {
        await this.db.insert(schema.history).values({
          id: newId(),
          userId: game.userId,
          owner: { id: user.id, username: user.username },
          type: "blackjack",
          label,
          image: "",
          bid: game.bid,
          payout,
          net: -game.bid + payout,
          data: {
            outcome,
            playerHand: game.playerHand,
            dealerHand: game.dealerHand,
            playerValue: handValue(game.playerHand),
            dealerValue: handValue(game.dealerHand),
          },
          created: nowIso(),
        });
      }
      this.logger.info(`blackjack ${outcome} net:${-game.bid + payout}`);
    }
    return this.toState(game, balance, {
      outcome,
      payout,
      net: -game.bid + payout,
      label,
      tone,
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
    if (!devMode) {
      if (
        bid < GAMBLING_MIN_BET ||
        bid > GAMBLING_MAX_BET ||
        !Number.isInteger(bid)
      )
        throw new Error("Invalid bid");
      const user = await this.userService.getById(userId);
      if (!user) throw new Error("User not found");
      if (user.tickets < bid) throw new Error("Insufficient balance");
      if (user.gamblingBanned) throw new Error("Banned from gambling");
      if (this.games.has(userId)) throw new Error("Game already in progress");
      await this.economyService.deductTickets(userId, bid);
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

    this.games.set(userId, game);
    const updated = devMode ? null : await this.userService.getById(userId);
    const balance = updated?.tickets ?? 0;

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
    const game = this.games.get(userId);
    if (!game || game.phase !== "player") throw new Error("No active game");
    const card = devOverrides?.devForceHitCard
      ? devOverrides.devForceHitCard[0]
      : draw(game.deck);
    game.playerHand.push(card);
    const updated = devMode ? null : await this.userService.getById(userId);
    const balance = updated?.tickets ?? 0;
    if (handValue(game.playerHand) > 21) return this.finishGame(game, devMode);
    if (handValue(game.playerHand) === 21) {
      dealerPlay(game.dealerHand, game.deck);
      return this.finishGame(game, devMode);
    }
    return this.toState(game, balance);
  }

  async stand(userId: string, devMode?: boolean): Promise<BlackjackState> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "player") throw new Error("No active game");
    dealerPlay(game.dealerHand, game.deck);
    return this.finishGame(game, devMode);
  }

  async getState(userId: string): Promise<BlackjackState | null> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "player") return null;
    const user = await this.userService.getById(userId);
    return this.toState(game, user?.tickets ?? 0);
  }

  abandon(userId: string): boolean {
    return this.games.delete(userId);
  }
}
