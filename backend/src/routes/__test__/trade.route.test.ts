import { describe, expect, test, beforeAll } from "bun:test";
import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { db, rawDb } from "@/db/index.db";
import * as schema from "@/db/schema.db";
import { newId, nowIso } from "@/lib/index.utils";
import tradeRoute from "@/routes/trade.route";

const JWT_SECRET = "dpg-local-jwt";

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

describe("Trade route auth", () => {
  beforeAll(() => createTables());

  test("POST /trade without auth returns 401", async () => {
    const app = new Elysia().use(tradeRoute);
    const body = JSON.stringify({
      currentUser: { id: "a", money: 0, items: [] },
      otherUser: { id: "b", money: 0, items: [] },
    });
    const res = await app.handle(
      new Request("http://localhost/trade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );
    expect(res.status).toBe(401);
  });

  test("POST /trade with valid auth returns 422 for missing body", async () => {
    const id = newId();
    const ts = nowIso();
    await db.insert(schema.users).values({
      id, username: `TEST_${id.slice(0, 6)}`,
      passwordHash: await Bun.password.hash("test"),
      money: 100, tickets: 0, ticketsBoughtToday: 0,
      isAdmin: false, position: 0, steam: "",
      currentAction: "MOVE_POSITIVE", currentDice: 1,
      status: [], place: "0",
      gamblingWinnings: 0, gamblingBanned: false, hangman: false,
      created: ts, updated: ts,
    });

    const signApp = new Elysia()
      .use(jwt({ name: "jwt", secret: JWT_SECRET, exp: "1h" }))
      .get("/sign", async ({ jwt }) => jwt.sign({ sub: id, isAdmin: false }));
    const signRes = await signApp.handle(new Request("http://localhost/sign"));
    const tokenStr = await signRes.text();

    const app = new Elysia().use(tradeRoute);
    const res = await app.handle(
      new Request("http://localhost/trade", {
        method: "POST",
        headers: { authorization: `Bearer ${tokenStr}` },
      }),
    );
    expect(res.status).toBe(422);
  });
});
