import { describe, expect, test, beforeEach } from "bun:test";
import {
  createTestDb,
  createServices,
  createUser,
  getUser,
  seedRandom,
  resetRandom,
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
    expect(user!.money).toBe(95);
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
    const poor = await createUser(db, { money: 2 });
    expect(services.minesService.start(poor.id, 5, 3)).rejects.toThrow(
      "Insufficient balance",
    );
  });

  test("start rejects banned user", async () => {
    const banned = await createUser(db, { gamblingBanned: true });
    expect(services.minesService.start(banned.id, 5, 3)).rejects.toThrow(
      "Banned from gambling",
    );
  });

  test("start rejects duplicate game", async () => {
    await services.minesService.start(userId, 5, 3);
    expect(services.minesService.start(userId, 5, 3)).rejects.toThrow(
      "Game already in progress",
    );
  });

  test("reveal safe tile increases multiplier", async () => {
    await services.minesService.start(userId, 10, 1);
    const state = await services.minesService.reveal(userId, 0, 0);
    if (state.isMine) {
      // hit a mine, game over
      expect(state.phase).toBe("lost");
    } else {
      expect(state.phase).toBe("playing");
      expect(state.currentMultiplier).toBeGreaterThan(1);
    }
  });

  test("reveal with no active game rejects", async () => {
    expect(services.minesService.reveal(userId, 0, 0)).rejects.toThrow(
      "No active game",
    );
  });

  test("cashout pays correct amount", async () => {
    await services.minesService.start(userId, 10, 1);
    // reveal safe tiles until we can cash out
    let phase = "playing";
    for (let r = 0; r < 5 && phase === "playing"; r++) {
      for (let c = 0; c < 5 && phase === "playing"; c++) {
        const reveal = await services.minesService.reveal(userId, r, c);
        phase = reveal.phase;
        if (phase === "lost") break;
        if (reveal.currentMultiplier > 1.05) {
          const cashout = await services.minesService.cashout(userId);
          expect(cashout.phase).toBe("won");
          expect(cashout.net).toBeGreaterThan(0);
          return;
        }
      }
    }
  });

  test("cashout without active game rejects", async () => {
    expect(services.minesService.cashout(userId)).rejects.toThrow(
      "No active game",
    );
  });

  test("abort removes active game", async () => {
    await services.minesService.start(userId, 5, 3);
    services.minesService.abort(userId);
    expect(services.minesService.reveal(userId, 0, 0)).rejects.toThrow(
      "No active game",
    );
  });

  test("game over on mine hit", async () => {
    // with max mines (10), we're very likely to hit one
    await services.minesService.start(userId, 5, 10);
    let hitMine = false;
    for (let r = 0; r < 5 && !hitMine; r++) {
      for (let c = 0; c < 5 && !hitMine; c++) {
        const state = await services.minesService.reveal(userId, r, c);
        if (state.isMine) {
          expect(state.phase).toBe("lost");
          expect(state.net).toBe(-5);
          hitMine = true;
        }
      }
    }
    expect(hitMine).toBe(true);
  });
});
