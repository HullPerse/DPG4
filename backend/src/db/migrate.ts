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
