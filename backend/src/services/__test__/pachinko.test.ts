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
    expect(user!.tickets).toBe(95);
  });

  test("drop with ratAmount deducts total", async () => {
    const state = await services.pachinkoService.drop(userId, 5, 3);
    expect(state.phase).toBe("dropping");
    expect(state.bid).toBe(15);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(85);
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
    const poor = await createUser(db, { tickets: 2 });
    expect(services.pachinkoService.drop(poor.id, 5)).rejects.toThrow(
      "Insufficient balance",
    );
  });

  test("drop rejects banned user", async () => {
    const banned = await createUser(db, { gamblingBanned: true });
    expect(services.pachinkoService.drop(banned.id, 3)).rejects.toThrow(
      "Banned from gambling",
    );
  });

  test("drop rejects duplicate game", async () => {
    await services.pachinkoService.drop(userId, 3);
    expect(services.pachinkoService.drop(userId, 3)).rejects.toThrow(
      "Drop already in progress",
    );
  });

  test("settle with slot index gives payout", async () => {
    await services.pachinkoService.drop(userId, 5, 1);
    const state = await services.pachinkoService.settle(userId, [3]);
    expect(state.phase).toBe("done");
    expect(state.payout).toBeGreaterThanOrEqual(0);
    expect(state.net).toBe(state.payout - 5);
  });

  test("settle with multiple rats sums payouts", async () => {
    await services.pachinkoService.drop(userId, 5, 3);
    const state = await services.pachinkoService.settle(userId, [0, 3, 5]);
    expect(state.phase).toBe("done");
    expect(state.payout).toBeGreaterThanOrEqual(0);
    const expectedPayout = Math.floor(5 * 5) + Math.floor(5 * 1.5) + Math.floor(5 * 0.5);
    expect(state.payout).toBe(expectedPayout);
    expect(state.net).toBe(expectedPayout - 15);
  });

  test("settle credits tickets on win", async () => {
    await services.pachinkoService.drop(userId, 5, 1);
    const state = await services.pachinkoService.settle(userId, [3]);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(95 + state.payout);
  });

  test("settle without active drop rejects", async () => {
    expect(services.pachinkoService.settle(userId, [0])).rejects.toThrow(
      "No active drop",
    );
  });

  test("settle with invalid slot index rejects", async () => {
    await services.pachinkoService.drop(userId, 5, 1);
    expect(services.pachinkoService.settle(userId, [999])).rejects.toThrow(
      "Invalid slot",
    );
  });

  test("abandon clears active drop", async () => {
    await services.pachinkoService.drop(userId, 5, 1);
    services.pachinkoService.abandon(userId);
    expect(services.pachinkoService.settle(userId, [0])).rejects.toThrow(
      "No active drop",
    );
  });

  test("sync returns idle when no active drop", async () => {
    const state = await services.pachinkoService.sync(userId);
    expect(state.phase).toBe("idle");
  });

  test("sync returns dropping for active drop", async () => {
    await services.pachinkoService.drop(userId, 5, 2);
    const state = await services.pachinkoService.sync(userId);
    expect(state.phase).toBe("dropping");
    expect(state.bid).toBe(10);
  });
});
