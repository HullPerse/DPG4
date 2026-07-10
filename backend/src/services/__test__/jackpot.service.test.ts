import { describe, expect, test, beforeEach } from "bun:test";
import { eq } from "drizzle-orm";
import {
  createTestDb,
  createServices,
  createUser,
} from "./helpers";
import * as schema from "@/db/schema.db";
import { newId } from "@/lib/index.utils";

describe("JackpotService", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100, tickets: 100 });
    userId = user.id;
  });

  test("getStatus returns default when jackpot does not exist", async () => {
    const status = await services.jackpotService.getStatus();
    expect(status.pool).toBe(0);
    expect(status.lastWinnerId).toBeNull();
  });

  test("addToPool creates jackpot row on first call", async () => {
    await services.jackpotService.addToPool(100);
    const status = await services.jackpotService.getStatus();
    const expectedContribution = Math.floor(100 * 0.05);
    expect(status.pool).toBe(expectedContribution);
  });

  test("addToPool accumulates contributions", async () => {
    await services.jackpotService.addToPool(100);
    await services.jackpotService.addToPool(200);
    const status = await services.jackpotService.getStatus();
    const expected = Math.floor(100 * 0.05) + Math.floor(200 * 0.05);
    expect(status.pool).toBe(expected);
  });

  test("addToPool ignores small contributions", async () => {
    await services.jackpotService.addToPool(10);
    const status = await services.jackpotService.getStatus();
    expect(status.pool).toBe(0);
  });

  test("play returns error for unknown user", async () => {
    const result = await services.jackpotService.play("nonexistent");
    expect(result.error).toBe("User not found");
  });

  test("play returns error when user has insufficient tickets", async () => {
    const poor = await createUser(db, { tickets: 2 });
    const result = await services.jackpotService.play(poor.id);
    expect(result.error).toBe("Not enough tickets");
  });

  test("play returns error for banned user", async () => {
    const banned = await createUser(db, { gamblingBanned: true, tickets: 100 });
    const result = await services.jackpotService.play(banned.id);
    expect(result.error).toBe("Banned from gambling");
  });

  test("play returns error when jackpot not initialized", async () => {
    const result = await services.jackpotService.play(userId);
    expect(result.error).toBe("Jackpot not initialized");
  });

  test("play deducts ticket cost", async () => {
    const ts = new Date().toISOString();
    await db.insert(schema.jackpot).values({
      id: newId(),
      pool: 100,
      winningNumber: 500,
      winningNumberDate: "2026-06-19",
      created: ts,
      updated: ts,
    });
    await services.jackpotService.play(userId);
    const user = await db.select().from(schema.users).where(eq(schema.users.id, userId)).then((r) => r[0]);
    expect(user!.tickets).toBe(90);
  });

  test("play returns loss result for non-winning guess", async () => {
    const ts = new Date().toISOString();
    await db.insert(schema.jackpot).values({
      id: newId(),
      pool: 100,
      winningNumber: 500,
      winningNumberDate: "2026-06-19",
      created: ts,
      updated: ts,
    });
    const result = await services.jackpotService.play(userId);
    expect(result.win).toBe(false);
    expect(result.prize).toBe(0);
  });

  test("play with devForceWin wins jackpot", async () => {
    const ts = new Date().toISOString();
    await db.insert(schema.jackpot).values({
      id: newId(),
      pool: 100,
      winningNumber: 500,
      winningNumberDate: "2026-06-19",
      created: ts,
      updated: ts,
    });
    const result = await services.jackpotService.play(userId, true, { devForceWin: true });
    expect(result.win).toBe(true);
    expect(result.prize).toBe(100);
  });

  test("win resets pool and records winner", async () => {
    const ts = new Date().toISOString();
    await db.insert(schema.jackpot).values({
      id: newId(),
      pool: 250,
      winningNumber: 500,
      winningNumberDate: "2026-06-19",
      created: ts,
      updated: ts,
    });
    await services.jackpotService.play(userId, false, { devForceWin: true });
    const status = await services.jackpotService.getStatus();
    expect(status.pool).toBe(0);
    expect(status.lastWinnerId).toBe(userId);
  });

  test("jackpot win triggers gambling ban when threshold exceeded", async () => {
    const nearUser = await createUser(db, {
      tickets: 200,
      gamblingWinnings: 995,
      gamblingBanned: false,
    });
    const ts = new Date().toISOString();
    await db.insert(schema.jackpot).values({
      id: newId(),
      pool: 50,
      winningNumber: 500,
      winningNumberDate: "2026-06-19",
      created: ts,
      updated: ts,
    });
    const result = await services.jackpotService.play(nearUser.id, false, { devForceWin: true });
    expect(result.banned).toBe(true);
    const user = await db.select().from(schema.users).where(eq(schema.users.id, nearUser.id)).then((r) => r[0]);
    expect(user!.gamblingBanned).toBe(true);
  });
});
