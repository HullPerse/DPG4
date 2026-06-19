import * as schema from "../db/schema";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

export interface Migration {
  description: string;
  sql: string[];
}

export type Db = BunSQLiteDatabase<typeof schema>;

export type DbTimestamps = {
  created: string;
  updated: string;
};
