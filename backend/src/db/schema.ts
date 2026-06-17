import {
  sqliteTable,
  text,
  integer,
  blob,
} from "drizzle-orm/sqlite-core";

const timestamps = {
  created: text("created").notNull(),
  updated: text("updated").notNull(),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  email: text("email"),
  avatar: text("avatar").notNull().default(""),
  color: text("color").notNull().default("#000000"),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  position: integer("position").notNull().default(0),
  money: integer("money").notNull().default(0),
  steam: text("steam").notNull().default(""),
  currentAction: text("current_action").notNull().default("MOVE_POSITIVE"),
  currentDice: integer("current_dice").notNull().default(1),
  status: text("status", { mode: "json" }).$type<string[]>().default([]),
  place: text("place").notNull().default("0"),
  gamblingWinnings: integer("gambling_winnings").notNull().default(0),
  gamblingBanned: integer("gambling_banned", { mode: "boolean" }).notNull().default(false),
  hangman: integer("hangman", { mode: "boolean" }).notNull().default(false),
  tickets: integer("tickets").notNull().default(0),
  ticketsBoughtToday: integer("tickets_bought_today").notNull().default(0),
  ticketsDate: text("tickets_date"),
  ...timestamps,
});

export const games = sqliteTable("games", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  user: text("user", { mode: "json" }).$type<Record<string, unknown>>(),
  data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
  status: text("status").notNull().default("PLAYING"),
  playtime: text("playtime", { mode: "json" }).$type<Record<string, unknown>>(),
  score: integer("score").notNull().default(0),
  review: text("review", { mode: "json" }).$type<Record<string, unknown>>(),
  image: blob("image", { mode: "buffer" }),
  imageMime: text("image_mime"),
  ...timestamps,
});

export const presets = sqliteTable("presets", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  games: text("games", { mode: "json" }).$type<unknown[]>().default([]),
  ...timestamps,
});

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  charge: integer("charge").notNull().default(0),
  rollable: integer("rollable", { mode: "boolean" }).notNull().default(false),
  status: text("status", { mode: "json" }).$type<string[] | null>(),
  image: blob("image", { mode: "buffer" }),
  imageMime: text("image_mime"),
  ...timestamps,
});

export const inventory = sqliteTable("inventory", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  owner: text("owner").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  charge: integer("charge").notNull().default(0),
  image: blob("image", { mode: "buffer" }),
  imageMime: text("image_mime"),
  ...timestamps,
});

export const market = sqliteTable("market", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  originalId: text("original_id"),
  owner: text("owner", { mode: "json" }).$type<Record<string, unknown>>(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  charge: integer("charge").notNull().default(0),
  price: integer("price").notNull().default(0),
  discount: integer("discount"),
  perTicketPrice: integer("per_ticket_price"),
  image: blob("image", { mode: "buffer" }),
  imageMime: text("image_mime"),
  ...timestamps,
});

export const activity = sqliteTable("activity", {
  id: text("id").primaryKey(),
  author: text("author"),
  image: text("image"),
  type: text("type").notNull().default("emoji"),
  text: text("text").notNull().default(""),
  created: text("created").notNull(),
});

