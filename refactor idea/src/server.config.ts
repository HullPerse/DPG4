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

export const config = () => {
  const data = {
    port: Number(Bun.env.PORT) || 3000,
    jwtSecret: () => {
      const token = Bun.env.JWT_SECRET;
      if (!token) throw new Error("Missing required JWT_SECRET env var");
      else return token;
    },
    dbPath: resolveBackendPath(Bun.env.DB_PATH || "data/db.sqlite"),
    corsOrigin: parseCorsOrigin(Bun.env.CORS_ORIGIN),
    steamApiKey: Bun.env.STEAM_API_KEY ?? "",
  };
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
