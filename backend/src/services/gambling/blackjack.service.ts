import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { logger } from "../../lib/logger";
import { nowIso } from "../../lib/dates";
import { Db } from "@/types";
import { BlackjackResult, BlackjackState, Card } from "@/types/gambling";
import {
  createShoe,
  draw,
  handValue,
  isBlackjack,
  isPeekCard,
  computeOutcome,
  resolveLabels,
  dealerPlay,
} from "../../lib/blackjack.utils";
import { UserService } from "../user.service";

interface ActiveGame {
  userId: string;
  bid: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  phase: "player" | "ended";
}

export class BlackjackService {
  constructor(
    private db: Db,
    private userService: UserService,
  ) {}

  private games = new Map<string, ActiveGame>();

  private async applyGamblingPayout(
    userId: string,
    bid: number,
    payout: number,
  ): Promise<{ banned: boolean; balance: number }> {
    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");

    let gamblingWinnings = user.gamblingWinnings ?? 0;
    let gamblingBanned = user.gamblingBanned ?? false;

    if (payout > 0) {
      gamblingWinnings += payout;
      if (gamblingWinnings >= 30 && !gamblingBanned) {
        gamblingBanned = true;
      }
      await this.userService.score(userId, payout);
    }

    await this.db
      .update(schema.users)
      .set({
        gamblingWinnings,
        gamblingBanned,
        updated: nowIso(),
      })
      .where(eq(schema.users.id, userId));

    const updated = await this.userService.getById(userId);
    return { banned: gamblingBanned, balance: updated?.money ?? 0 };
  }

  private async finishGame(game: ActiveGame): Promise<BlackjackState> {
    game.phase = "ended";

    const { payout, outcome } = computeOutcome(game.playerHand, game.dealerHand, game.bid);
    const pv = handValue(game.playerHand);
    const dv = handValue(game.dealerHand);
    const { label, tone } = resolveLabels(outcome, pv, dv);

    const { banned, balance } = await this.applyGamblingPayout(
      game.userId,
      game.bid,
      payout,
    );

    this.games.delete(game.userId);

    const user = await this.userService.getById(game.userId);
    logger.info(
      user?.username,
      "blackjack",
      outcome,
      `net:${-game.bid + payout}`,
    );

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
    if (isBlackjack(game.playerHand)) {
      return this.finishGame(game);
    }

    const dealerUp = game.dealerHand[0];
    if (isPeekCard(dealerUp) && isBlackjack(game.dealerHand)) {
      return this.finishGame(game);
    }

    return null;
  }

  async deal(userId: string, bid: number): Promise<BlackjackState> {
    if (bid < 1 || bid > 10 || !Number.isInteger(bid)) {
      throw new Error("Invalid bid");
    }

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");
    if (user.money < bid) throw new Error("Insufficient balance");
    if (user.gamblingBanned) throw new Error("Banned from gambling");
    if (this.games.has(userId)) throw new Error("Game already in progress");

    await this.userService.score(userId, -bid);

    const game: ActiveGame = {
      userId,
      bid,
      deck: createShoe(),
      playerHand: [],
      dealerHand: [],
      phase: "player",
    };

    game.playerHand.push(draw(game.deck));
    game.dealerHand.push(draw(game.deck));
    game.playerHand.push(draw(game.deck));
    game.dealerHand.push(draw(game.deck));

    this.games.set(userId, game);

    const updated = await this.userService.getById(userId);
    const balance = updated?.money ?? 0;

    const instant = await this.maybeResolveAfterDeal(game);
    if (instant) return instant;

    if (handValue(game.playerHand) >= 21) {
      return this.finishGame(game);
    }

    return this.toState(game, balance);
  }

  async hit(userId: string): Promise<BlackjackState> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "player") {
      throw new Error("No active game");
    }

    game.playerHand.push(draw(game.deck));

    const updated = await this.userService.getById(userId);
    const balance = updated?.money ?? 0;

    if (handValue(game.playerHand) > 21) {
      return this.finishGame(game);
    }

    if (handValue(game.playerHand) === 21) {
      dealerPlay(game.dealerHand, game.deck);
      return this.finishGame(game);
    }

    return this.toState(game, balance);
  }

  async stand(userId: string): Promise<BlackjackState> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "player") {
      throw new Error("No active game");
    }

    dealerPlay(game.dealerHand, game.deck);
    return this.finishGame(game);
  }

  async getState(userId: string): Promise<BlackjackState | null> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "player") return null;

    const user = await this.userService.getById(userId);
    return this.toState(game, user?.money ?? 0);
  }

  abandon(userId: string): boolean {
    return this.games.delete(userId);
  }
}