export const chats = sqliteTable("chats", {
  id: text("id").primaryKey(),
  data: text("data", { mode: "json" }).$type<Record<string, unknown>>(),
  message: text("message").notNull().default(""),
  image: blob("image", { mode: "buffer" }),
  imageMime: text("image_mime"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  created: text("created").notNull(),
});

export const rules = sqliteTable("rules", {
  id: text("id").primaryKey(),
  category: text("category").notNull(),
  rule: text("rule").notNull(),
  ...timestamps,
});

export const ads = sqliteTable("ads", {
  id: text("id").primaryKey(),
  owner: text("owner", { mode: "json" }).$type<Record<string, unknown>>(),
  text: text("text").notNull().default(""),
  image: blob("image", { mode: "buffer" }),
  imageMime: text("image_mime"),
  audio: blob("audio", { mode: "buffer" }),
  audioMime: text("audio_mime"),
  ...timestamps,
});

export const drawings = sqliteTable("drawings", {
  id: text("id").primaryKey(),
  author: text("author", { mode: "json" }).$type<Record<string, unknown>>(),
  image: blob("image", { mode: "buffer" }),
  imageMime: text("image_mime"),
  ...timestamps,
});

export const history = sqliteTable("history", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  owner: text("owner", { mode: "json" })
    .$type<{ id: string; username: string } | null>()
    .default(null),
  type: text("type").notNull(),
  label: text("label").notNull(),
  image: text("image").notNull().default(""),
  bid: integer("bid").notNull().default(0),
  payout: integer("payout").notNull().default(0),
  net: integer("net").notNull().default(0),
  data: text("data", { mode: "json" })
    .$type<Record<string, unknown> | null>()
    .default(null),
  created: text("created").notNull(),
});

export const hangman = sqliteTable("hangman", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  word: text("word").notNull(),
  state: text("state", { enum: ["current", "won", "lost"] })
    .notNull()
    .default("current"),
  guessedLetters: text("guessed_letters", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  wrongLetters: text("wrong_letters", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  ...timestamps,
});

export const pets = sqliteTable("pets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  hunger: integer("hunger").notNull().default(100),
  happiness: integer("happiness").notNull().default(100),
  energy: integer("energy").notNull().default(100),
  isAlive: integer("is_alive", { mode: "boolean" }).notNull().default(true),
  color: text("color").notNull().default("#8B7355"),
  model: text("model").notNull().default("rat"),
  lastUpdated: text("last_updated").notNull(),
  lastRewardDate: text("last_reward_date"),
  kvasBuff: integer("kvas_buff", { mode: "boolean" }).notNull().default(false),
  lastSearchDate: text("last_search_date"),
  ...timestamps,
});

export const inventoryLog = sqliteTable("inventory_log", {
  id: text("id").primaryKey(),
  inventoryId: text("inventory_id").notNull(),
  itemLabel: text("item_label").notNull(),
  itemType: text("item_type").notNull(),
  owner: text("owner").notNull(),
  action: text("action").notNull(),
  actor: text("actor"),
  details: text("details", { mode: "json" }).$type<Record<string, unknown> | null>(),
  created: text("created").notNull(),
});

export const jackpot = sqliteTable("jackpot", {
  id: text("id").primaryKey(),
  pool: integer("pool").notNull().default(0),
  winningNumber: integer("winning_number").notNull().default(0),
  winningNumberDate: text("winning_number_date"),
  lastWinnerId: text("last_winner_id"),
  lastWinnerUsername: text("last_winner_username"),
  lastWinAmount: integer("last_win_amount"),
  lastWinDate: text("last_win_date"),
  created: text("created").notNull(),
  updated: text("updated").notNull(),
});

export type QuestReward = {
  type: "item" | "money";
  value: string | number;
};

export const quests = sqliteTable("quests", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull().default(""),
  reward: text("reward", { mode: "json" }).$type<QuestReward[]>().notNull().default([]),
  claimed: text("claimed", { mode: "json" }).$type<string[]>().notNull().default([]),
  ...timestamps,
});

export const cells = sqliteTable("cells", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  number: integer("number").notNull(),
  title: text("title").notNull().default(""),
  conditions: text("conditions", { mode: "json" }).$type<Record<string, string>>(),
  cellType: text("cell_type").notNull().default(""),
  difficulty: text("difficulty").notNull().default(""),
  ladderTo: integer("ladder_to").notNull().default(0),
  snakeTo: integer("snake_to").notNull().default(0),
  status: text("status", { mode: "json" }).$type<string[] | null>(),
  captured: text("captured", { mode: "json" }).$type<string[] | null>(),
  ...timestamps,
});
