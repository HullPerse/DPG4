import { resolveBackendPath } from "@/lib/path.utils";

function parseCorsOrigin(
  value: string | undefined,
): boolean | string | string[] {
  if (value === undefined || value === "") return true;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "*") return true;
  if (normalized === "false") return false;

  const trimmedValue = value.includes(",");

  if (!trimmedValue) return value.trim();

  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export const config = {
  get port() { return Number(Bun.env.PORT) || 3000; },
  get jwtSecret() {
    const val = Bun.env.JWT_SECRET;
    if (!val) throw new Error("Missing required JWT_SECRET env var");
    return val;
  },
  get dbPath() {
    if (!this._dbPath) this._dbPath = resolveBackendPath(Bun.env.DB_PATH || "data/db.sqlite")
    return this._dbPath
  },
  get corsOrigin() { return parseCorsOrigin(Bun.env.CORS_ORIGIN); },
  get steamApiKey() { return Bun.env.STEAM_API_KEY ?? ""; },
  _dbPath: undefined as string | undefined,
};

export function validateConfig(): string[] {
  const errors: string[] = [];

  if (!Bun.env.JWT_SECRET) errors.push("JWT_SECRET is required");
  if (Bun.env.PORT && isNaN(Number(Bun.env.PORT))) errors.push("PORT must be a number");
  if (Bun.env.DB_CACHE_SIZE && isNaN(Number(Bun.env.DB_CACHE_SIZE))) errors.push("DB_CACHE_SIZE must be a number");
  if (Bun.env.DB_MMAP_SIZE && isNaN(Number(Bun.env.DB_MMAP_SIZE))) errors.push("DB_MMAP_SIZE must be a number");

  return errors;
}

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
