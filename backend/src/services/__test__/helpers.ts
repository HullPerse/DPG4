import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "@/db/schema.db";
import { newId } from "@/lib/index.utils";
import ActivityService from "@/services/activity.service";
import UserService from "@/services/user.service";
import LogService from "@/services/log.service";
import EconomyService from "@/services/economy.service";
import DiceService from "@/services/gambling/dice.service";
import BlackjackService from "@/services/gambling/blackjack.service";
import RocketService from "@/services/gambling/rocket.service";
import PachinkoService from "@/services/gambling/pachinko.service";
import MinesService from "@/services/gambling/mines.service";
import JackpotService from "@/services/gambling/jackpot.service";
import { Db } from "@/types/server";

const CREATE_USERS = `CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT,
  avatar TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#000000',
  is_admin INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  money INTEGER NOT NULL DEFAULT 0,
  steam TEXT NOT NULL DEFAULT '',
  current_action TEXT NOT NULL DEFAULT 'MOVE_POSITIVE',
  current_dice INTEGER NOT NULL DEFAULT 1,
  status TEXT DEFAULT '[]',
  place TEXT NOT NULL DEFAULT '0',
  gambling_winnings INTEGER NOT NULL DEFAULT 0,
  gambling_banned INTEGER NOT NULL DEFAULT 0,
  hangman INTEGER NOT NULL DEFAULT 0,
  tickets INTEGER NOT NULL DEFAULT 0,
  tickets_bought_today INTEGER NOT NULL DEFAULT 0,
  tickets_date TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
)`;

const CREATE_ACTIVITY = `CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  author TEXT,
  image TEXT,
  type TEXT NOT NULL DEFAULT 'emoji',
  text TEXT NOT NULL DEFAULT '',
  created TEXT NOT NULL
)`;

const CREATE_HISTORY = `CREATE TABLE history (
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
)`;

const CREATE_INVENTORY = `CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  owner TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  charge INTEGER NOT NULL DEFAULT 0,
  image BLOB,
  image_mime TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
)`;

const CREATE_INVENTORY_LOG = `CREATE TABLE inventory_log (
  id TEXT PRIMARY KEY,
  inventory_id TEXT NOT NULL,
  item_label TEXT NOT NULL,
  item_type TEXT NOT NULL,
  owner TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT,
  details TEXT,
  created TEXT NOT NULL
)`;

const CREATE_ITEMS = `CREATE TABLE items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  charge INTEGER NOT NULL DEFAULT 0,
  rollable INTEGER NOT NULL DEFAULT 0,
  status TEXT,
  image BLOB,
  image_mime TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
)`;

const CREATE_GAMES = `CREATE TABLE games (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user TEXT,
  data TEXT DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PLAYING',
  playtime TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  review TEXT,
  image BLOB,
  image_mime TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
)`;

const CREATE_MARKET = `CREATE TABLE market (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  original_id TEXT,
  owner TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  charge INTEGER NOT NULL DEFAULT 0,
  price INTEGER NOT NULL DEFAULT 0,
  discount INTEGER,
  per_ticket_price INTEGER,
  image BLOB,
  image_mime TEXT,
  created TEXT NOT NULL,
  updated TEXT NOT NULL
)`;

const CREATE_JACKPOT = `CREATE TABLE jackpot (
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
)`;

export function createTestDb(): { sqlite: Database; db: Db } {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  sqlite.run(CREATE_USERS);
  sqlite.run(CREATE_ACTIVITY);
  sqlite.run(CREATE_HISTORY);
  sqlite.run(CREATE_INVENTORY);
  sqlite.run(CREATE_INVENTORY_LOG);
  sqlite.run(CREATE_ITEMS);
  sqlite.run(CREATE_GAMES);
  sqlite.run(CREATE_MARKET);
  sqlite.run(CREATE_JACKPOT);
  return { sqlite, db };
}

export interface TestServices {
  activityService: ActivityService;
  userService: UserService;
  logService: LogService;
  economyService: EconomyService;
  diceService: DiceService;
  blackjackService: BlackjackService;
  rocketService: RocketService;
  pachinkoService: PachinkoService;
  minesService: MinesService;
  jackpotService: JackpotService;
}

export function createServices(db: Db): TestServices {
  const activityService = new ActivityService(db);
  const userService = new UserService(db, activityService);
  const logService = new LogService(db);
  const economyService = new EconomyService(
    db,
    userService,
    activityService,
    logService,
  );
  const diceService = new DiceService(db, userService, economyService);
  const blackjackService = new BlackjackService(
    db,
    userService,
    economyService,
  );
  const rocketService = new RocketService(db, userService, economyService);
  const pachinkoService = new PachinkoService(db, userService, economyService);
  const minesService = new MinesService(db, userService, economyService);
  const jackpotService = new JackpotService(db);
  return {
    activityService,
    userService,
    logService,
    economyService,
    diceService,
    blackjackService,
    rocketService,
    pachinkoService,
    minesService,
    jackpotService,
  };
}

export async function createUser(
  db: Db,
  overrides?: Partial<typeof schema.users.$inferInsert>,
) {
  const id = newId();
  const ts = new Date().toISOString();
  const defaultUser = {
    id,
    username: `TESTUSER_${id.slice(0, 6)}`,
    passwordHash: await Bun.password.hash("test123"),
    email: null,
    avatar: "",
    color: "#000000",
    isAdmin: false,
    position: 0,
    money: 100,
    tickets: 100,
    ticketsBoughtToday: 0,
    ticketsDate: null,
    steam: "",
    currentAction: "MOVE_POSITIVE" as const,
    currentDice: 1,
    status: [],
    place: "0",
    gamblingWinnings: 0,
    gamblingBanned: false,
    hangman: false,
    created: ts,
    updated: ts,
  };
  const user = { ...defaultUser, ...overrides };
  await db.insert(schema.users).values(user);
  return user;
}

export async function getUser(db: Db, id: string) {
  const { eq } = await import("drizzle-orm");
  const [row] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id));
  return row ?? null;
}

let nextRandoms: number[] = [];
const realRandom = Math.random;

export function seedRandom(values: number[]) {
  nextRandoms = values;
  Math.random = () => {
    if (nextRandoms.length > 0) return nextRandoms.shift()!;
    return realRandom();
  };
}

export function resetRandom() {
  nextRandoms = [];
  Math.random = realRandom;
}
