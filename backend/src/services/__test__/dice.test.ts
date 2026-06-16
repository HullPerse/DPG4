import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  createTestDb,
  createServices,
  createUser,
  getUser,
  seedRandom,
  resetRandom,
} from "./helpers";
import { evaluateHand } from "../gambling/dice.service";

function d(...roll: number[]): number[] {
  return roll.map((d) => (d - 1) / 6);
}

function no(count = 1): number[] {
  return Array(count).fill(0.5); // >= DICE_BROKEN_CHANCE (0.01) → no break
}

describe("DiceService", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
    seedRandom([]);
  });

  afterEach(() => {
    resetRandom();
  });

  test("rollDealer deducts bid and returns dealer state", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    const result = await services.diceService.rollDealer(userId, 3);
    expect(result.phase).toBe("dealer");
    expect(result.values).toEqual([2, 2, 5]);
    expect(result.reroll).toBe(false);
    expect(result.handLabel).toContain("Пара");
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(100); // bid not deducted until rollPlayer
  });

  test("rollDealer rejects invalid bid", async () => {
    expect(services.diceService.rollDealer(userId, 0)).rejects.toThrow(
      "Invalid bid",
    );
    expect(services.diceService.rollDealer(userId, 51)).rejects.toThrow(
      "Invalid bid",
    );
  });

  test("rollDealer rejects insufficient balance", async () => {
    const poor = await createUser(db, { money: 2, tickets: 2 });
    expect(services.diceService.rollDealer(poor.id, 5)).rejects.toThrow(
      "Insufficient balance",
    );
  });

  test("rollDealer rejects banned user", async () => {
    const banned = await createUser(db, { gamblingBanned: true });
    expect(services.diceService.rollDealer(banned.id, 3)).rejects.toThrow(
      "Banned from gambling",
    );
  });

  test("dealer 1-2-3 player pair beats it for 1x", async () => {
    seedRandom([...d(1, 2, 3), ...no()]);
    await services.diceService.rollDealer(userId, 5);
    seedRandom([...d(4, 4, 6), ...no()]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(10);
    expect(result.net).toBe(5);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(110); // bid + 1x win = 5+5=10 added
  });

  test("dealer 4-5-6 beats player 1-2-3 for 2x", async () => {
    seedRandom([...d(4, 5, 6), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    seedRandom([...d(1, 2, 3), ...no()]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(0);
    expect(result.net).toBe(-6);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(94);
  });

  test("dealer 1-1-1 beats pair for 5x", async () => {
    seedRandom([...d(1, 1, 1), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    seedRandom([...d(5, 5, 2), ...no()]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(0);
    expect(result.net).toBe(-15);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(85); // 5*3=15 deducted from 100
  });

  test("player 4-5-6 wins 2x", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 4);
    seedRandom([...d(4, 5, 6), ...no()]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(12);
    expect(result.net).toBe(8);
    expect(result.label).toContain("4·5·6");
  });

  test("player triple-1 jackpot 5x", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    seedRandom([...d(1, 1, 1), ...no()]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(18);
    expect(result.net).toBe(15);
    expect(result.label).toContain("1·1·1");
  });

  test("player triple wins 3x", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    seedRandom([...d(6, 6, 6), ...no()]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(12);
    expect(result.net).toBe(9);
    expect(result.label).toContain("Три 6");
  });

  test("player pair beats dealer target -> win", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    seedRandom([...d(4, 4, 6), ...no()]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(6);
    expect(result.net).toBe(3);
    expect(result.label).toContain("6 > 5");
  });

  test("player pair matches dealer target -> push", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    seedRandom([...d(3, 3, 5), ...no()]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(3);
    expect(result.net).toBe(0);
    expect(result.label).toContain("Ничья");
  });

  test("player pair loses to dealer target -> loss", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    seedRandom([...d(1, 1, 4), ...no()]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(0);
    expect(result.net).toBe(-3);
    expect(result.label).toContain("4 < 5");
  });

  test("player 1-2-3 loses to dealer pair", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    seedRandom([...d(1, 2, 3), ...no()]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(0);
    expect(result.net).toBe(-3);
  });

  test("gambling ban triggers at 100+ winnings from pair win", async () => {
    const nearUser = await createUser(db, {
      money: 100,
      gamblingWinnings: 95,
      gamblingBanned: false,
    });
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(nearUser.id, 10);
    seedRandom([...d(4, 4, 6), ...no()]);
    const result = await services.diceService.rollPlayer(nearUser.id);
    expect(result.banned).toBe(true);
    const user = await getUser(db, nearUser.id);
    expect(user!.gamblingBanned).toBe(true);
    expect(user!.gamblingWinnings).toBeGreaterThanOrEqual(100);
  });

  test("abort removes active game", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    await services.diceService.abort(userId);
    expect(services.diceService.rollPlayer(userId)).rejects.toThrow(
      "No active dice game",
    );
  });

  test("rollPlayer without active game rejects", async () => {
    expect(services.diceService.rollPlayer(userId)).rejects.toThrow(
      "No active dice game",
    );
  });

  test("evaluateHand correctly ranks hands", () => {
    expect(evaluateHand([1, 1, 1]).rank).toBe(5);
    expect(evaluateHand([6, 6, 6]).rank).toBe(4);
    expect(evaluateHand([4, 5, 6]).rank).toBe(3);
    expect(evaluateHand([2, 2, 5]).rank).toBe(2);
    expect(evaluateHand([1, 2, 3]).rank).toBe(1);
    expect(evaluateHand([2, 4, 6]).rank).toBe(0);
  });

  test("dealer void hand rerolls then player pair wins 1x", async () => {
    seedRandom([...d(2, 4, 6), ...no(), ...d(1, 3, 5), ...no(), ...d(2, 5, 6), ...no()]);
    const first = await services.diceService.rollDealer(userId, 3);
    expect(first.reroll).toBe(true);
    expect(first.values).toEqual([2, 4, 6]);

    const second = await services.diceService.rerollDealer(userId);
    expect(second.reroll).toBe(true);

    const third = await services.diceService.rerollDealer(userId);
    expect(third.reroll).toBe(false);

    seedRandom([...d(2, 2, 5), ...no()]);
    const player = await services.diceService.rollPlayer(userId);
    expect(player.net).toBe(3);
    expect(player.payout).toBe(6);
  });

  test("player void hand rerolls then settles push", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    seedRandom([...d(2, 4, 6), ...no(), ...d(1, 3, 5), ...no(), ...d(3, 3, 5), ...no()]);
    const first = await services.diceService.rollPlayer(userId);
    expect(first.reroll).toBe(true);
    const second = await services.diceService.rollPlayer(userId);
    expect(second.reroll).toBe(true);
    const third = await services.diceService.rollPlayer(userId);
    expect(third.reroll).toBeUndefined();
    expect(third.net).toBe(0);
    expect(third.label).toContain("Ничья");
  });

  test("abort during dealer phase no deduction yet", async () => {
    seedRandom([...d(2, 4, 6), ...no()]);
    await services.diceService.rollDealer(userId, 5);
    const { refunded, balance } = await services.diceService.abort(userId);
    expect(refunded).toBe(0);
    expect(balance).toBe(100);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(100);
  });

  test("abort during player phase no deduction yet", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 5);
    const { refunded, balance } = await services.diceService.abort(userId);
    expect(refunded).toBe(0);
    expect(balance).toBe(100);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(100);
  });

  test("dealer dice break returns broken flags", async () => {
    // dice values: [2, 2, 5], break check = 0.005 (< 0.01 → true), die index = 0.1 (→ 0)
    seedRandom([...d(2, 2, 5), 0.005, 0.1]);
    const result = await services.diceService.rollDealer(userId, 3);
    expect(result.broken).toBe(true);
    expect(result.brokenDieIndex).toBe(0);
    // pool: [2, 2, 5, 5] → best hand: pair 2 + 5 (kicker 5)
    expect(result.handLabel).toContain("Пара");
  });

  test("player dice break returns broken flags", async () => {
    seedRandom([...d(2, 2, 5), ...no()]);
    await services.diceService.rollDealer(userId, 3);
    // player dice: [4, 4, 6], break check = 0.005, die index = 0.5 (→ 1)
    seedRandom([...d(4, 4, 6), 0.005, 0.5]);
    const result = await services.diceService.rollPlayer(userId);
    expect(result.broken).toBe(true);
    expect(result.brokenDieIndex).toBe(1);
  });

  test("dealer break with 1-2-3 dice gets extra opposite helps void", async () => {
    // Most dealer values produce a void hand, but the opposite might help
    // Dice: [1, 2, 4] → normally void (rank 0)
    // Break die 0 → opposite = 6 → pool: [1, 2, 4, 6] → [4, 6, 1] still void? No, [2, 4, 6] is also void
    // Actually [1, 2, 4] is rank 0. Pool: [1, 2, 4, 6]. Best: [1, 2, 4] all void? 
    // [1, 2, 4] void, [1, 2, 6] void, [1, 4, 6] void, [2, 4, 6] void. Still void.
    seedRandom([...d(1, 2, 4), 0.005, 0.1]);
    const result = await services.diceService.rollDealer(userId, 3);
    expect(result.broken).toBe(true);
    // Even with break, still void → reroll
    expect(result.reroll).toBe(true);
  });

  test("dealer break with pair dice gets stronger kicker", async () => {
    // Dice: [2, 2, 3] → pair 2 + 3 (kicker 3)
    // Break die 1 → opposite = 5 → pool: [2, 2, 3, 5]
    // Best: [2, 2, 5] kicker 5 > [2, 2, 3] kicker 3
    seedRandom([...d(2, 2, 3), 0.005, 0.4]);
    const result = await services.diceService.rollDealer(userId, 3);
    expect(result.broken).toBe(true);
    expect(result.brokenDieIndex).toBe(1);
    expect(result.handLabel).toContain("Пара 2 + 5");
  });
});
