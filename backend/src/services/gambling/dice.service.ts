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
import { UserService } from "@/services/user.service";
import {
  GAMBLING_BAN_THRESHOLD,
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
} from "../../lib/gambling.constants";
import { deductTickets, addTickets } from "../../lib/ticket.helpers";

const MAX_VOID_REROLLS = 2;

function getRandomDice(): [number, number, number] {
  return [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
  ];
}

export type HandInfo = {
  rank: 5 | 4 | 3 | 2 | 1 | 0;
  mult: number;
  kicker?: number;
  label: string;
};

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

function compareHands(
  dealerValues: [number, number, number],
  playerValues: [number, number, number],
  bid: number,
): {
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
} {
  const dealer = evaluateHand(dealerValues);
  const player = evaluateHand(playerValues);

  if (dealer.rank > player.rank) {
    const mult = dealer.mult;
    return {
      payout: 0,
      net: -(mult * bid),
      label: `${dealer.label} - дилер победил`,
      tone: "lose",
    };
  }

  if (player.rank > dealer.rank) {
    const mult = player.mult;
    return {
      payout: bid + mult * bid,
      net: mult * bid,
      label: `${player.label} - ты победил`,
      tone: player.rank === 5 ? "jackpot" : "win",
    };
  }

  // Same rank — tiebreak
  if (dealer.rank === 4 && player.kicker !== dealer.kicker) {
    if (player.kicker! > dealer.kicker!) {
      return {
        payout: bid + 3 * bid,
        net: 3 * bid,
        label: `${player.label} > ${dealer.label} - ты победил`,
        tone: "win",
      };
    }
    return {
      payout: 0,
      net: -(3 * bid),
      label: `${player.label} < ${dealer.label} - дилер победил`,
      tone: "lose",
    };
  }

  if (dealer.rank === 2 && player.kicker !== dealer.kicker) {
    if (player.kicker! > dealer.kicker!) {
      return {
        payout: bid + bid,
        net: bid,
        label: `${player.kicker} > ${dealer.kicker} - ты победил`,
        tone: "win",
      };
    }
    return {
      payout: 0,
      net: -bid,
      label: `${player.kicker} < ${dealer.kicker} - дилер победил`,
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

  async rollDealer(userId: string, bid: number): Promise<DiceRollPhaseResult> {
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

    const game: ActiveDiceGame = {
      dealerValues: values,
      phase: "dealer",
      bid,
      userId,
      dealerRerolls: 0,
      playerRerolls: 0,
    };
    this.games.set(userId, game);

    const hand = evaluateHand(values);
    logger.info(user.username, "dealer rolled", values.join(", "));

    if (hand.rank === 0 && game.dealerRerolls < MAX_VOID_REROLLS) {
      game.dealerRerolls++;
      return {
        phase: "dealer",
        values,
        reroll: true,
        handLabel: "Нет комбинации - переброс",
      };
    }

    game.phase = "player";
    return {
      phase: "dealer",
      values,
      reroll: false,
      handLabel: hand.label,
    };
  }

  async rerollDealer(userId: string): Promise<DiceRollPhaseResult> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "dealer")
      throw new Error("No active dealer roll");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");

    const values = getRandomDice();
    game.dealerValues = values;

    const hand = evaluateHand(values);
    logger.info(user.username, "dealer reroll", values.join(", "));

    if (hand.rank === 0 && game.dealerRerolls < MAX_VOID_REROLLS) {
      game.dealerRerolls++;
      return {
        phase: "dealer",
        values,
        reroll: true,
        handLabel: "Нет комбинации - переброс",
      };
    }

    game.phase = "player";
    return {
      phase: "dealer",
      values,
      reroll: false,
      handLabel: hand.label,
    };
  }

  async rollPlayer(userId: string): Promise<DiceGameResult> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "player")
      throw new Error("No active dice game");

    const user = await this.userService.getById(userId);
    if (!user) throw new Error("User not found");

    const values = getRandomDice();
    const hand = evaluateHand(values);

    if (hand.rank === 0 && game.playerRerolls < MAX_VOID_REROLLS) {
      game.playerRerolls++;
      logger.info(user.username, "player reroll", values.join(", "));
      return {
        playerValues: values,
        payout: 0,
        net: 0,
        label: "Нет комбинации - переброс",
        tone: "reroll",
        balance: user.tickets,
        banned: false,
        reroll: true,
      };
    }

    this.games.delete(userId);

    const comparison = compareHands(game.dealerValues, values, game.bid);

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
      },
      created: nowIso(),
    });

    const net = comparison.net;
    let gamblingWinnings: number = user.gamblingWinnings ?? 0;
    let gamblingBanned: boolean = user.gamblingBanned ?? false;
    if (net > 0) {
      gamblingWinnings += net;
      if (gamblingWinnings >= GAMBLING_BAN_THRESHOLD && !gamblingBanned) {
        gamblingBanned = true;
      }
    }

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

    const updatedUser = await this.userService.getById(userId);

    logger.info(
      user.username,
      "rolled player",
      values.join(", "),
      `net:${net}`,
    );

    return {
      playerValues: values,
      payout: comparison.payout,
      net,
      label: comparison.label,
      tone: comparison.tone,
      balance: updatedUser?.tickets ?? 0,
      banned: gamblingBanned,
    };
  }

  async abort(userId: string): Promise<{ refunded: number; balance: number }> {
    const game = this.games.get(userId);
    this.games.delete(userId);
    const user = await this.userService.getById(userId);
    return { refunded: 0, balance: user?.tickets ?? 0 };
  }
}
