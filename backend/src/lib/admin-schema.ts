export type AdminFieldType =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "json"
  | "objectList"
  | "blob"
  | "audio"
  | "hidden";

export type AdminFieldMeta = {
  source: string;
  type: AdminFieldType;
  hideInList?: boolean;
  /** Columns for objectList editor (default: id, name if present) */
  objectListColumns?: string[];
  reference?: { table: string; labelField: string };
};

export type AdminTableMeta = {
  label: string;
  searchFields: string[];
  fields: AdminFieldMeta[];
};

export const ADMIN_SCHEMA: Record<string, AdminTableMeta> = {
  users: {
    label: "Users",
    searchFields: ["id", "username", "email", "steam"],
    fields: [
      { source: "id", type: "text" },
      { source: "username", type: "text" },
      { source: "email", type: "text" },
      { source: "passwordHash", type: "hidden" },
      { source: "avatar", type: "text" },
      { source: "color", type: "text" },
      { source: "isAdmin", type: "boolean" },
      { source: "position", type: "number" },
      { source: "money", type: "number" },
      { source: "steam", type: "text" },
      { source: "currentAction", type: "text" },
      { source: "currentDice", type: "number" },
      { source: "status", type: "json" },
      { source: "place", type: "text" },
      { source: "created", type: "date", hideInList: true },
      { source: "updated", type: "date", hideInList: true },
    ],
  },
  games: {
    label: "Games",
    searchFields: ["id", "status"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      { source: "status", type: "text" },
      { source: "score", type: "number" },
      { source: "user", type: "json" },
      { source: "data", type: "json" },
      { source: "playtime", type: "json" },
      { source: "review", type: "json" },
      { source: "created", type: "date", hideInList: true },
      { source: "updated", type: "date", hideInList: true },
    ],
  },
  presets: {
    label: "Presets",
    searchFields: ["id", "label"],
    fields: [
      { source: "id", type: "text" },
      { source: "label", type: "text" },
      {
        source: "games",
        type: "objectList",
        objectListColumns: ["id", "name", "image", "steamLink"],
      },
      { source: "created", type: "date", hideInList: true },
      { source: "updated", type: "date", hideInList: true },
    ],
  },
  items: {
    label: "Items",
    searchFields: ["id", "label", "type"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      { source: "type", type: "text" },
      { source: "label", type: "text" },
      { source: "description", type: "text" },
      { source: "charge", type: "number" },
      { source: "rollable", type: "boolean" },
      { source: "status", type: "json" },
      { source: "created", type: "date", hideInList: true },
      { source: "updated", type: "date", hideInList: true },
    ],
  },
  inventory: {
    label: "Inventory",
    searchFields: ["id", "owner", "label", "type"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      { source: "type", type: "text" },
      { source: "owner", type: "text", reference: { table: "users", labelField: "username" } },
      { source: "label", type: "text" },
      { source: "description", type: "text" },
      { source: "charge", type: "number" },
      { source: "created", type: "date", hideInList: true },
      { source: "updated", type: "date", hideInList: true },
    ],
  },
  market: {
    label: "Market",
    searchFields: ["id", "label", "type"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      { source: "type", type: "text" },
      { source: "originalId", type: "text" },
      { source: "label", type: "text" },
      { source: "description", type: "text" },
      { source: "charge", type: "number" },
      { source: "price", type: "number" },
      { source: "discount", type: "number" },
      { source: "owner", type: "json" },
      { source: "created", type: "date", hideInList: true },
      { source: "updated", type: "date", hideInList: true },
    ],
  },
  activity: {
    label: "Activity",
    searchFields: ["id", "author", "text"],
    fields: [
      { source: "id", type: "text" },
      { source: "author", type: "text" },
      { source: "image", type: "text" },
      { source: "type", type: "text" },
      { source: "text", type: "text" },
      { source: "created", type: "date" },
    ],
  },
  chats: {
    label: "Chats",
    searchFields: ["id", "message"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      { source: "message", type: "text" },
      { source: "isRead", type: "boolean" },
      { source: "data", type: "json" },
      { source: "created", type: "date" },
    ],
  },
  rules: {
    label: "Rules",
    searchFields: ["id", "category", "rule"],
    fields: [
      { source: "id", type: "text" },
      { source: "category", type: "text" },
      { source: "rule", type: "text" },
      { source: "created", type: "date", hideInList: true },
      { source: "updated", type: "date", hideInList: true },
    ],
  },
  ads: {
    label: "Ads",
    searchFields: ["id", "text"],
    fields: [
      { source: "image", type: "blob" },
      { source: "audio", type: "audio" },
      { source: "id", type: "text" },
      { source: "text", type: "text" },
      { source: "owner", type: "json" },
      { source: "created", type: "date", hideInList: true },
      { source: "updated", type: "date", hideInList: true },
    ],
  },
  drawings: {
    label: "Drawings",
    searchFields: ["id"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      { source: "author", type: "json" },
      { source: "created", type: "date", hideInList: true },
      { source: "updated", type: "date", hideInList: true },
    ],
  },
  cells: {
    label: "Cells",
    searchFields: ["id", "title", "type", "cellType"],
    fields: [
      { source: "id", type: "text" },
      { source: "type", type: "text" },
      { source: "number", type: "number" },
      { source: "title", type: "text" },
      { source: "cellType", type: "text" },
      { source: "difficulty", type: "text" },
      { source: "ladderTo", type: "number" },
      { source: "snakeTo", type: "number" },
      { source: "conditions", type: "json" },
      { source: "status", type: "json" },
      { source: "captured", type: "json" },
      { source: "created", type: "date", hideInList: true },
      { source: "updated", type: "date", hideInList: true },
    ],
  },
};

export const ADMIN_JSON_FIELDS: Record<string, string[]> = Object.fromEntries(
  Object.entries(ADMIN_SCHEMA).map(([table, meta]) => [
    table,
    meta.fields
      .filter((f) => f.type === "json" || f.type === "objectList")
      .map((f) => f.source),
  ]),
);

export const ADMIN_BLOB_FIELDS: Record<
  string,
  { field: string; mimeField: string }[]
> = {
  games: [{ field: "image", mimeField: "imageMime" }],
  items: [{ field: "image", mimeField: "imageMime" }],
  inventory: [{ field: "image", mimeField: "imageMime" }],
  market: [{ field: "image", mimeField: "imageMime" }],
  chats: [{ field: "image", mimeField: "imageMime" }],
  ads: [
    { field: "image", mimeField: "imageMime" },
    { field: "audio", mimeField: "audioMime" },
  ],
  drawings: [{ field: "image", mimeField: "imageMime" }],
};

export function getAdminSchemaPayload() {
  return { tables: ADMIN_SCHEMA };
}
