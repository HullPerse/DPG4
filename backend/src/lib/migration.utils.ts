import { rawDb } from "@/db/index.db";
import type { Migration } from "@/types/server";

export const migrations: Record<string, Migration> = {
  "0001_initial": {
    description: "Core tables",
    sql: [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        place TEXT,
        tickets INTEGER NOT NULL DEFAULT 0,
        tickets_bought_today INTEGER NOT NULL DEFAULT 0,
        tickets_date TEXT,
        gambling_winnings INTEGER NOT NULL DEFAULT 0,
        gambling_banned INTEGER NOT NULL DEFAULT 0,
        hangman INTEGER NOT NULL DEFAULT 0,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        item_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS cells (
        id TEXT PRIMARY KEY,
        number INTEGER NOT NULL,
        type TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS activity (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        created TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS market (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        type TEXT NOT NULL,
        price INTEGER NOT NULL,
        per_ticket_price INTEGER,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS ads (
        id TEXT PRIMARY KEY,
        owner TEXT NOT NULL,
        content TEXT NOT NULL,
        created TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS drawings (
        id TEXT PRIMARY KEY,
        author TEXT NOT NULL,
        data TEXT NOT NULL,
        created TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        hash TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL
      );`,
    ],
  },
  "0002_games_and_chats": {
    description: "Games and chats tables",
    sql: [
      `CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        game_name TEXT,
        data TEXT NOT NULL,
        status TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        created TEXT NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_games_user_id ON games (user_id);",
      "CREATE INDEX IF NOT EXISTS idx_games_status ON games (status);",
      "CREATE INDEX IF NOT EXISTS idx_games_created ON games (created DESC);",
      "CREATE INDEX IF NOT EXISTS idx_chats_created ON chats (created DESC);",
    ],
  },
  "0003_gambling_columns": {
    description: "Add gambling columns to users",
    sql: [
      "ALTER TABLE users ADD COLUMN gambling_winnings INTEGER NOT NULL DEFAULT 0;",
      "ALTER TABLE users ADD COLUMN gambling_banned INTEGER NOT NULL DEFAULT 0;",
    ],
  },
  "0004_history_table": {
    description: "Create unified history table",
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
      "CREATE INDEX IF NOT EXISTS idx_history_user_id ON history (user_id);",
      "CREATE INDEX IF NOT EXISTS idx_history_user_id_created ON history (user_id, created DESC);",
      "CREATE INDEX IF NOT EXISTS idx_history_user_id_type ON history (user_id, type);",
      "CREATE INDEX IF NOT EXISTS idx_history_type ON history (type);",
      "CREATE INDEX IF NOT EXISTS idx_history_net ON history (net);",
      "CREATE INDEX IF NOT EXISTS idx_history_created ON history (created DESC);",
    ],
  },
  "0005_hangman": {
    description: "Add hangman game",
    sql: [
      `CREATE TABLE IF NOT EXISTS hangman (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        word TEXT NOT NULL,
        guessed_letters TEXT NOT NULL DEFAULT '[]',
        wrong_letters TEXT NOT NULL DEFAULT '[]',
        state TEXT NOT NULL DEFAULT 'current',
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_hangman_user_id ON hangman (user_id);",
      "ALTER TABLE users ADD COLUMN hangman INTEGER NOT NULL DEFAULT 0;",
    ],
  },
  "0006_pets": {
    description: "Add pets system",
    sql: [
      `CREATE TABLE IF NOT EXISTS pets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        model TEXT NOT NULL DEFAULT 'rat',
        color TEXT NOT NULL DEFAULT '#8B7355',
        hunger INTEGER NOT NULL DEFAULT 100,
        happiness INTEGER NOT NULL DEFAULT 100,
        energy INTEGER NOT NULL DEFAULT 100,
        is_alive INTEGER NOT NULL DEFAULT 1,
        kvas_buff INTEGER NOT NULL DEFAULT 0,
        last_reward_date TEXT,
        last_search_date TEXT,
        last_updated TEXT NOT NULL,
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets (user_id);",
      "CREATE INDEX IF NOT EXISTS idx_pets_is_alive ON pets (is_alive);",
    ],
  },
  "0007_jackpot": {
    description: "Add jackpot system",
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
  "0008_fts_search": {
    description: "Add full-text search with FTS5",
    sql: [
      "UPDATE games SET game_name = json_extract(data, '$.name') WHERE game_name IS NULL;",
      "CREATE VIRTUAL TABLE IF NOT EXISTS users_fts USING fts5(username, content='');",
      "CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(label, description, content='');",
      "CREATE VIRTUAL TABLE IF NOT EXISTS games_fts USING fts5(name, content='');",
      "INSERT INTO users_fts(rowid, username) SELECT rowid, username FROM users WHERE username IS NOT NULL;",
      "INSERT INTO items_fts(rowid, label, description) SELECT rowid, label, description FROM items WHERE label IS NOT NULL;",
      "INSERT INTO games_fts(rowid, name) SELECT rowid, game_name FROM games WHERE game_name IS NOT NULL;",
      // Triggers for users_fts
      "CREATE TRIGGER IF NOT EXISTS users_fts_ai AFTER INSERT ON users BEGIN INSERT INTO users_fts(rowid, username) VALUES (new.rowid, new.username); END;",
      "CREATE TRIGGER IF NOT EXISTS users_fts_ad AFTER DELETE ON users BEGIN INSERT INTO users_fts(users_fts, rowid, username) VALUES('delete', old.rowid, old.username); END;",
      "CREATE TRIGGER IF NOT EXISTS users_fts_au AFTER UPDATE ON users BEGIN INSERT INTO users_fts(users_fts, rowid, username) VALUES('delete', old.rowid, old.username); INSERT INTO users_fts(rowid, username) VALUES (new.rowid, new.username); END;",
      // Triggers for items_fts
      "CREATE TRIGGER IF NOT EXISTS items_fts_ai AFTER INSERT ON items BEGIN INSERT INTO items_fts(rowid, label, description) VALUES (new.rowid, new.label, new.description); END;",
      "CREATE TRIGGER IF NOT EXISTS items_fts_ad AFTER DELETE ON items BEGIN INSERT INTO items_fts(items_fts, rowid, label, description) VALUES('delete', old.rowid, old.label, old.description); END;",
      "CREATE TRIGGER IF NOT EXISTS items_fts_au AFTER UPDATE ON items BEGIN INSERT INTO items_fts(items_fts, rowid, label, description) VALUES('delete', old.rowid, old.label, old.description); INSERT INTO items_fts(rowid, label, description) VALUES (new.rowid, new.label, new.description); END;",
      // Triggers for games_fts
      "CREATE TRIGGER IF NOT EXISTS games_fts_ai AFTER INSERT ON games BEGIN INSERT INTO games_fts(rowid, name) VALUES (new.rowid, new.game_name); END;",
      "CREATE TRIGGER IF NOT EXISTS games_fts_ad AFTER DELETE ON games BEGIN INSERT INTO games_fts(games_fts, rowid, name) VALUES('delete', old.rowid, old.game_name); END;",
      "CREATE TRIGGER IF NOT EXISTS games_fts_au AFTER UPDATE ON games BEGIN INSERT INTO games_fts(games_fts, rowid, name) VALUES('delete', old.rowid, old.game_name); INSERT INTO games_fts(rowid, name) VALUES (new.rowid, new.game_name); END;",
    ],
  },
  "0009_performance_indexes": {
    description: "Add performance indexes",
    sql: [
      "CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);",
      "CREATE INDEX IF NOT EXISTS idx_users_place ON users (place);",
      "CREATE INDEX IF NOT EXISTS idx_items_label ON items (label);",
      "CREATE INDEX IF NOT EXISTS idx_items_type ON items (type);",
      "CREATE INDEX IF NOT EXISTS idx_inventory_owner ON inventory (owner);",
      "CREATE INDEX IF NOT EXISTS idx_inventory_owner_type ON inventory (owner, type);",
      "CREATE INDEX IF NOT EXISTS idx_inventory_type ON inventory (type);",
      "CREATE INDEX IF NOT EXISTS idx_cells_number ON cells (number);",
      "CREATE INDEX IF NOT EXISTS idx_cells_type ON cells (type);",
      "CREATE INDEX IF NOT EXISTS idx_activity_created ON activity (created DESC);",
      "CREATE INDEX IF NOT EXISTS idx_market_owner ON market (owner);",
      "CREATE INDEX IF NOT EXISTS idx_market_type ON market (type);",
      "CREATE INDEX IF NOT EXISTS idx_market_type_price ON market (type, price);",
      "CREATE INDEX IF NOT EXISTS idx_market_created ON market (created DESC);",
      "CREATE INDEX IF NOT EXISTS idx_ads_owner ON ads (owner);",
      "CREATE INDEX IF NOT EXISTS idx_drawings_author ON drawings (author);",
    ],
  },
  "0010_cache": {
    description: "Add cache table",
    sql: [
      `CREATE TABLE IF NOT EXISTS cache (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        expires_at INTEGER
      );`,
      "CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache (expires_at);",
    ],
  },
  "0011_inventory_log": {
    description: "Add inventory log for auditing",
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
  "0012_quests": {
    description: "Add quests system",
    sql: [
      `CREATE TABLE IF NOT EXISTS quests (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        reward TEXT NOT NULL DEFAULT '[]',
        claimed TEXT NOT NULL DEFAULT '[]',
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
    ],
  },
  "0013_drop_cache": {
    description: "Drop cache table (moved to in-memory)",
    sql: ["DROP TABLE IF EXISTS cache;"],
  },
  "0014_add_missing_indexes": {
    description: "Add missing performance indexes on history, games, pets",
    sql: [
      "CREATE INDEX IF NOT EXISTS idx_history_user_id ON history (user_id);",
      "CREATE INDEX IF NOT EXISTS idx_history_user_created ON history (user_id, created DESC);",
      "CREATE INDEX IF NOT EXISTS idx_history_type ON history (type);",
      "CREATE INDEX IF NOT EXISTS idx_games_user_id ON games (user_id);",
      "CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets (user_id);",
      "CREATE INDEX IF NOT EXISTS idx_pets_is_alive ON pets (is_alive);",
      "CREATE INDEX IF NOT EXISTS idx_users_position ON users (position);",
    ],
  },
  "0015_events_table": {
    description: "Add events audit table",
    sql: [
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        actor_id TEXT,
        target_id TEXT,
        payload TEXT NOT NULL DEFAULT '{}',
        created TEXT NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_events_type ON events (type);",
      "CREATE INDEX IF NOT EXISTS idx_events_actor ON events (actor_id);",
      "CREATE INDEX IF NOT EXISTS idx_events_target ON events (target_id);",
      "CREATE INDEX IF NOT EXISTS idx_events_created ON events (created DESC);",
    ],
  },
  "0017_gambling_sessions": {
    description: "Add gambling sessions table for DB-backed game state",
    sql: [
      `CREATE TABLE IF NOT EXISTS gambling_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        game_type TEXT NOT NULL,
        state TEXT NOT NULL,
        bid INTEGER NOT NULL DEFAULT 0,
        phase TEXT NOT NULL DEFAULT 'active',
        created TEXT NOT NULL,
        updated TEXT NOT NULL
      );`,
      "CREATE INDEX IF NOT EXISTS idx_gambling_sessions_user ON gambling_sessions (user_id);",
      "CREATE INDEX IF NOT EXISTS idx_gambling_sessions_user_game ON gambling_sessions (user_id, game_type);",
    ],
  },
  "0018_composite_indexes": {
    description: "Add composite indexes for common query patterns",
    sql: [
      "CREATE INDEX IF NOT EXISTS idx_games_user_status ON games (user_id, status, created DESC);",
      "CREATE INDEX IF NOT EXISTS idx_inventory_owner_item ON inventory (owner, item_id);",
      "CREATE INDEX IF NOT EXISTS idx_history_user_type ON history (user_id, type, created DESC);",
    ],
  },
  "0019_rocket_crash_history": {
    description: "Rocket crash history table",
    sql: [
      `CREATE TABLE IF NOT EXISTS rocket_crash_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        crash_point REAL NOT NULL,
        created TEXT NOT NULL
      );`,
    ],
  },
};

export function getAppliedMigrations(): Set<string> {
  try {
    const rows = rawDb.query("SELECT hash FROM __drizzle_migrations").all() as {
      hash: string;
    }[];
    return new Set(rows.map((row) => row.hash));
  } catch {
    rawDb.run(`
       CREATE TABLE IF NOT EXISTS __drizzle_migrations (
         hash TEXT PRIMARY KEY,
         created_at INTEGER NOT NULL
       );
     `);
    return new Set();
  }
}

export function markApplied(hash: string) {
  rawDb
    .prepare(
      "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)",
    )
    .run(hash, Date.now());
}
