import type { AdminChoice, AdminTableMeta } from "../types/admin";

const ITEM_TYPES: AdminChoice[] = [
  { value: "effect", label: "effect" },
  { value: "item", label: "item" },
  { value: "roll", label: "roll" },
  { value: "other", label: "other" },
  { value: "rat", label: "rat" },
];

const GAME_STATUS: AdminChoice[] = [
  { value: "PLAYING", label: "PLAYING" },
  { value: "COMPLETED", label: "COMPLETED" },
  { value: "DROPPED", label: "DROPPED" },
  { value: "REROLLED", label: "REROLLED" },
];

const CELL_TYPES: AdminChoice[] = [
  { value: "start", label: "start" },
  { value: "finish", label: "finish" },
  { value: "grid", label: "grid" },
];

const CELL_CELL_TYPES: AdminChoice[] = [
  { value: "Игра" },
  { value: "Пресет" },
  { value: "Стим" },
  { value: "Просмотр" },
];

const CELL_DIFFICULTY: AdminChoice[] = [
  { value: "Лёгкий" },
  { value: "Средний" },
  { value: "Сложноватый" },
  { value: "Сложный" },
  { value: "Адский" },
  { value: "Сердце" },
];

const ACTIVITY_TYPES: AdminChoice[] = [
  { value: "image" },
  { value: "emoji" },
  { value: "chat" },
];

const USER_ACTIONS: AdminChoice[] = [
  { value: "MOVE_POSITIVE", label: "MOVE_POSITIVE" },
  { value: "MOVE_NEGATIVE", label: "MOVE_NEGATIVE" },
  { value: "GAMEADD", label: "GAMEADD" },
  { value: "GAMEFINISH", label: "GAMEFINISH" },
];

const RULES_CATEGORIES: AdminChoice[] = [
  { value: "ОСНОВНАЯ СПРАВКА" },
  { value: "УСЛОВИЯ РЕРОЛЛА" },
  { value: "УСЛОВИЯ ПРОХОЖДЕНИЯ" },
  { value: "ПРАВИЛА ХОДА" },
  { value: "КАРТА" },
  { value: "ВЫБОР СЛОЖНОСТИ" },
];

const INVENTORY_LOG_ACTIONS: AdminChoice[] = [
  { value: "receive", label: "receive" },
  { value: "send", label: "send" },
  { value: "sell", label: "sell" },
  { value: "buy", label: "buy" },
  { value: "use", label: "use" },
  { value: "delete", label: "delete" },
  { value: "grant", label: "grant" },
  { value: "trade_out", label: "trade_out" },
  { value: "trade_in", label: "trade_in" },
  { value: "market_list", label: "market_list" },
  { value: "market_unlist", label: "market_unlist" },
  { value: "charge_change", label: "charge_change" },
];

