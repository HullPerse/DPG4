import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { config } from "./config";
import { dbPlugin } from "./plugins/db.plugin";
import { authRoute } from "./routes/auth.route";
import { usersRoute } from "./routes/users.route";
import { gamesRoute, presetsRoute } from "./routes/games.route";
import {
  itemsRoute,
  inventoryRoute,
  marketRoute,
  tradeRoute,
} from "./routes/items.route";
import { activityRoute } from "./routes/activity.route";
import { chatsRoute } from "./routes/chats.route";
import { adsRoute } from "./routes/ads.route";
import { drawingsRoute } from "./routes/drawings.route";
import { cellsRoute, rulesRoute } from "./routes/cells.route";
import { filesRoute } from "./routes/files.route";
import { gameUtilsRoute } from "./routes/gameUtils.route";
import { steamRoute } from "./routes/steam.route";
import { searchRoute } from "./routes/search.route";
import { adminRoute } from "./routes/admin.route";
import { registerClient, unregisterClient } from "./lib/ws";
import { logger } from "./lib/logger";
import { initAutoBackup } from "./lib/autoBackup";

const app = new Elysia()
  .use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    }),
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: "DPG API",
          version: "2.0.0",
          description: "Локальный API для DPG (Tauri + React)",
        },
        tags: [
          { name: "auth", description: "Вход и регистрация" },
          { name: "users", description: "Игроки" },
          { name: "games", description: "Игры и статусы" },
          { name: "items", description: "Предметы, инвентарь, рынок" },
          { name: "activity", description: "Лента активности" },
          { name: "chats", description: "Чаты" },
          { name: "files", description: "Файлы (BLOB)" },
          { name: "utils", description: "Расчёты на сервере" },
          { name: "steam", description: "Steam API (прокси)" },
          { name: "metadata", description: "HLTB и метаданные" },
          { name: "search", description: "Поиск" },
        ],
      },
      path: "/docs",
      scalarConfig: {
        customCss: [
          ".dark-mode {",
          "  --scalar-background-1: #191724;",
          "  --scalar-background-2: #232136;",
          "  --scalar-background-3: #403d52;",
          "  --scalar-color-1: #e0def4;",
          "  --scalar-color-2: #908caa;",
          "  --scalar-color-3: #6e6a86;",
          "  --scalar-color-accent: #f6c177;",
          "  --scalar-color-green: #9bceb0;",
          "  --scalar-color-red: #eb6f92;",
          "  --scalar-color-yellow: #f6c177;",
          "  --scalar-color-blue: #9ccfd8;",
          "  --scalar-color-orange: #ea9a97;",
          "  --scalar-color-purple: #c4a7e7;",
          "  --scalar-border-color: #393552;",
          "  --scalar-background-accent: #f6c1771f;",
          "  --scalar-sidebar-background-1: #191724;",
          "  --scalar-sidebar-color-1: #e0def4;",
          "  --scalar-sidebar-color-2: #908caa;",
          "  --scalar-sidebar-border-color: #393552;",
          "  --scalar-sidebar-item-hover-background: #232136;",
          "  --scalar-sidebar-item-active-background: #f6c1771f;",
          "  --scalar-sidebar-color-active: #f6c177;",
          "  --scalar-sidebar-search-background: #232136;",
          "  --scalar-sidebar-search-border-color: #393552;",
          "  --scalar-button-1: #f6c177;",
          "  --scalar-button-1-color: #191724;",
          "  --scalar-button-1-hover: #ea9a97;",
          "  --scalar-radius: 0;",
          "  --scalar-radius-lg: 0;",
          "  --scalar-radius-xl: 0;",
          "  --scalar-shadow-1: 2px 2px 0 0 #26233a;",
          "  --scalar-shadow-2: 0 0 0 0.5px var(--scalar-border-color), 4px 4px 0 0 #26233a;",
          "}",
        ].join("\n"),
      },
    }),
  )
  .use(dbPlugin)
  .use(adminRoute)
  .get("/health", () => ({ ok: true }))
  .ws("/ws", {
    open(ws) {
      registerClient(ws);
    },
    close(ws) {
      unregisterClient(ws);
    },
    message() {},
  })
  .use(authRoute)
  .use(usersRoute)
  .use(gamesRoute)
  .use(presetsRoute)
  .use(itemsRoute)
  .use(inventoryRoute)
  .use(marketRoute)
  .use(tradeRoute)
  .use(activityRoute)
  .use(chatsRoute)
  .use(adsRoute)
  .use(drawingsRoute)
  .use(cellsRoute)
  .use(rulesRoute)
  .use(filesRoute)
  .use(gameUtilsRoute)
  .use(steamRoute)
  .use(searchRoute)
  .listen(config.port);

logger.info(
  "SYSTEM",
  `🐀 DPG API -> http://${app.server?.hostname}:${app.server?.port}`,
);
logger.info(null, `Docs -> /docs  |  Admin -> /admin`);

initAutoBackup();

export type App = typeof app;
export default app;
