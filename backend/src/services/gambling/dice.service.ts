import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { logger } from "../../lib/logger";
import { nowIso } from "../../lib/dates";
import { newId } from "../../lib/ids";
import {
  ActiveDiceGame,
  DiceGameResult,
  DiceRollPhaseResult,
  HandInfo,
} from "@/types/gambling";
import { Db } from "@/types";
import { UserService } from "@/services/user.service";
import {
  GAMBLING_BAN_THRESHOLD,
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
} from "../../lib/gambling.constants";
import { deductTickets, addTickets } from "../../lib/ticket.helpers";

const MAX_VOID_REROLLS = 2;
const DICE_BROKEN_CHANCE = 0.01;

export interface DiceDevOverrides {
  devForceBreak?: boolean;
  devForceBreakDieIndex?: number;
  devForceDealerValues?: [number, number, number];
  devForcePlayerValues?: [number, number, number];
}

function getRandomDice(): [number, number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

function getOppositeValue(v: number): number {
  return 7 - v;
}

export function evaluateHand(values: [number, number, number]): HandInfo {
  const sorted = [...values].sort((a, b) => a - b);
  const [a, b, c] = sorted;
  const unique = new Set(values);

  if (a === 1 && b === 1 && c === 1) {
    return { rank: 5, mult: 5, label: "1·1·1 - джекпот" };
  }
  if (unique.size === 1) {
    return { rank: 4, mult: 3, kicker: a, label: `Три ${a}` };
  }
  if (a === 4 && b === 5 && c === 6) {
    return { rank: 3, mult: 2, label: "4·5·6" };
  }
  if (unique.size === 2) {
    const pairValue = a === b ? a : c;
    const kicker = values.filter((v) => v !== pairValue)[0];
    return { rank: 2, mult: 1, kicker, label: `Пара ${pairValue} + ${kicker}` };
  }
  if (a === 1 && b === 2 && c === 3) {
    return { rank: 1, mult: 2, label: "1·2·3" };
  }
  return { rank: 0, mult: 0, label: "Нет комбинации" };
}

function evaluateBestHand(values: number[]): HandInfo {
  let best: HandInfo | null = null;
  for (let i = 0; i < values.length - 2; i++) {
    for (let j = i + 1; j < values.length - 1; j++) {
      for (let k = j + 1; k < values.length; k++) {
        const combo: [number, number, number] = [
          values[i],
          values[j],
          values[k],
        ];
        const hand = evaluateHand(combo);
        if (
          !best ||
          hand.rank > best.rank ||
          (hand.rank === best.rank && (hand.kicker ?? 0) > (best.kicker ?? 0))
        ) {
          best = hand;
        }
      }
    }
  }
  return best!;
}

function tryRollBreak(
  values: [number, number, number],
  overrides?: DiceDevOverrides,
): { hand: HandInfo; broken: boolean; brokenDieIndex: number } {
  const forceBreak = overrides?.devForceBreak;
  const broken = forceBreak || Math.random() < DICE_BROKEN_CHANCE;
  if (!broken) {
    return { hand: evaluateHand(values), broken: false, brokenDieIndex: -1 };
  }
  const dieIndex =
    overrides?.devForceBreakDieIndex ?? Math.floor(Math.random() * 3);
  const opposite = getOppositeValue(values[dieIndex]);
  const pool = [values[0], values[1], values[2], opposite];
  const hand = evaluateBestHand(pool);
  return { hand, broken: true, brokenDieIndex: dieIndex };
}

function compareHands(
  dealerHand: HandInfo,
  playerHand: HandInfo,
  bid: number,
): {
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
} {
  if (dealerHand.rank > playerHand.rank) {
    const mult = dealerHand.mult;
    return {
      payout: 0,
      net: -(mult * bid),
      label: `${dealerHand.label} - дилер победил`,
      tone: "lose",
    };
  }

  if (playerHand.rank > dealerHand.rank) {
    const mult = playerHand.mult;
    return {
      payout: bid + mult * bid,
      net: mult * bid,
      label: `${playerHand.label} - ты победил`,
      tone: playerHand.rank === 5 ? "jackpot" : "win",
    };
  }

  // Same rank — tiebreak
  if (dealerHand.rank === 4 && playerHand.kicker !== dealerHand.kicker) {
    if (playerHand.kicker! > dealerHand.kicker!) {
      return {
        payout: bid + 3 * bid,
        net: 3 * bid,
        label: `${playerHand.label} > ${dealerHand.label} - ты победил`,
        tone: "win",
      };
    }
    return {
      payout: 0,
      net: -(3 * bid),
      label: `${playerHand.label} < ${dealerHand.label} - дилер победил`,
      tone: "lose",
    };
  }

  if (dealerHand.rank === 2 && playerHand.kicker !== dealerHand.kicker) {
    if (playerHand.kicker! > dealerHand.kicker!) {
      return {
        payout: bid + bid,
        net: bid,
        label: `${playerHand.kicker} > ${dealerHand.kicker} - ты победил`,
        tone: "win",
      };
    }
    return {
      payout: 0,
      net: -bid,
      label: `${playerHand.kicker} < ${dealerHand.kicker} - дилер победил`,
      tone: "lose",
    };
  }

  // Same rank with equal values or ranks 5/3/1/0 — push
  return {
    payout: bid,
    net: 0,
    label: `Ничья - ставка возвращена`,
    tone: "chance",
  };
}

export class DiceService {
  private games = new Map<string, ActiveDiceGame>();

  constructor(
    private db: Db,
    private userService: UserService,
  ) {}

  getActiveGame(userId: string): ActiveDiceGame | undefined {
    return this.games.get(userId);
  }

  async rollDealer(
    userId: string,
    bid: number,
    devMode?: boolean,
    devOverrides?: DiceDevOverrides,
  ): Promise<DiceRollPhaseResult> {
    if (!devMode) {
      if (
        bid < GAMBLING_MIN_BET ||
        bid > GAMBLING_MAX_BET ||
        !Number.isInteger(bid)
      )
        throw new Error("Invalid bid");
    }

    const user = devMode ? null : await this.userService.getById(userId);
    if (!devMode && !user) throw new Error("User not found");
    if (!devMode && user!.tickets < bid)
      throw new Error("Insufficient balance");
    if (!devMode && user!.gamblingBanned)
      throw new Error("Banned from gambling");

    const values = devOverrides?.devForceDealerValues ?? getRandomDice();
    const { hand, broken, brokenDieIndex } = tryRollBreak(values, devOverrides);

    const game: ActiveDiceGame = {
      dealerValues: values,
      dealerHandInfo: hand,
      phase: "dealer",
      bid,
      userId,
      dealerRerolls: 0,
      playerRerolls: 0,
      broken: broken || undefined,
      brokenDieIndex: broken ? brokenDieIndex : undefined,
    };
    this.games.set(userId, game);

    logger.info(
      user?.username ?? "dev",
      "dealer rolled",
      values.join(", "),
      broken ? "(BROKEN)" : "",
    );

    if (hand.rank === 0 && game.dealerRerolls < MAX_VOID_REROLLS) {
      game.dealerRerolls++;
      return {
        phase: "dealer",
        values,
        reroll: true,
        handLabel: "Нет комбинации - переброс",
        broken: broken || undefined,
        brokenDieIndex: broken ? brokenDieIndex : undefined,
      };
    }

    game.phase = "player";
    return {
      phase: "dealer",
      values,
      reroll: false,
      handLabel: hand.label,
      broken: broken || undefined,
      brokenDieIndex: broken ? brokenDieIndex : undefined,
    };
  }

  async rerollDealer(
    userId: string,
    devMode?: boolean,
    devOverrides?: DiceDevOverrides,
  ): Promise<DiceRollPhaseResult> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "dealer")
      throw new Error("No active dealer roll");

    const user = devMode ? null : await this.userService.getById(userId);
    if (!devMode && !user) throw new Error("User not found");

    const values = devOverrides?.devForceDealerValues ?? getRandomDice();
    const { hand, broken, brokenDieIndex } = tryRollBreak(values, devOverrides);
    game.dealerValues = values;
    game.dealerHandInfo = hand;
    game.broken = broken || undefined;
    game.brokenDieIndex = broken ? brokenDieIndex : undefined;

    logger.info(
      user?.username ?? "dev",
      "dealer reroll",
      values.join(", "),
      broken ? "(BROKEN)" : "",
    );

    if (hand.rank === 0 && game.dealerRerolls < MAX_VOID_REROLLS) {
      game.dealerRerolls++;
      return {
        phase: "dealer",
        values,
        reroll: true,
        handLabel: "Нет комбинации - переброс",
        broken: broken || undefined,
        brokenDieIndex: broken ? brokenDieIndex : undefined,
      };
    }

    game.phase = "player";
    return {
      phase: "dealer",
      values,
      reroll: false,
      handLabel: hand.label,
      broken: broken || undefined,
      brokenDieIndex: broken ? brokenDieIndex : undefined,
    };
  }

  async rollPlayer(
    userId: string,
    devMode?: boolean,
    devOverrides?: DiceDevOverrides,
  ): Promise<DiceGameResult> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "player")
      throw new Error("No active dice game");

    const user = devMode ? null : await this.userService.getById(userId);
    if (!devMode && !user) throw new Error("User not found");

    const values = devOverrides?.devForcePlayerValues ?? getRandomDice();
    const { hand, broken, brokenDieIndex } = tryRollBreak(values, devOverrides);

    logger.info(
      user?.username ?? "dev",
      "player rolled",
      values.join(", "),
      broken ? "(BROKEN)" : "",
    );

    if (hand.rank === 0 && game.playerRerolls < MAX_VOID_REROLLS) {
      game.playerRerolls++;
      return {
        playerValues: values,
        payout: 0,
        net: 0,
        label: "Нет комбинации - переброс",
        tone: "reroll",
        balance: user?.tickets ?? 0,
        banned: false,
        reroll: true,
        broken: broken || undefined,
        brokenDieIndex: broken ? brokenDieIndex : undefined,
      };
    }

    this.games.delete(userId);

    const comparison = compareHands(game.dealerHandInfo, hand, game.bid);

    if (!devMode && user) {
      await this.db.insert(schema.history).values({
        id: newId(),
        userId,
        owner: { id: user.id, username: user.username },
        type: "dice",
        label: comparison.label,
        image: "",
        bid: game.bid,
        payout: comparison.payout,
        net: comparison.net,
        data: {
          dealerValues: game.dealerValues,
          playerValues: values,
          dealerRerolls: game.dealerRerolls,
          playerRerolls: game.playerRerolls,
          dealerBroken: game.broken,
          dealerBrokenDieIndex: game.brokenDieIndex,
          playerBroken: broken || undefined,
          playerBrokenDieIndex: broken ? brokenDieIndex : undefined,
        },
        created: nowIso(),
      });
    }

    const net = comparison.net;
    let gamblingWinnings: number = user?.gamblingWinnings ?? 0;
    let gamblingBanned: boolean = user?.gamblingBanned ?? false;
    if (!devMode && net > 0) {
      gamblingWinnings += net;
      if (gamblingWinnings >= GAMBLING_BAN_THRESHOLD && !gamblingBanned) {
        gamblingBanned = true;
      }
    }

    if (!devMode) {
      if (comparison.net > 0) {
        await addTickets(this.db, userId, game.bid + comparison.net);
      } else if (comparison.net < 0) {
        await deductTickets(this.db, userId, Math.abs(comparison.net));
      }

      await this.db
        .update(schema.users)
        .set({
          gamblingWinnings,
          gamblingBanned,
          updated: nowIso(),
        })
        .where(eq(schema.users.id, userId));
    }

    const updatedUser = devMode ? null : await this.userService.getById(userId);

    return {
      playerValues: values,
      payout: comparison.payout,
      net,
      label: comparison.label,
      tone: comparison.tone,
      balance: updatedUser?.tickets ?? 0,
      banned: gamblingBanned,
      broken: broken || undefined,
      brokenDieIndex: broken ? brokenDieIndex : undefined,
    };
  }

  async abort(userId: string): Promise<{ refunded: number; balance: number }> {
    const game = this.games.get(userId);
    this.games.delete(userId);
    const user = await this.userService.getById(userId);
    return { refunded: 0, balance: user?.tickets ?? 0 };
  }
}
