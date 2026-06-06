import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db, rawDb } from "./index";

const pendingMigrations: { hash: string; sql: string[] }[] = [
  {
    hash: "0002_add_user_id_and_indexes",
    sql: [
      "ALTER TABLE games ADD COLUMN user_id TEXT;",
      "UPDATE games SET user_id = json_extract(user, '$.id') WHERE user_id IS NULL;",
      "CREATE INDEX IF NOT EXISTS idx_games_user_id ON games (user_id);",
      "CREATE INDEX IF NOT EXISTS idx_chats_created ON chats (created DESC);",
    ],
  },
  {
    hash: "0003_add_gambling_columns",
    sql: [
      "ALTER TABLE users ADD COLUMN gambling_winnings INTEGER NOT NULL DEFAULT 0;",
      "ALTER TABLE users ADD COLUMN gambling_banned INTEGER NOT NULL DEFAULT 0;",
    ],
  },
  {
    hash: "0004_add_wheel_history",
    sql: [
      `CREATE TABLE IF NOT EXISTS wheel_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_label TEXT NOT NULL,
        item_image TEXT NOT NULL,
        item_type TEXT NOT NULL,
        list_type TEXT NOT NULL DEFAULT 'general',
        cost INTEGER NOT NULL DEFAULT 0,
        free INTEGER NOT NULL DEFAULT 0,
        created TEXT NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_wheel_history_user_id ON wheel_history (user_id);",
      "CREATE INDEX IF NOT EXISTS idx_wheel_history_created ON wheel_history (created DESC);",
    ],
  },
  {
    hash: "0005_create_history_table",
    sql: [
      `CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        owner TEXT,
        type TEXT NOT NULL DEFAULT 'wheel',
        label TEXT NOT NULL,
        image TEXT NOT NULL DEFAULT '',
        bid INTEGER NOT NULL DEFAULT 0,
        payout INTEGER NOT NULL DEFAULT 0,
        net INTEGER NOT NULL DEFAULT 0,
        data TEXT DEFAULT '{}',
        created TEXT NOT NULL
      );`,
      `INSERT INTO history (id, user_id, owner, type, label, image, bid, payout, net, data, created)
        SELECT
          id,
          user_id,
          owner,
          'wheel' AS type,
          item_label AS label,
          CASE WHEN item_type = 'image' THEN item_image ELSE '' END AS image,
          cost AS bid,
          0 AS payout,
          -cost AS net,
          json_object('itemId', item_id, 'itemType', item_type, 'listType', list_type, 'free', free) AS data,
          created
        FROM wheel_history;`,
      "DROP TABLE IF EXISTS wheel_history;",
      "CREATE INDEX IF NOT EXISTS idx_history_user_id ON history (user_id);",
      "CREATE INDEX IF NOT EXISTS idx_history_type ON history (type);",
      "CREATE INDEX IF NOT EXISTS idx_history_created ON history (created DESC);",
    ],
  },
];

export function runMigrations() {
  migrate(db, { migrationsFolder: "./drizzle" });

  for (const migration of pendingMigrations) {
    const applied = rawDb
      .query("SELECT hash FROM __drizzle_migrations WHERE hash = ?")
      .get(migration.hash) as { hash: string } | null;

    if (applied) {
      console.log(`Skipping ${migration.hash} (already applied)`);
      continue;
    }

    console.log(`Running ${migration.hash}...`);
    for (const stmt of migration.sql) {
      try {
        rawDb.run(stmt);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (
          msg.includes("duplicate column") ||
          msg.includes("already exists")
        ) {
          console.log(`  Skipped: ${msg}`);
        } else {
          console.error(`Error: ${msg}`);
          throw e;
        }
      }
    }

    rawDb
      .prepare(
        "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
      )
      .run(migration.hash, Date.now());
    console.log(`Done ${migration.hash}`);
  }

  console.log("Migrations applied");
}

if (import.meta.main) {
  runMigrations();
}
