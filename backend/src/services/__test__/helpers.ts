import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "../../db/schema";
import { UserService } from "@/services/user.service";
import { DiceService } from "../gambling/dice.service";
import { BlackjackService } from "../gambling/blackjack.service";
import { RocketService } from "../gambling/rocket.service";
import { PachinkoService } from "../gambling/pachinko.service";
import { ActivityService } from "../activity.service";
import { newId } from "../../lib/ids";

type Db = BunSQLiteDatabase<typeof schema>;

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

export function createTestDb(): { sqlite: Database; db: Db } {
  const sqlite = new Database(":memory:");
  const db = drizzle(sqlite, { schema });
  sqlite.run(CREATE_USERS);
  sqlite.run(CREATE_ACTIVITY);
  sqlite.run(CREATE_HISTORY);
  return { sqlite, db };
}

export interface TestServices {
  activityService: ActivityService;
  userService: UserService;
  diceService: DiceService;
  blackjackService: BlackjackService;
  rocketService: RocketService;
  pachinkoService: PachinkoService;
}

export function createServices(db: Db): TestServices {
  const activityService = new ActivityService(db);
  const userService = new UserService(db, activityService);
  const diceService = new DiceService(db, userService);
  const blackjackService = new BlackjackService(db, userService);
  const rocketService = new RocketService(db, userService);
  const pachinkoService = new PachinkoService(db, userService);
  return {
    activityService,
    userService,
    diceService,
    blackjackService,
    rocketService,
    pachinkoService,
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
    steam: "",
    currentAction: "MOVE_POSITIVE" as const,
    currentDice: 1,
    status: [],
    place: "0",
    gamblingWinnings: 0,
    gamblingBanned: false,
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
