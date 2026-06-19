import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { mock } from "bun:test";
import * as schema from "@/db/schema.db";

const testSqlite = new Database(":memory:");
const testDb = drizzle(testSqlite, { schema });

mock.module("@/db/index.db", () => ({
  db: testDb,
  rawDb: testSqlite,
}));
