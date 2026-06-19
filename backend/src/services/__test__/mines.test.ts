import { describe, expect, test, beforeEach } from "bun:test";
import {
  createTestDb,
  createServices,
  createUser,
  getUser,
} from "./helpers";

describe("MinesService", () => {
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

  test("start deducts bid and returns initial state", async () => {
    const state = await services.minesService.start(userId, 5, 3);
    expect(state.phase).toBe("playing");
    expect(state.currentMultiplier).toBe(1);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(95);
  });

  test("start rejects invalid bid", async () => {
    expect(services.minesService.start(userId, 0, 3)).rejects.toThrow(
      "Invalid bid",
    );
    expect(services.minesService.start(userId, 51, 3)).rejects.toThrow(
      "Invalid bid",
    );
  });

  test("start rejects invalid mine count", async () => {
    expect(services.minesService.start(userId, 5, 0)).rejects.toThrow(
      "Invalid mine count",
    );
    expect(services.minesService.start(userId, 5, 11)).rejects.toThrow(
      "Invalid mine count",
    );
  });

  test("start rejects insufficient balance", async () => {
    const poor = await createUser(db, { tickets: 2 });
    expect(services.minesService.start(poor.id, 5, 3)).rejects.toThrow(
      "Insufficient balance",
    );
  });

  test("start rejects banned user", async () => {
    const banned = await createUser(db, { gamblingBanned: true });
    expect(services.minesService.start(banned.id, 3, 1)).rejects.toThrow(
      "Banned from gambling",
    );
  });

  test("start rejects duplicate game", async () => {
    await services.minesService.start(userId, 3, 1);
    expect(services.minesService.start(userId, 3, 1)).rejects.toThrow(
      "Game already in progress",
    );
  });

  test("reveal safe tile returns playing state", async () => {
    await services.minesService.start(userId, 5, 1);
    const state = await services.minesService.reveal(userId, 0, 0);
    expect(state.phase).toBe("playing");
    expect(state.isMine).toBe(false);
    expect(state.currentMultiplier).toBeGreaterThan(1);
  });

  test("reveal without active game rejects", async () => {
    expect(services.minesService.reveal(userId, 0, 0)).rejects.toThrow(
      "No active game",
    );
  });

  test("reveal out of bounds rejects", async () => {
    await services.minesService.start(userId, 3, 1);
    expect(services.minesService.reveal(userId, -1, 0)).rejects.toThrow(
      "Invalid tile",
    );
    expect(services.minesService.reveal(userId, 0, 5)).rejects.toThrow(
      "Invalid tile",
    );
  });

  test("reveal already revealed tile rejects", async () => {
    await services.minesService.start(userId, 3, 1, true, { devForceAllSafe: true });
    await services.minesService.reveal(userId, 0, 0, true);
    expect(services.minesService.reveal(userId, 0, 0, true)).rejects.toThrow(
      "Tile already revealed",
    );
  });

  test("cashout gives payout and ends game", async () => {
    await services.minesService.start(userId, 5, 3);
    await services.minesService.reveal(userId, 0, 0);
    const state = await services.minesService.cashout(userId);
    expect(state.phase).toBe("won");
    expect(state.payout).toBeGreaterThanOrEqual(5);
    expect(state.net).toBe(state.payout - 5);
  });

  test("cashout credits payout to balance", async () => {
    await services.minesService.start(userId, 5, 3);
    await services.minesService.reveal(userId, 0, 0);
    const state = await services.minesService.cashout(userId);
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(95 + state.payout);
  });

  test("cashout without active game rejects", async () => {
    expect(services.minesService.cashout(userId)).rejects.toThrow(
      "No active game",
    );
  });

  test("abort removes active game", async () => {
    await services.minesService.start(userId, 3, 1);
    services.minesService.abort(userId);
    expect(services.minesService.reveal(userId, 0, 0)).rejects.toThrow(
      "No active game",
    );
  });
});
