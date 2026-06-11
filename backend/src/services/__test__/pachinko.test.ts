import { describe, expect, test, beforeEach } from "bun:test";
import {
  createTestDb,
  createServices,
  createUser,
  getUser,
} from "./helpers";

describe("PachinkoService", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
  });

  test("drop deducts bid and returns dropping state", async () => {
    const state = await services.pachinkoService.drop(userId, 5);
    expect(state.phase).toBe("dropping");
    expect(state.bid).toBe(5);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(95);
  });

  test("drop with ratAmount deducts total", async () => {
    const state = await services.pachinkoService.drop(userId, 5, 3);
    expect(state.phase).toBe("dropping");
    expect(state.bid).toBe(15);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(85);
  });

  test("drop rejects invalid ratAmount", async () => {
    expect(services.pachinkoService.drop(userId, 5, 0)).rejects.toThrow(
      "Invalid rat amount",
    );
    expect(services.pachinkoService.drop(userId, 5, 6)).rejects.toThrow(
      "Invalid rat amount",
    );
  });

  test("drop rejects invalid bid", async () => {
    expect(services.pachinkoService.drop(userId, 0)).rejects.toThrow(
      "Invalid bid",
    );
    expect(services.pachinkoService.drop(userId, 51)).rejects.toThrow(
      "Invalid bid",
    );
  });

  test("drop rejects insufficient balance", async () => {
    const poor = await createUser(db, { money: 2 });
    expect(services.pachinkoService.drop(poor.id, 5)).rejects.toThrow(
      "Insufficient balance",
    );
  });

  test("drop with ratAmount rejects insufficient balance", async () => {
    const poor = await createUser(db, { money: 10 });
    expect(services.pachinkoService.drop(poor.id, 5, 3)).rejects.toThrow(
      "Insufficient balance",
    );
  });

  test("drop rejects banned user", async () => {
    const banned = await createUser(db, { gamblingBanned: true });
    expect(services.pachinkoService.drop(banned.id, 3)).rejects.toThrow(
      "Banned from gambling",
    );
  });

  test("drop rejects when already active", async () => {
    await services.pachinkoService.drop(userId, 3);
    expect(services.pachinkoService.drop(userId, 3)).rejects.toThrow(
      "Drop already in progress",
    );
  });

  test("settle slot 0 (5x) pays 5x bid", async () => {
    await services.pachinkoService.drop(userId, 3);
    const state = await services.pachinkoService.settle(userId, [0]);
    expect(state.phase).toBe("done");
    expect(state.payout).toBe(15);
    expect(state.net).toBe(12);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(112);
  });

  test("settle slot 6 (0.5x) loses money", async () => {
    await services.pachinkoService.drop(userId, 10);
    const state = await services.pachinkoService.settle(userId, [6]);
    expect(state.payout).toBe(5);
    expect(state.net).toBe(-5);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(95);
  });

  test("settle slot 12 (5x) pays 5x bid", async () => {
    await services.pachinkoService.drop(userId, 4);
    const state = await services.pachinkoService.settle(userId, [12]);
    expect(state.payout).toBe(20);
    expect(state.net).toBe(16);
  });

  test("settle slot 4 (1x) returns bid", async () => {
    await services.pachinkoService.drop(userId, 5);
    const state = await services.pachinkoService.settle(userId, [4]);
    expect(state.payout).toBe(5);
    expect(state.net).toBe(0);
  });

  test("settle all slots produce correct payouts", async () => {
    const multipliers = [5, 3, 2, 1.5, 1, 0.5, 0.5, 0.5, 1, 1.5, 2, 3, 5];
    for (let slot = 0; slot < multipliers.length; slot++) {
      const u = await createUser(db, { money: 100 });
      await services.pachinkoService.drop(u.id, 10);
      const state = await services.pachinkoService.settle(u.id, [slot]);
      expect(state.payout).toBe(Math.floor(10 * multipliers[slot]));
    }
  });

  test("multi-rat settle sums across slots", async () => {
    await services.pachinkoService.drop(userId, 3, 3);
    const state = await services.pachinkoService.settle(userId, [0, 6, 12]);
    // slot 0: floor(3*5) = 15, slot 6: floor(3*0.5) = 1, slot 12: floor(3*5) = 15
    // totalPayout = 15 + 1 + 15 = 31
    // totalCost = 3 * 3 = 9
    // net = 31 - 9 = 22
    expect(state.phase).toBe("done");
    expect(state.bid).toBe(9);
    expect(state.payout).toBe(31);
    expect(state.net).toBe(22);
    // money: 100 - 9 + 31 = 122
    const user = await getUser(db, userId);
    expect(user!.money).toBe(122);
  });

  test("multi-rat settle all bad slots loses money", async () => {
    const u = await createUser(db, { money: 100 });
    await services.pachinkoService.drop(u.id, 5, 2);
    const state = await services.pachinkoService.settle(u.id, [5, 7]);
    // slot 5: floor(5*0.5) = 2, slot 7: floor(5*0.5) = 2
    // totalPayout = 4, totalCost = 10, net = -6
    expect(state.payout).toBe(4);
    expect(state.net).toBe(-6);
  });

  test("settle with wrong number of indexes rejects", async () => {
    await services.pachinkoService.drop(userId, 3, 2);
    expect(services.pachinkoService.settle(userId, [0])).rejects.toThrow(
      "Invalid slot indexes",
    );
    expect(services.pachinkoService.settle(userId, [0, 1, 2])).rejects.toThrow(
      "Invalid slot indexes",
    );
  });

  test("settle without active drop rejects", async () => {
    expect(services.pachinkoService.settle(userId, [0])).rejects.toThrow(
      "No active drop",
    );
  });

  test("settle invalid slot rejects", async () => {
    await services.pachinkoService.drop(userId, 3);
    expect(services.pachinkoService.settle(userId, [-1])).rejects.toThrow(
      "Invalid slot",
    );
    expect(services.pachinkoService.settle(userId, [99])).rejects.toThrow(
      "Invalid slot",
    );
  });

  test("abandon clears active drop", async () => {
    await services.pachinkoService.drop(userId, 3);
    services.pachinkoService.abandon(userId);
    expect(services.pachinkoService.settle(userId, [0])).rejects.toThrow(
      "No active drop",
    );
  });

  test("sync returns idle when no active game", async () => {
    const state = await services.pachinkoService.sync(userId);
    expect(state.phase).toBe("idle");
  });

  test("sync returns dropping state when game active", async () => {
    await services.pachinkoService.drop(userId, 5);
    const state = await services.pachinkoService.sync(userId);
    expect(state.phase).toBe("dropping");
    expect(state.bid).toBe(5);
  });

  test("sync returns dropping state with ratAmount", async () => {
    await services.pachinkoService.drop(userId, 3, 4);
    const state = await services.pachinkoService.sync(userId);
    expect(state.phase).toBe("dropping");
    expect(state.bid).toBe(12);
  });

  test("gambling ban triggers on big win", async () => {
    const nearBan = await createUser(db, {
      money: 100,
      gamblingWinnings: 95,
      gamblingBanned: false,
    });
    await services.pachinkoService.drop(nearBan.id, 10);
    const state = await services.pachinkoService.settle(nearBan.id, [0]);
    expect(state.payout).toBe(50);
    expect(state.net).toBe(40);
    expect(state.banned).toBe(true);
    const user = await getUser(db, nearBan.id);
    expect(user!.gamblingBanned).toBe(true);
    expect(user!.gamblingWinnings).toBe(95 + 40);
  });
});
