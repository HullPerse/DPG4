import * as schema from "../db/schema";

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
  cells: schema.cells,
} as const;

export type AdminTableName = keyof typeof ADMIN_TABLES;
export type AdminTable = (typeof ADMIN_TABLES)[AdminTableName];

export function getAdminTable(name: string): AdminTable | undefined {
  if (name in ADMIN_TABLES) {
    return ADMIN_TABLES[name as AdminTableName];
  }
  return undefined;
}

export function adminTableColumn(
  table: AdminTable,
  field: string,
): unknown {
  return (table as unknown as Record<string, unknown>)[field] ?? null;
}
