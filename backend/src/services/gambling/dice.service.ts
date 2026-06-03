import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { logger } from "../../lib/logger";
import { nowIso } from "../../lib/dates";
import {
  ActiveDiceGame,
  DiceGameResult,
  DiceRollPhaseResult,
} from "@/types/gambling";
import { Db } from "@/types";
import { UserService } from "../user.service";

function getRandomDice(): [number, number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

function resolveDealerRoll(values: [number, number, number]): {
  target: number | null;
  autoResult: "dealer_win" | "dealer_lose" | "push" | null;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const [a, b, c] = sorted;
  const unique = new Set(values);

  if (a === 1 && b === 2 && c === 3) {
    return { target: null, autoResult: "dealer_lose" };
  }
  if (a === 4 && b === 5 && c === 6) {
    return { target: null, autoResult: "dealer_win" };
  }
  if (a === 1 && b === 1 && c === 1) {
    return { target: null, autoResult: "push" };
  }
  if (unique.size === 1) {
    return { target: null, autoResult: "dealer_win" };
  }
  if (unique.size === 2) {
    const pairValue = unique.has(a) && unique.has(b) && a === b ? a : c;
    const target = values.filter((v) => v !== pairValue)[0];
    return { target, autoResult: null };
  }
  // 3 unique faces (not 1·2·3 or 4·5·6) → void round, return bid
  return { target: null, autoResult: "push" };
}

function resolvePlayerResult(
  values: [number, number, number],
  dealerTarget: number | null,
  autoResult: "dealer_win" | "dealer_lose" | "push" | null,
  bid: number,
): DiceGameResult {
  if (autoResult === "dealer_lose") {
    return {
      playerValues: values,
      payout: bid * 2,
      net: bid,
      label: "Дилер выкинул 1·2·3 - ты победил",
      tone: "win",
      balance: 0,
      banned: false,
    };
  }
  if (autoResult === "dealer_win") {
    return {
      playerValues: values,
      payout: 0,
      net: -bid * 2,
      label: "Дилер победил автоматически",
      tone: "lose",
      balance: 0,
      banned: false,
    };
  }
  if (autoResult === "push") {
    return {
      playerValues: values,
      payout: bid,
      net: 0,
      label: "Дилер выкинул 1·1·1 - ничья",
      tone: "chance",
      balance: 0,
      banned: false,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const [a, b, c] = sorted;
  const unique = new Set(values);

  if (a === 1 && b === 2 && c === 3) {
    return {
      playerValues: values,
      payout: 0,
      net: -bid,
      label: "1·2·3 - проигрыш",
      tone: "lose",
      balance: 0,
      banned: false,
    };
  }
  if (a === 4 && b === 5 && c === 6) {
    const net = Math.floor(bid * 1.5);
    return {
      playerValues: values,
      payout: bid + net,
      net,
      label: "4·5·6 - выигрыш",
      tone: "win",
      balance: 0,
      banned: false,
    };
  }
  if (a === 1 && b === 1 && c === 1) {
    const net = bid * 3;
    return {
      playerValues: values,
      payout: bid + net,
      net,
      label: "Три единицы - джекпот",
      tone: "jackpot",
      balance: 0,
      banned: false,
    };
  }
  if (unique.size === 1) {
    const net = bid * 2;
    return {
      playerValues: values,
      payout: bid + net,
      net,
      label: `Три ${a} - выигрыш`,
      tone: "win",
      balance: 0,
      banned: false,
    };
  }
  if (unique.size === 2) {
    const pairValue = values.filter(
      (v) => values.filter((x) => x === v).length >= 2,
    )[0];
    const playerTarget = values.filter((v) => v !== pairValue)[0];

    if (playerTarget > dealerTarget!) {
      const net = bid;
      return {
        playerValues: values,
        payout: bid + net,
        net,
        label: `${playerTarget} > ${dealerTarget} - выигрыш`,
        tone: "win",
        balance: 0,
        banned: false,
      };
    }
    if (playerTarget === dealerTarget) {
      return {
        playerValues: values,
        payout: bid,
        net: 0,
        label: `${playerTarget} = ${dealerTarget} - ничья`,
        tone: "chance",
        balance: 0,
        banned: false,
      };
    }
    return {
      playerValues: values,
      payout: 0,
      net: -bid,
      label: `${playerTarget} < ${dealerTarget} - проигрыш`,
      tone: "lose",
      balance: 0,
      banned: false,
    };
  }

  // 3 unique non-sequential faces → loss
  return {
    playerValues: values,
    payout: 0,
    net: -bid,
    label: "Ничего - проигрыш",
    tone: "lose",
    balance: 0,
    banned: false,
  };
}

export class DiceService {
  private games = new Map<string, ActiveDiceGame>();

  constructor(
    private db: Db,
    private userService: UserService,
  ) {}

  async rollDealer(userId: string, bid: number): Promise<DiceRollPhaseResult> {
    if (bid < 1 || bid > 10 || !Number.isInteger(bid))
      throw new Error("Invalid bid");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");
    if (user.money < bid) throw new Error("Insufficient balance");
    if (user.gamblingBanned) throw new Error("Banned from gambling");

    let values: [number, number, number];
    let target: number | null;
    let autoResult: "dealer_win" | "dealer_lose" | "push" | null;

    do {
      values = getRandomDice();
      const resolved = resolveDealerRoll(values);
      target = resolved.target;
      autoResult = resolved.autoResult;
    } while (target === null && autoResult === null);

    await this.userService.score(userId, -bid);

    this.games.set(userId, {
      dealerValues: values,
      dealerTarget: target,
      phase: "player",
      bid,
      userId,
      autoResult,
    });

    logger.info(user.username, "dealer rolled", values.join(", "));

    return {
      phase: "dealer",
      values,
      target,
      autoResult,
    };
  }

  async rollPlayer(userId: string): Promise<DiceGameResult> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "player")
      throw new Error("No active dice game");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");

    let values: [number, number, number];
    let result: DiceGameResult;

    do {
      values = getRandomDice();
      result = resolvePlayerResult(
        values,
        game.dealerTarget,
        game.autoResult,
        game.bid,
      );
    } while (result.tone === "reroll");

    if (game.autoResult === "dealer_win") {
      await this.userService.score(userId, -game.bid);
    }

    const net = result.net;

    let gamblingWinnings: number = user.gamblingWinnings ?? 0;
    let gamblingBanned: boolean = user.gamblingBanned ?? false;

    if (result.payout > game.bid) {
      const profit = result.payout - game.bid;
      gamblingWinnings += profit;
      if (gamblingWinnings >= 30 && !gamblingBanned) {
        gamblingBanned = true;
      }
    }

    if (result.payout > 0) {
      await this.userService.score(userId, result.payout);
    }

    await this.db
      .update(schema.users)
      .set({
        gamblingWinnings,
        gamblingBanned,
        updated: nowIso(),
      })
      .where(eq(schema.users.id, userId));

    const updatedUser = await this.userService.getById(userId);

    this.games.delete(userId);

    logger.info(
      user.username,
      "rolled player",
      values.join(", "),
      `net:${net}`,
    );

    return {
      ...result,
      net,
      balance: updatedUser?.money ?? 0,
      banned: gamblingBanned,
      tone: result.tone,
    };
  }

  async abort(userId: string): Promise<void> {
    this.games.delete(userId);
  }
}
