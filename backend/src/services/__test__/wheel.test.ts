import { describe, expect, test, beforeEach } from "bun:test";
import {
  createTestDb,
  createServices,
  createUser,
  getUser,
} from "./helpers";

describe("WheelService", () => {
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

  test("spin deducts bid and returns result", async () => {
    const result = await services.wheelService.spin(userId, 5);
    expect(result.segment).toBeGreaterThanOrEqual(0);
    expect(result.segment).toBeLessThan(12);
    expect(result.multiplier).toBeGreaterThan(0);
    expect(result.payout).toBe(Math.floor(5 * result.multiplier));
    expect(result.net).toBe(result.payout - 5);
    const user = await getUser(db, userId);
    expect(user!.money).toBe(100 + result.net);
  });

  test("spin rejects invalid bid", async () => {
    expect(services.wheelService.spin(userId, 0)).rejects.toThrow("Invalid bid");
    expect(services.wheelService.spin(userId, 51)).rejects.toThrow("Invalid bid");
  });

  test("spin rejects insufficient balance", async () => {
    const poor = await createUser(db, { money: 2 });
    expect(services.wheelService.spin(poor.id, 5)).rejects.toThrow(
      "Insufficient balance",
    );
  });

  test("spin rejects banned user", async () => {
    const banned = await createUser(db, { gamblingBanned: true });
    expect(services.wheelService.spin(banned.id, 5)).rejects.toThrow(
      "Banned from gambling",
    );
  });

  test("spin credits money on win", async () => {
    // spin enough times to hopefully get a win
    let result = await services.wheelService.spin(userId, 10);
    if (result.net > 0) {
      const user = await getUser(db, userId);
      expect(user!.money).toBe(100 + result.net);
    }
  });

  test("spin records history", async () => {
    await services.wheelService.spin(userId, 5);
    const { eq } = await import("drizzle-orm");
    const schema = await import("../../db/schema");
    const [record] = await db
      .select()
      .from(schema.history)
      .where(eq(schema.history.userId, userId))
      .limit(1);
    expect(record).toBeDefined();
    expect(record.type).toBe("wheel");
    expect(record.bid).toBe(5);
  });
});
