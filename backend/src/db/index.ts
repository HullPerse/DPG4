import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { config } from "../config";
import * as schema from "./schema";

const sqlite = new Database(config.dbPath, { create: true });

sqlite.run("PRAGMA journal_mode = WAL;");
sqlite.run("PRAGMA foreign_keys = ON;");
sqlite.run("PRAGMA synchronous = NORMAL;");
sqlite.run("PRAGMA cache_size = -64000;");

export const db = drizzle(sqlite, { schema });
export type AppDb = typeof db;
export const rawDb = sqlite;
