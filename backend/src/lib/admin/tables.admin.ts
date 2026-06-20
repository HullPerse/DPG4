import * as schema from "@/db/schema.db";
import type { AdminTableName, AdminTable } from "@/types/admin";

export const ADMIN_TABLES = {
  users: schema.users,
  games: schema.games,
  presets: schema.presets,
  items: schema.items,
  inventory: schema.inventory,
  market: schema.market,
  activity: schema.activity,
  chats: schema.chats,
  rules: schema.rules,
  ads: schema.ads,
  drawings: schema.drawings,
  history: schema.history,
  cells: schema.cells,
  hangman: schema.hangman,
  pets: schema.pets,
  jackpot: schema.jackpot,
  inventoryLog: schema.inventoryLog,
  quests: schema.quests,
} as const;

export function getAdminTable(name: string): AdminTable | undefined {
  if (name in ADMIN_TABLES) {
    return ADMIN_TABLES[name as AdminTableName];
  }
  return undefined;
}

export function adminTableColumn(table: AdminTable, field: string): unknown {
  return (table as unknown as Record<string, unknown>)[field] ?? null;
}
