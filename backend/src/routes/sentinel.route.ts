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
    };
  });
