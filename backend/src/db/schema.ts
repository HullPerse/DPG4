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
