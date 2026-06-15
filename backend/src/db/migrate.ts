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
          NULL AS owner,
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
  {
    hash: "0006_add_hangman_table",
    sql: [
      `CREATE TABLE IF NOT EXISTS hangman (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        word TEXT NOT NULL,
        wins INTEGER NOT NULL DEFAULT 0,
        played INTEGER NOT NULL DEFAULT 0,
        guessed_letters TEXT NOT NULL DEFAULT '[]',
        wrong_letters TEXT NOT NULL DEFAULT '[]',
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_hangman_user_id ON hangman (user_id);",
    ],
  },
  {
    hash: "0007_add_hangman_state_columns",
    sql: [
      "ALTER TABLE hangman ADD COLUMN guessed_letters TEXT NOT NULL DEFAULT '[]';",
      "ALTER TABLE hangman ADD COLUMN wrong_letters TEXT NOT NULL DEFAULT '[]';",
    ],
  },
  {
    hash: "0008_add_state_column",
    sql: [
      `CREATE TABLE hangman_new (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        word TEXT NOT NULL,
        guessed_letters TEXT NOT NULL DEFAULT '[]',
        wrong_letters TEXT NOT NULL DEFAULT '[]',
        state TEXT NOT NULL DEFAULT 'current',
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      )`,
      `INSERT INTO hangman_new (id, user_id, word, guessed_letters, wrong_letters, state, created, updated)
       SELECT id, user_id, word, guessed_letters, wrong_letters,
              CASE WHEN played = 1 THEN 'won' ELSE 'current' END,
              created, updated
       FROM hangman`,
      `DROP TABLE hangman`,
      `ALTER TABLE hangman_new RENAME TO hangman`,
      `CREATE INDEX IF NOT EXISTS idx_hangman_user_id ON hangman (user_id)`,
    ],
  },
  {
    hash: "0009_add_hangman_to_users",
    sql: [
      "ALTER TABLE users ADD COLUMN hangman INTEGER NOT NULL DEFAULT 0;",
    ],
  },
  {
    hash: "0010_add_indexes",
    sql: [
      "CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);",
      "CREATE INDEX IF NOT EXISTS idx_items_label ON items (label);",
      "CREATE INDEX IF NOT EXISTS idx_items_type ON items (type);",
      "CREATE INDEX IF NOT EXISTS idx_inventory_owner ON inventory (owner);",
      "CREATE INDEX IF NOT EXISTS idx_cells_number ON cells (number);",
      "CREATE INDEX IF NOT EXISTS idx_cells_type ON cells (type);",
      "CREATE INDEX IF NOT EXISTS idx_activity_created ON activity (created DESC);",
      "CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);",
      "CREATE INDEX IF NOT EXISTS idx_games_created ON games (created DESC);",
    ],
  },
  {
    hash: "0011_add_pets_table",
    sql: [
      `CREATE TABLE IF NOT EXISTS pets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        hunger INTEGER NOT NULL DEFAULT 100,
        happiness INTEGER NOT NULL DEFAULT 100,
        energy INTEGER NOT NULL DEFAULT 100,
        is_alive INTEGER NOT NULL DEFAULT 1,
        last_updated TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets (user_id);",
    ],
  },
  {
    hash: "0012_add_reward_date",
    sql: [
      "ALTER TABLE pets ADD COLUMN last_reward_date TEXT;",
    ],
  },
  {
    hash: "0013_fts5_search",
    sql: [
      "ALTER TABLE games ADD COLUMN game_name TEXT;",
      "UPDATE games SET game_name = json_extract(data, '$.name') WHERE game_name IS NULL;",
      "CREATE VIRTUAL TABLE IF NOT EXISTS users_fts USING fts5(username, content='');",
      "CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(label, description, content='');",
      "CREATE VIRTUAL TABLE IF NOT EXISTS games_fts USING fts5(name, content='');",
      "INSERT INTO users_fts(rowid, username) SELECT rowid, username FROM users WHERE username IS NOT NULL;",
      "INSERT INTO items_fts(rowid, label, description) SELECT rowid, label, description FROM items WHERE label IS NOT NULL;",
      "INSERT INTO games_fts(rowid, name) SELECT rowid, game_name FROM games WHERE game_name IS NOT NULL;",
      "CREATE TRIGGER IF NOT EXISTS users_fts_ai AFTER INSERT ON users BEGIN INSERT INTO users_fts(rowid, username) VALUES (new.rowid, new.username); END;",
      "CREATE TRIGGER IF NOT EXISTS users_fts_ad AFTER DELETE ON users BEGIN INSERT INTO users_fts(users_fts, rowid, username) VALUES('delete', old.rowid, old.username); END;",
      "CREATE TRIGGER IF NOT EXISTS users_fts_au AFTER UPDATE ON users BEGIN INSERT INTO users_fts(users_fts, rowid, username) VALUES('delete', old.rowid, old.username); INSERT INTO users_fts(rowid, username) VALUES (new.rowid, new.username); END;",
      "CREATE TRIGGER IF NOT EXISTS items_fts_ai AFTER INSERT ON items BEGIN INSERT INTO items_fts(rowid, label, description) VALUES (new.rowid, new.label, new.description); END;",
      "CREATE TRIGGER IF NOT EXISTS items_fts_ad AFTER DELETE ON items BEGIN INSERT INTO items_fts(items_fts, rowid, label, description) VALUES('delete', old.rowid, old.label, old.description); END;",
      "CREATE TRIGGER IF NOT EXISTS items_fts_au AFTER UPDATE ON items BEGIN INSERT INTO items_fts(items_fts, rowid, label, description) VALUES('delete', old.rowid, old.label, old.description); INSERT INTO items_fts(rowid, label, description) VALUES (new.rowid, new.label, new.description); END;",
      "CREATE TRIGGER IF NOT EXISTS games_fts_ai AFTER INSERT ON games BEGIN INSERT INTO games_fts(rowid, name) VALUES (new.rowid, new.game_name); END;",
      "CREATE TRIGGER IF NOT EXISTS games_fts_ad AFTER DELETE ON games BEGIN INSERT INTO games_fts(games_fts, rowid, name) VALUES('delete', old.rowid, old.game_name); END;",
      "CREATE TRIGGER IF NOT EXISTS games_fts_au AFTER UPDATE ON games BEGIN INSERT INTO games_fts(games_fts, rowid, name) VALUES('delete', old.rowid, old.game_name); INSERT INTO games_fts(rowid, name) VALUES (new.rowid, new.game_name); END;",
    ],
  },
  {
    hash: "0014_add_pet_kvas_search",
    sql: [
      "ALTER TABLE pets ADD COLUMN kvas_buff INTEGER NOT NULL DEFAULT 0;",
      "ALTER TABLE pets ADD COLUMN last_search_date TEXT;",
    ],
  },
  {
    hash: "0015_add_pet_color",
    sql: [
      "ALTER TABLE pets ADD COLUMN color TEXT NOT NULL DEFAULT '#8B7355';",
    ],
  },
  {
    hash: "0016_add_tickets",
    sql: [
      "ALTER TABLE users ADD COLUMN tickets INTEGER NOT NULL DEFAULT 0;",
      "ALTER TABLE users ADD COLUMN tickets_bought_today INTEGER NOT NULL DEFAULT 0;",
      "ALTER TABLE users ADD COLUMN tickets_date TEXT;",
      "ALTER TABLE market ADD COLUMN per_ticket_price INTEGER;",
    ],
  },
  {
    hash: "0017_add_jackpot",
    sql: [
      `CREATE TABLE IF NOT EXISTS jackpot (
        id TEXT PRIMARY KEY,
        pool INTEGER NOT NULL DEFAULT 0,
        winning_number INTEGER NOT NULL DEFAULT 0,
        winning_number_date TEXT,
        last_winner_id TEXT,
        last_winner_username TEXT,
        last_win_amount INTEGER,
        last_win_date TEXT,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
    ],
  },
  {
    hash: "0019_add_pet_model",
    sql: [
      "ALTER TABLE pets ADD COLUMN model TEXT NOT NULL DEFAULT 'rat';",
    ],
  },
  {
    hash: "0018_add_winning_number_date",
    sql: [
      "ALTER TABLE jackpot ADD COLUMN winning_number_date TEXT;",
    ],
  },
  {
    hash: "0020_performance_indexes",
    sql: [
      "CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory (type);",
      "CREATE INDEX IF NOT EXISTS idx_inventory_owner_type ON inventory (owner, type);",
      "CREATE INDEX IF NOT EXISTS idx_market_owner ON market (owner);",
      "CREATE INDEX IF NOT EXISTS idx_market_type ON market (type);",
      "CREATE INDEX IF NOT EXISTS idx_market_created ON market (created DESC);",
      "CREATE INDEX IF NOT EXISTS idx_market_type_price ON market (type, price);",
      "CREATE INDEX IF NOT EXISTS idx_pets_is_alive ON pets (is_alive);",
      "CREATE INDEX IF NOT EXISTS idx_history_net ON history (net);",
      "CREATE INDEX IF NOT EXISTS idx_history_user_id_created ON history (user_id, created DESC);",
      "CREATE INDEX IF NOT EXISTS idx_history_user_id_type ON history (user_id, type);",
      "CREATE INDEX IF NOT EXISTS idx_ads_owner ON ads (owner);",
      "CREATE INDEX IF NOT EXISTS idx_drawings_author ON drawings (author);",
      "CREATE INDEX IF NOT EXISTS idx_users_place ON users (place);",
    ],
  },
  {
    hash: "0022_inventory_log",
    sql: [
      `CREATE TABLE IF NOT EXISTS inventory_log (
        id TEXT PRIMARY KEY,
        inventory_id TEXT NOT NULL,
        item_label TEXT NOT NULL,
        item_type TEXT NOT NULL,
        owner TEXT NOT NULL,
        action TEXT NOT NULL,
        actor TEXT,
        details TEXT,
        created TEXT NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_inventory_log_owner ON inventory_log (owner);",
      "CREATE INDEX IF NOT EXISTS idx_inventory_log_owner_created ON inventory_log (owner, created DESC);",
      "CREATE INDEX IF NOT EXISTS idx_inventory_log_action ON inventory_log (action);",
    ],
  },
  {
    hash: "0021_sqlite_cache_queue",
    sql: [
      `CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER
      );`,
      `CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        queue TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_jobs_queue_created ON jobs (queue, created_at);",
      "CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache (expires_at);",
    ],
  },
];

export function runMigrations() {
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
