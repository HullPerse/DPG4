import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  createTestDb,
  createServices,
  createUser,
  getUser,
  seedRandom,
  resetRandom,
} from "./helpers";
import { isVoidHand } from "../gambling/dice.service";

function d(...roll: number[]): number[] {
  return roll.map((d) => (d - 1) / 6);
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
    seedRandom(d(2, 2, 5));
    const result = await services.diceService.rollDealer(userId, 3);
    expect(result.phase).toBe("dealer");
    expect(result.values).toEqual([2, 2, 5]);
    expect(result.target).toBe(5);
    expect(result.autoResult).toBeNull();
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(97);
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

  test("dealer 1-2-3 auto lose -> player wins bid", async () => {
    seedRandom(d(1, 2, 3));
    await services.diceService.rollDealer(userId, 5);
    seedRandom(d(1, 2, 3));
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(10);
    expect(result.net).toBe(5);
    expect(result.label).toContain("1·2·3");
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(105);
  });

  test("dealer 4-5-6 auto win -> player loses bid", async () => {
    seedRandom(d(4, 5, 6));
    await services.diceService.rollDealer(userId, 3);
    seedRandom(d(1, 2, 3));
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(0);
    expect(result.net).toBe(-3);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(97);
  });

  test("dealer 1-1-1 auto win -> player loses bid", async () => {
    seedRandom(d(1, 1, 1));
    await services.diceService.rollDealer(userId, 3);
    seedRandom(d(5, 5, 2));
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(0);
    expect(result.net).toBe(-3);
    expect(result.label).toContain("автоматически");
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(97);
  });

  test("player 4-5-6 wins 2x", async () => {
    seedRandom(d(2, 2, 5));
    await services.diceService.rollDealer(userId, 4);
    seedRandom(d(4, 5, 6));
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(12);
    expect(result.net).toBe(8);
    expect(result.label).toContain("4·5·6");
  });

  test("player triple-1 jackpot 3x", async () => {
    seedRandom(d(2, 2, 5));
    await services.diceService.rollDealer(userId, 3);
    seedRandom(d(1, 1, 1));
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(12);
    expect(result.net).toBe(9);
    expect(result.label).toContain("Три единицы");
  });

  test("player triple wins 2x", async () => {
    seedRandom(d(2, 2, 5));
    await services.diceService.rollDealer(userId, 3);
    seedRandom(d(6, 6, 6));
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(9);
    expect(result.net).toBe(6);
    expect(result.label).toContain("Три 6");
  });

  test("player pair beats dealer target -> win", async () => {
    seedRandom(d(2, 2, 5));
    await services.diceService.rollDealer(userId, 3);
    seedRandom(d(4, 4, 6));
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(6);
    expect(result.net).toBe(3);
    expect(result.label).toContain("6 > 5");
  });

  test("player pair matches dealer target -> push", async () => {
    seedRandom(d(2, 2, 5));
    await services.diceService.rollDealer(userId, 3);
    seedRandom(d(3, 3, 5));
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(3);
    expect(result.net).toBe(0);
    expect(result.label).toContain("5 = 5");
  });

  test("player pair loses to dealer target -> loss", async () => {
    seedRandom(d(2, 2, 5));
    await services.diceService.rollDealer(userId, 3);
    seedRandom(d(1, 1, 4));
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(0);
    expect(result.net).toBe(-3);
    expect(result.label).toContain("4 < 5");
  });

  test("player 1-2-3 loses", async () => {
    seedRandom(d(2, 2, 5));
    await services.diceService.rollDealer(userId, 3);
    seedRandom(d(1, 2, 3));
    const result = await services.diceService.rollPlayer(userId);
    expect(result.payout).toBe(0);
    expect(result.net).toBe(-3);
  });

  test("gambling ban triggers at 100+ winnings", async () => {
    const nearUser = await createUser(db, {
      money: 100,
      gamblingWinnings: 95,
      gamblingBanned: false,
    });
    seedRandom(d(2, 2, 5));
    await services.diceService.rollDealer(nearUser.id, 10);
    seedRandom(d(4, 4, 6));
    const result = await services.diceService.rollPlayer(nearUser.id);
    expect(result.banned).toBe(true);
    const user = await getUser(db, nearUser.id);
    expect(user!.gamblingBanned).toBe(true);
    expect(user!.gamblingWinnings).toBeGreaterThanOrEqual(100);
  });

  test("abort removes active game", async () => {
    seedRandom(d(2, 2, 5));
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

  test("isVoidHand detects unplayable triples", () => {
    expect(isVoidHand([2, 4, 6])).toBe(true);
    expect(isVoidHand([1, 2, 3])).toBe(false);
    expect(isVoidHand([4, 5, 6])).toBe(false);
    expect(isVoidHand([2, 2, 5])).toBe(false);
  });

  test("dealer void hand rerolls up to 3 rolls then push", async () => {
    seedRandom([...d(2, 4, 6), ...d(1, 3, 5), ...d(2, 5, 6)]);
    const first = await services.diceService.rollDealer(userId, 3);
    expect(first.reroll).toBe(true);
    expect(first.values).toEqual([2, 4, 6]);

    const second = await services.diceService.rerollDealer(userId);
    expect(second.reroll).toBe(true);

    const third = await services.diceService.rerollDealer(userId);
    expect(third.reroll).toBe(false);
    expect(third.autoResult).toBe("push");

    seedRandom(d(2, 2, 5));
    const player = await services.diceService.rollPlayer(userId);
    expect(player.net).toBe(0);
    expect(player.payout).toBe(3);
  });

  test("player void hand rerolls then settles push", async () => {
    seedRandom(d(2, 2, 5));
    await services.diceService.rollDealer(userId, 3);
    seedRandom([...d(2, 4, 6), ...d(1, 3, 5), ...d(3, 3, 5)]);
    const first = await services.diceService.rollPlayer(userId);
    expect(first.reroll).toBe(true);
    const second = await services.diceService.rollPlayer(userId);
    expect(second.reroll).toBe(true);
    const third = await services.diceService.rollPlayer(userId);
    expect(third.reroll).toBeUndefined();
    expect(third.net).toBe(0);
    expect(third.label).toContain("5 = 5");
  });

  test("abort during dealer phase refunds bid", async () => {
    seedRandom(d(2, 4, 6));
    await services.diceService.rollDealer(userId, 5);
    const { refunded, balance } = await services.diceService.abort(userId);
    expect(refunded).toBe(5);
    expect(balance).toBe(100);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(100);
  });

  test("abort during player phase refunds bid", async () => {
    seedRandom(d(2, 2, 5));
    await services.diceService.rollDealer(userId, 5);
    const { refunded, balance } = await services.diceService.abort(userId);
    expect(refunded).toBe(5);
    expect(balance).toBe(100);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(100);
  });
});
