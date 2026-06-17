import { resolveBackendPath } from "./lib/paths";

function parseCorsOrigin(
  value: string | undefined,
): boolean | string | string[] {
  if (value === undefined || value === "") return true;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "*") return true;
  if (normalized === "false") return false;

  if (value.includes(",")) {
    return value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return value.trim();
}

function requiredEnv(name: string, fallback?: string): string {
  const val = Bun.env[name] || fallback;
  if (!val) {
    throw new Error(
      `Missing required environment variable: ${name}. Check .env file.`,
    );
  }
  return val;
}

export const config = {
  port: Number(Bun.env.PORT) || 3000,
  jwtSecret: requiredEnv("JWT_SECRET", "dpg-local-jwt"),
  dbPath: resolveBackendPath(Bun.env.DB_PATH || "data/db.sqlite"),
  corsOrigin: parseCorsOrigin(Bun.env.CORS_ORIGIN),
  steamApiKey: Bun.env.STEAM_API_KEY ?? "",
};

export const COLLECTION_IDS: Record<string, string> = {
  users: "users",
  games: "games",
  presets: "presets",
  items: "items",
  inventory: "inventory",
  market: "market",
  activity: "activity",
  chats: "chats",
  rules: "rules",
  ads: "ads",
  drawings: "drawings",
  cells: "cells",
  quests: "quests",
};
