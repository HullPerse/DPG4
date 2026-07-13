import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { nowIso, newId } from "@/lib/index.utils";
import type {
  ActiveDiceGame,
  DiceGameResult,
  DiceRollPhaseResult,
  HandInfo,
  DiceDevOverrides,
} from "@/types/gambling";
import type { Db } from "@/types/server";
import UserService from "@/services/user.service";
import EconomyService from "@/services/economy.service";
import {
  GAMBLING_BAN_THRESHOLD,
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
} from "@/lib/gambling.constants";
import Logger from "@/lib/logger.utils";
import { loadSession, saveSession, closeSession } from "@/lib/gambling/session.utils";

const MAX_VOID_REROLLS = 2;
const DICE_BROKEN_CHANCE = 0.1;

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

  if (a === 1 && b === 1 && c === 1)
    return { rank: 5, mult: 5, label: "1·1·1 - джекпот" };
  if (unique.size === 1)
    return { rank: 4, mult: 3, kicker: a, label: `Три ${a}` };
  if (a === 4 && b === 5 && c === 6)
    return { rank: 3, mult: 2, label: "4·5·6" };
  if (unique.size === 2) {
    const pairValue = a === b ? a : c;
    const kicker = values.filter((v) => v !== pairValue)[0];
    return { rank: 2, mult: 1, kicker, label: `Пара ${pairValue} + ${kicker}` };
  }
  if (a === 1 && b === 2 && c === 3)
    return { rank: 1, mult: 2, label: "1·2·3" };
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
  if (!broken)
    return { hand: evaluateHand(values), broken: false, brokenDieIndex: -1 };
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
    return {
      payout: 0,
      net: -(dealerHand.mult * bid),
      label: `${dealerHand.label} - дилер победил`,
      tone: "lose",
    };
  }
  if (playerHand.rank > dealerHand.rank) {
    return {
      payout: bid + playerHand.mult * bid,
      net: playerHand.mult * bid,
      label: `${playerHand.label} - ты победил`,
      tone: playerHand.rank === 5 ? "jackpot" : "win",
    };
  }
  if (dealerHand.rank === 4 && playerHand.kicker !== dealerHand.kicker) {
    if (playerHand.kicker! > dealerHand.kicker!)
      return {
        payout: bid + 3 * bid,
        net: 3 * bid,
        label: `${playerHand.label} > ${dealerHand.label} - ты победил`,
        tone: "win",
      };
    return {
      payout: 0,
      net: -(3 * bid),
      label: `${playerHand.label} < ${dealerHand.label} - дилер победил`,
      tone: "lose",
    };
  }
  if (dealerHand.rank === 2 && playerHand.kicker !== dealerHand.kicker) {
    if (playerHand.kicker! > dealerHand.kicker!)
      return {
        payout: bid + bid,
        net: bid,
        label: `${playerHand.kicker} > ${dealerHand.kicker} - ты победил`,
        tone: "win",
      };
    return {
      payout: 0,
      net: -bid,
      label: `${playerHand.kicker} < ${dealerHand.kicker} - дилер победил`,
      tone: "lose",
    };
  }
  return {
    payout: bid,
    net: 0,
    label: "Ничья - ставка возвращена",
    tone: "chance",
  };
}

export default class DiceService {
  private logger = new Logger("DICE");

  constructor(
    private db: Db,
    private userService: UserService,
    private economyService: EconomyService,
  ) {}

  async getActiveGame(userId: string): Promise<ActiveDiceGame | null> {
    const session = await loadSession(this.db, userId, "dice");
    if (!session) return null;
    return session.state as unknown as ActiveDiceGame;
  }

  async rollDealer(
    userId: string,
    bid: number,
  ): Promise<DiceRollPhaseResult> {
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

    const values = getRandomDice();
    const { hand, broken, brokenDieIndex } = tryRollBreak(values);

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

    await saveSession(this.db, userId, "dice", game as unknown as Record<string, unknown>, bid);

    this.logger.info(
      `dealer rolled ${values.join(", ")}${broken ? " (BROKEN)" : ""}`,
    );

    if (hand.rank === 0 && game.dealerRerolls < MAX_VOID_REROLLS) {
      game.dealerRerolls++;
      await saveSession(this.db, userId, "dice", game as unknown as Record<string, unknown>, bid);
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
    await saveSession(this.db, userId, "dice", game as unknown as Record<string, unknown>, bid);
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
  ): Promise<DiceRollPhaseResult> {
    const session = await loadSession(this.db, userId, "dice");
    const game = session?.state as unknown as ActiveDiceGame | undefined;
    if (!game || game.phase !== "dealer")
      throw new Error("No active dealer roll");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");

    const values = getRandomDice();
    const { hand, broken, brokenDieIndex } = tryRollBreak(values);
    game.dealerValues = values;
    game.dealerHandInfo = hand;
    game.broken = broken || undefined;
    game.brokenDieIndex = broken ? brokenDieIndex : undefined;

    this.logger.info(
      `dealer reroll ${values.join(", ")}${broken ? " (BROKEN)" : ""}`,
    );

    if (hand.rank === 0 && game.dealerRerolls < MAX_VOID_REROLLS) {
      game.dealerRerolls++;
      await saveSession(this.db, userId, "dice", game as unknown as Record<string, unknown>, game.bid);
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
    await saveSession(this.db, userId, "dice", game as unknown as Record<string, unknown>, game.bid);
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
  ): Promise<DiceGameResult> {
    const session = await loadSession(this.db, userId, "dice");
    const game = session?.state as unknown as ActiveDiceGame | undefined;
    if (!game || game.phase !== "player")
      throw new Error("No active dice game");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");

    const values = getRandomDice();
    const { hand, broken, brokenDieIndex } = tryRollBreak(values);

    this.logger.info(
      `player rolled ${values.join(", ")}${broken ? " (BROKEN)" : ""}`,
    );

    if (hand.rank === 0 && game.playerRerolls < MAX_VOID_REROLLS) {
      game.playerRerolls++;
      await saveSession(this.db, userId, "dice", game as unknown as Record<string, unknown>, game.bid);
      return {
        playerValues: values,
        payout: 0,
        net: 0,
        label: "Нет комбинации - переброс",
        tone: "reroll",
        balance: user.tickets ?? 0,
        banned: false,
        reroll: true,
        broken: broken || undefined,
        brokenDieIndex: broken ? brokenDieIndex : undefined,
      };
    }

    await closeSession(this.db, userId, "dice");
    const comparison = compareHands(game.dealerHandInfo, hand, game.bid);

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

    const net = comparison.net;
    let gamblingWinnings = user.gamblingWinnings ?? 0;
    let gamblingBanned = user.gamblingBanned ?? false;
    if (net > 0) {
      gamblingWinnings += net;
      if (gamblingWinnings >= GAMBLING_BAN_THRESHOLD && !gamblingBanned)
        gamblingBanned = true;
    }

    if (comparison.net > 0)
      await this.economyService.addTickets(userId, game.bid + comparison.net);
    else if (comparison.net < 0)
      await this.economyService.deductTickets(
        userId,
        Math.abs(comparison.net),
      );
    await this.db
      .update(schema.users)
      .set({ gamblingWinnings, gamblingBanned, updated: nowIso() })
      .where(eq(schema.users.id, userId));

    const updatedUser = await this.userService.getById(userId);
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
    await closeSession(this.db, userId, "dice");
    const user = await this.userService.getById(userId);
    return { refunded: 0, balance: user?.tickets ?? 0 };
  }
}
