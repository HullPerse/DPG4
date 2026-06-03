import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  createTestDb,
  createServices,
  createUser,
  getUser,
  seedRandom,
  resetRandom,
} from "./helpers";

const realDateNow = Date.now;
let fakeNow = 1000000;

describe("RocketService", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
    fakeNow = 1000000;
    Date.now = () => fakeNow;
    seedRandom([]);
  });

  afterEach(() => {
    Date.now = realDateNow;
    resetRandom();
  });

  test("launch creates game without deducting bid", async () => {
    seedRandom([0.5]);
    const state = await services.rocketService.launch(userId, 3);
    expect(state.phase).toBe("launching");
    expect(state.bid).toBe(3);
    expect(state.crashPoint).toBeGreaterThanOrEqual(1);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(100);
  });

  test("launch rejects invalid bid", async () => {
    expect(services.rocketService.launch(userId, 0)).rejects.toThrow(
      "Invalid bid",
    );
    expect(services.rocketService.launch(userId, 11)).rejects.toThrow(
      "Invalid bid",
    );
  });

  test("launch rejects banned user", async () => {
    const banned = await createUser(db, { gamblingBanned: true });
    expect(services.rocketService.launch(banned.id, 3)).rejects.toThrow(
      "Banned from gambling",
    );
  });

  test("launch rejects duplicate game", async () => {
    seedRandom([0.5]);
    await services.rocketService.launch(userId, 3);
    expect(services.rocketService.launch(userId, 3)).rejects.toThrow(
      "Game already in progress",
    );
  });

  test("poll returns flying state before crash", async () => {
    seedRandom([0.5]);
    await services.rocketService.launch(userId, 3);
    fakeNow += 100;
    const state = await services.rocketService.poll(userId);
    expect(state.phase).toBe("flying");
    expect(state.multiplier).toBeGreaterThanOrEqual(1);
  });

  test("poll triggers crash when multiplier reaches crash point", async () => {
    seedRandom([0.0]);
    const launchState = await services.rocketService.launch(userId, 3);
    fakeNow += 50000;
    const state = await services.rocketService.poll(userId);
    expect(state.phase).toBe("crashed");
    expect(state.net).toBe(-3);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(97);
  });

  test("cashout succeeds when multiplier below crash point", async () => {
    seedRandom([0.5]);
    await services.rocketService.launch(userId, 3);
    fakeNow += 100;
    const state = await services.rocketService.cashout(userId);
    expect(state.phase).toBe("cashed");
    expect(state.multiplier).toBeGreaterThanOrEqual(1);
  });

  test("cashout gives positive net with enough time", async () => {
    seedRandom([0.5]);
    await services.rocketService.launch(userId, 3);
    fakeNow += 3000;
    const state = await services.rocketService.cashout(userId);
    expect(state.phase).toBe("cashed");
    expect(state.net).toBeGreaterThan(0);
    const expectedPayout = Math.floor(3 * state.multiplier);
    expect(state.net).toBe(expectedPayout - 3);
  });

  test("cashout deducts bid then credits payout", async () => {
    seedRandom([0.5]);
    await services.rocketService.launch(userId, 3);
    fakeNow += 3000;
    const state = await services.rocketService.cashout(userId);
    const net = state.net;
    const user = await getUser(db, userId);
    expect(user!.money).toBe(100 + net);
  });

  test("cashout triggers crash when multiplier >= crash point", async () => {
    seedRandom([0.0]);
    await services.rocketService.launch(userId, 3);
    fakeNow += 5000;
    const state = await services.rocketService.cashout(userId);
    expect(state.phase).toBe("crashed");
    expect(state.net).toBe(-3);
  });

  test("cashout without active game rejects", async () => {
    expect(services.rocketService.cashout(userId)).rejects.toThrow(
      "No active game",
    );
  });

  test("abandon cleans up active and ended games", async () => {
    seedRandom([0.5]);
    await services.rocketService.launch(userId, 3);
    fakeNow += 100;
    await services.rocketService.cashout(userId);
    services.rocketService.abandon(userId);
    const idle = await services.rocketService.poll(userId);
    expect(idle.phase).toBe("idle");
  });

  test("dismiss clears last ended game", async () => {
    seedRandom([0.5]);
    await services.rocketService.launch(userId, 3);
    fakeNow += 100;
    await services.rocketService.cashout(userId);
    services.rocketService.dismiss(userId);
    const idle = await services.rocketService.poll(userId);
    expect(idle.phase).toBe("idle");
  });

  test("getHistory returns tracked crashes", async () => {
    seedRandom([0.02]);
    await services.rocketService.launch(userId, 3);
    fakeNow += 100000;
    await services.rocketService.poll(userId);
    const history = services.rocketService.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].crashPoint).toBeGreaterThanOrEqual(1);
  });

  test("poll without active game returns idle or last ended", async () => {
    const idle = await services.rocketService.poll(userId);
    expect(idle.phase).toBe("idle");
  });

  test("gambling ban triggers on cashout with big winnings", async () => {
    const winUser = await createUser(db, {
      money: 100,
      gamblingWinnings: 25,
      gamblingBanned: false,
    });
    seedRandom([0.5]);
    await services.rocketService.launch(winUser.id, 5);
    fakeNow += 5000;
    const state = await services.rocketService.cashout(winUser.id);
    if (state.net > 0) {
      expect(state.banned).toBe(true);
      const user = await getUser(db, winUser.id);
      expect(user!.gamblingBanned).toBe(true);
    }
  });
});
