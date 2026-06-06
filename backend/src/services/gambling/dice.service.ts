import { eq } from "drizzle-orm";
import * as schema from "../../db/schema";
import { logger } from "../../lib/logger";
import { nowIso } from "../../lib/dates";
import { newId } from "../../lib/ids";
import {
  ActiveDiceGame,
  DiceGameResult,
  DiceRollPhaseResult,
} from "@/types/gambling";
import { Db } from "@/types";
import { UserService } from "../user.service";
import {
  GAMBLING_BAN_THRESHOLD,
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
} from "../../lib/gambling.constants";

const MAX_VOID_REROLLS = 2;

function getRandomDice(): [number, number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

/** Three unique faces that are not 1·2·3 or 4·5·6 - no playable hand */
export function isVoidHand(values: [number, number, number]): boolean {
  const sorted = [...values].sort((a, b) => a - b);
  const [a, b, c] = sorted;
  if (new Set(values).size !== 3) return false;
  if (a === 1 && b === 2 && c === 3) return false;
  if (a === 4 && b === 5 && c === 6) return false;
  return true;
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
      net: -bid,
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
      label: "Ничья - ставка возвращена",
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
    const net = bid * 2;
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

  return {
    playerValues: values,
    payout: bid,
    net: 0,
    label: "Ничего - ничья",
    tone: "reroll",
    balance: 0,
    banned: false,
    reroll: true,
  };
}

function finalizeDealerPhase(
  game: ActiveDiceGame,
  values: [number, number, number],
): DiceRollPhaseResult {
  const resolved = resolveDealerRoll(values);
  game.dealerValues = values;
  game.dealerTarget = resolved.target;
  game.autoResult = resolved.autoResult;
  game.phase = "player";

  return {
    phase: "dealer",
    values,
    target: resolved.target,
    autoResult: resolved.autoResult,
    reroll: false,
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

  async rollDealer(userId: string, bid: number): Promise<DiceRollPhaseResult> {
    if (
      bid < GAMBLING_MIN_BET ||
      bid > GAMBLING_MAX_BET ||
      !Number.isInteger(bid)
    )
      throw new Error("Invalid bid");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");
    if (user.money < bid) throw new Error("Insufficient balance");
    if (user.gamblingBanned) throw new Error("Banned from gambling");

    const values = getRandomDice();

    await this.userService.score(userId, -bid);

    const game: ActiveDiceGame = {
      dealerValues: values,
      dealerTarget: null,
      phase: "dealer",
      bid,
      userId,
      autoResult: null,
      dealerRerolls: 0,
      playerRerolls: 0,
    };
    this.games.set(userId, game);

    logger.info(user.username, "dealer rolled", values.join(", "));

    if (isVoidHand(values) && game.dealerRerolls < MAX_VOID_REROLLS) {
      game.dealerRerolls++;
      game.dealerValues = values;
      return {
        phase: "dealer",
        values,
        target: null,
        autoResult: null,
        reroll: true,
        label: "У дилера нет комбинации - переброс",
      };
    }

    return finalizeDealerPhase(game, values);
  }

  async rerollDealer(userId: string): Promise<DiceRollPhaseResult> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "dealer")
      throw new Error("No active dealer roll");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");

    const values = getRandomDice();
    game.dealerValues = values;

    logger.info(user.username, "dealer reroll", values.join(", "));

    if (isVoidHand(values) && game.dealerRerolls < MAX_VOID_REROLLS) {
      game.dealerRerolls++;
      return {
        phase: "dealer",
        values,
        target: null,
        autoResult: null,
        reroll: true,
        label: "У дилера нет комбинации - переброс",
      };
    }

    return finalizeDealerPhase(game, values);
  }

  async rollPlayer(userId: string): Promise<DiceGameResult> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "player")
      throw new Error("No active dice game");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");

    const values = getRandomDice();

    const result = resolvePlayerResult(
      values,
      game.dealerTarget,
      game.autoResult,
      game.bid,
    );

    if (result.tone === "reroll" && game.playerRerolls < MAX_VOID_REROLLS) {
      game.playerRerolls++;
      logger.info(user.username, "player reroll", values.join(", "));
      return {
        ...result,
        balance: user.money,
        reroll: true,
        label: "Нет комбинации - переброс",
      };
    }

    this.games.delete(userId);

    await this.db.insert(schema.history).values({
      id: newId(),
      userId,
      owner: { id: user.id, username: user.username },
      type: "dice",
      label: result.label,
      image: "",
      bid: game.bid,
      payout: result.payout,
      net: result.net,
      data: {
        dealerValues: game.dealerValues,
        dealerTarget: game.dealerTarget,
        playerValues: values,
        autoResult: game.autoResult,
        dealerRerolls: game.dealerRerolls,
        playerRerolls: game.playerRerolls,
      },
      created: nowIso(),
    });

    const net = result.net;

    let gamblingWinnings: number = user.gamblingWinnings ?? 0;
    let gamblingBanned: boolean = user.gamblingBanned ?? false;

    if (result.payout > game.bid) {
      const profit = result.payout - game.bid;
      gamblingWinnings += profit;
      if (gamblingWinnings >= GAMBLING_BAN_THRESHOLD && !gamblingBanned) {
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
      tone: result.tone === "reroll" ? "chance" : result.tone,
    };
  }

  async abort(userId: string): Promise<void> {
    const game = this.games.get(userId);
    if (!game) return;

    const user = await this.userService.getById(userId);
    if (user && game.phase === "dealer") {
      await this.userService.score(userId, game.bid);
    }

    this.games.delete(userId);
  }
}