export const ADMIN_SCHEMA: Record<string, AdminTableMeta> = {
  users: {
    label: "Users",
    searchFields: ["id", "username", "email", "steam"],
    fields: [
      { source: "id", type: "text" },
      { source: "username", type: "text" },
      { source: "email", type: "text" },
      {
        source: "password",
        type: "password",
        hideInList: true,
      },
      { source: "passwordHash", type: "hidden" },
      { source: "avatar", type: "text" },
      { source: "color", type: "text" },
      { source: "isAdmin", type: "boolean" },
      { source: "position", type: "number" },
      { source: "money", type: "number" },
      { source: "gamblingWinnings", type: "number" },
      { source: "gamblingBanned", type: "boolean" },
      { source: "hangman", type: "boolean" },
      { source: "steam", type: "text" },
      { source: "currentAction", type: "select", choices: USER_ACTIONS },
      { source: "currentDice", type: "number" },
      { source: "status", type: "stringList" },
      { source: "place", type: "text" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  games: {
    label: "Games",
    searchFields: ["id", "status"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      {
        source: "userId",
        type: "text",
        reference: { table: "users", labelField: "username" },
      },
      { source: "status", type: "select", choices: GAME_STATUS },
      { source: "score", type: "number" },
      { source: "user", type: "json" },
      { source: "data", type: "json" },
      { source: "playtime", type: "json" },
      { source: "review", type: "json" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
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
        columns: {
          id: { kind: "number" },
          name: { kind: "text" },
          image: { kind: "text" },
          steamLink: { kind: "text" },
        },
      },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  items: {
    label: "Items",
    searchFields: ["id", "label", "type"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      { source: "type", type: "select", choices: ITEM_TYPES },
      { source: "label", type: "text" },
      { source: "description", type: "text" },
      { source: "charge", type: "number" },
      { source: "rollable", type: "boolean" },
      { source: "status", type: "stringList" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  inventory: {
    label: "Inventory",
    searchFields: ["id", "owner", "label", "type"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      { source: "type", type: "select", choices: ITEM_TYPES },
      {
        source: "owner",
        type: "text",
        reference: { table: "users", labelField: "username" },
      },
      { source: "label", type: "text" },
      { source: "description", type: "text" },
      { source: "charge", type: "number" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  market: {
    label: "Market",
    searchFields: ["id", "label", "type"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      { source: "type", type: "select", choices: ITEM_TYPES },
      { source: "originalId", type: "text" },
      { source: "label", type: "text" },
      { source: "description", type: "text" },
      { source: "charge", type: "number" },
      { source: "price", type: "number" },
      { source: "discount", type: "number" },
      { source: "owner", type: "json" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  activity: {
    label: "Activity",
    searchFields: ["id", "author", "text"],
    fields: [
      { source: "id", type: "text" },
      { source: "author", type: "text" },
      { source: "image", type: "text" },
      { source: "type", type: "select", choices: ACTIVITY_TYPES },
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
      { source: "category", type: "select", choices: RULES_CATEGORIES },
      { source: "rule", type: "text" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
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
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  drawings: {
    label: "Drawings",
    searchFields: ["id"],
    fields: [
      { source: "image", type: "blob" },
      { source: "id", type: "text" },
      { source: "author", type: "json" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  hangman: {
    label: "Hangman",
    searchFields: ["id", "userId", "word"],
    fields: [
      { source: "id", type: "text" },
      {
        source: "userId",
        type: "text",
        reference: { table: "users", labelField: "username" },
      },
      { source: "word", type: "text" },
      {
        source: "state",
        type: "select",
        choices: [{ value: "current" }, { value: "won" }, { value: "lost" }],
      },
      { source: "guessedLetters", type: "stringList" },
      { source: "wrongLetters", type: "stringList" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  history: {
    label: "History",
    searchFields: ["id", "type", "label"],
    fields: [
      { source: "id", type: "text" },
      { source: "owner", type: "json" },
      { source: "type", type: "text" },
      { source: "label", type: "text" },
      { source: "image", type: "text" },
      { source: "bid", type: "number" },
      { source: "payout", type: "number" },
      { source: "net", type: "number" },
      { source: "data", type: "json" },
      { source: "created", type: "date" },
    ],
  },
  pets: {
    label: "Pets",
    searchFields: ["id", "userId"],
    fields: [
      { source: "id", type: "text" },
      {
        source: "userId",
        type: "text",
        reference: { table: "users", labelField: "username" },
      },
      { source: "hunger", type: "number" },
      { source: "happiness", type: "number" },
      { source: "energy", type: "number" },
      { source: "isAlive", type: "boolean" },
      { source: "lastUpdated", type: "date" },
      { source: "lastRewardDate", type: "date" },
      { source: "kvasBuff", type: "boolean" },
      { source: "lastSearchDate", type: "date" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  jackpot: {
    label: "Jackpot",
    searchFields: ["id", "lastWinnerId", "lastWinnerUsername"],
    fields: [
      { source: "id", type: "text" },
      { source: "pool", type: "number" },
      { source: "winningNumber", type: "number" },
      { source: "winningNumberDate", type: "date" },
      {
        source: "lastWinnerId",
        type: "text",
        reference: { table: "users", labelField: "username" },
      },
      { source: "lastWinnerUsername", type: "text" },
      { source: "lastWinAmount", type: "number" },
      { source: "lastWinDate", type: "date" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  inventoryLog: {
    label: "Inventory Log",
    searchFields: ["id", "inventoryId", "itemLabel", "owner", "action"],
    fields: [
      { source: "id", type: "text" },
      { source: "inventoryId", type: "text" },
      { source: "itemLabel", type: "text" },
      { source: "itemType", type: "text" },
      {
        source: "owner",
        type: "text",
        reference: { table: "users", labelField: "username" },
      },
      { source: "action", type: "select", choices: INVENTORY_LOG_ACTIONS },
      { source: "actor", type: "text" },
      { source: "details", type: "json" },
      { source: "created", type: "date" },
    ],
  },
  quests: {
    label: "Quests",
    searchFields: ["id", "label"],
    fields: [
      { source: "id", type: "text" },
      { source: "label", type: "text" },
      { source: "description", type: "text" },
      { source: "reward", type: "json" },
      { source: "claimed", type: "stringList" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
  cells: {
    label: "Cells",
    searchFields: ["id", "title", "type", "cellType"],
    fields: [
      { source: "id", type: "text" },
      { source: "type", type: "select", choices: CELL_TYPES },
      { source: "number", type: "number" },
      { source: "title", type: "text" },
      { source: "cellType", type: "select", choices: CELL_CELL_TYPES },
      { source: "difficulty", type: "select", choices: CELL_DIFFICULTY },
      { source: "ladderTo", type: "number" },
      { source: "snakeTo", type: "number" },
      { source: "conditions", type: "json" },
      { source: "status", type: "stringList" },
      { source: "captured", type: "stringList" },
      { source: "created", type: "date" },
      { source: "updated", type: "date" },
    ],
  },
};

export const ADMIN_JSON_FIELDS: Record<string, string[]> = Object.fromEntries(
  Object.entries(ADMIN_SCHEMA).map(([table, meta]) => [
    table,
    meta.fields
      .filter(
        (f) =>
          f.type === "json" ||
          f.type === "objectList" ||
          f.type === "stringList",
      )
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
