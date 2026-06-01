import { Elysia } from "elysia";
import { rawDb } from "../db";
import { checkRedis } from "../lib/cache";
import { config } from "../config";
import { getClientCount } from "../lib/ws";

const startTime = Date.now();

function checkDb(): boolean {
  try {
    rawDb.prepare("SELECT 1").get();
    return true;
  } catch {
    return false;
  }
}

const TABLES = [
  "users", "games", "presets", "items", "inventory", "market",
  "activity", "chats", "rules", "ads", "drawings", "cells",
];

function measureTableResponseTimes(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const table of TABLES) {
    const start = performance.now();
    try {
      rawDb.prepare(`SELECT COUNT(*) as c FROM "${table}"`).get();
      result[table] = Math.round((performance.now() - start) * 100) / 100;
    } catch {
      result[table] = -1;
    }
  }
  return result;
}

function measureTableSizes(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const table of TABLES) {
    try {
      const cols = rawDb
        .prepare(`PRAGMA table_info("${table}")`)
        .all() as { name: string }[];
      if (!cols.length) {
        result[table] = 0;
        continue;
      }
      const sumExpr = cols
        .map((c) => `COALESCE(LENGTH(CAST("${c.name}" AS BLOB)), 0)`)
        .join(" + ");
      const row = rawDb
        .prepare(`SELECT SUM(${sumExpr}) AS bytes FROM "${table}"`)
        .get() as { bytes: number | null };
      result[table] = Math.max(0, Number(row?.bytes) || 0);
    } catch {
      result[table] = -1;
    }
  }
  return result;
}

export const sentinelRoute = new Elysia({ prefix: "/api" })
  .get("/sentinel/health", async () => {
    const dbOk = checkDb();
    const mem = process.memoryUsage();
    const redisOk = await checkRedis();
    return {
      ok: dbOk,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
      },
      db: { ok: dbOk, path: config.dbPath },
      redis: redisOk,
      ws: { clients: getClientCount() },
      tableResponseTimes: measureTableResponseTimes(),
      tableSizes: measureTableSizes(),
    };
  });
