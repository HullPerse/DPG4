import * as schema from "../db/schema";

import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";

type Db = BunSQLiteDatabase<typeof schema>;
