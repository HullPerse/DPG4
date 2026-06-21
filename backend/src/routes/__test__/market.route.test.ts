import { describe, expect, test, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { rawDb } from "@/db/index.db";
import marketRoute from "@/routes/market.route";

function createTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL, email TEXT,
      avatar TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '#000000',
      is_admin INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0,
      money INTEGER NOT NULL DEFAULT 0, steam TEXT NOT NULL DEFAULT '',
      current_action TEXT NOT NULL DEFAULT 'MOVE_POSITIVE',
      current_dice INTEGER NOT NULL DEFAULT 1, status TEXT DEFAULT '[]',
      place TEXT NOT NULL DEFAULT '0', gambling_winnings INTEGER NOT NULL DEFAULT 0,
      gambling_banned INTEGER NOT NULL DEFAULT 0, hangman INTEGER NOT NULL DEFAULT 0,
      tickets INTEGER NOT NULL DEFAULT 0, tickets_bought_today INTEGER NOT NULL DEFAULT 0,
      tickets_date TEXT, created TEXT NOT NULL, updated TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, owner TEXT NOT NULL,
      label TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      charge INTEGER NOT NULL DEFAULT 0, image BLOB, image_mime TEXT,
      created TEXT NOT NULL, updated TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS market (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, original_id TEXT,
      owner TEXT NOT NULL, label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', charge INTEGER NOT NULL DEFAULT 0,
      price INTEGER NOT NULL DEFAULT 0, discount INTEGER,
      per_ticket_price INTEGER, image BLOB, image_mime TEXT,
      created TEXT NOT NULL, updated TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_log (
      id TEXT PRIMARY KEY, inventory_id TEXT NOT NULL, item_label TEXT NOT NULL,
      item_type TEXT NOT NULL, owner TEXT NOT NULL, action TEXT NOT NULL,
      actor TEXT, details TEXT, created TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, label TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '', charge INTEGER NOT NULL DEFAULT 0,
      rollable INTEGER NOT NULL DEFAULT 0, status TEXT,
      image BLOB, image_mime TEXT, created TEXT NOT NULL, updated TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY, author TEXT, image TEXT,
      type TEXT NOT NULL DEFAULT 'emoji', text TEXT NOT NULL DEFAULT '',
      created TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, owner TEXT,
      type TEXT NOT NULL DEFAULT 'wheel', label TEXT NOT NULL,
      image TEXT NOT NULL DEFAULT '', bid INTEGER NOT NULL DEFAULT 0,
      payout INTEGER NOT NULL DEFAULT 0, net INTEGER NOT NULL DEFAULT 0,
      data TEXT DEFAULT '{}', created TEXT NOT NULL
    )`,
  ];
  for (const sql of tables) rawDb.run(sql);
}

describe("Market route auth", () => {
  beforeAll(() => createTables());

  test("POST /market/sell without auth returns 401", async () => {
    const app = new Elysia().use(marketRoute);
    const body = JSON.stringify({
      inventoryId: "test", ownerId: "test", price: 10,
    });
    const res = await app.handle(
      new Request("http://localhost/market/sell", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );
    expect(res.status).toBe(401);
  });

  test("POST /market/:id/buy without auth returns 401", async () => {
    const app = new Elysia().use(marketRoute);
    const body = JSON.stringify({ newOwnerId: "a", oldOwnerId: "b" });
    const res = await app.handle(
      new Request("http://localhost/market/test-id/buy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );
    expect(res.status).toBe(401);
  });

  test("POST /market/:id/remove without auth returns 401", async () => {
    const app = new Elysia().use(marketRoute);
    const res = await app.handle(
      new Request("http://localhost/market/test-id/remove", { method: "POST" }),
    );
    expect(res.status).toBe(401);
  });

  test("POST /market/:id/discount without auth returns 401", async () => {
    const app = new Elysia().use(marketRoute);
    const body = JSON.stringify({
      ownerId: "a", price: 100, discountPrice: 70,
    });
    const res = await app.handle(
      new Request("http://localhost/market/test-id/discount", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );
    expect(res.status).toBe(401);
  });

  test("DELETE /market/:id without auth returns 401", async () => {
    const app = new Elysia().use(marketRoute);
    const res = await app.handle(
      new Request("http://localhost/market/test-id", { method: "DELETE" }),
    );
    expect(res.status).toBe(401);
  });
});
