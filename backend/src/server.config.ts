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

export const config = {
  get port() { return Number(Bun.env.PORT) || 3000; },
  get jwtSecret() {
    const val = Bun.env.JWT_SECRET;
    if (!val) throw new Error("Missing required JWT_SECRET env var");
    return val;
  },
  get dbPath() { return resolveBackendPath(Bun.env.DB_PATH || "data/db.sqlite"); },
  get corsOrigin() { return parseCorsOrigin(Bun.env.CORS_ORIGIN); },
  get steamApiKey() { return Bun.env.STEAM_API_KEY ?? ""; },
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
