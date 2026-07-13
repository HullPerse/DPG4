import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";

import Logger, { iluhaAscii } from "./lib/logger.utils";
import { validateConfig } from "./server.config";
import migrate from "./db/migration.db";
import {
  errorPlugin,
  compressionPlugin,
  databasePlugin,
} from "./plugins/index.plugin";
import loggingPlugin from "./plugins/logging.plugin";
import servicesPlugin from "./services.server";
import {
  sentinelRoute,
  authRoute,
  usersRoute,
  gamesRoute,
  presetsRoute,
  itemsRoute,
  inventoryRoute,
  marketRoute,
  tradeRoute,
  hangmanRoute,
  petsRoute,
  jackpotRoute,
  questsRoute,
  statsRoute,
  ratStoreRoute,
  activityRoute,
  chatsRoute,
  adsRoute,
  drawingsRoute,
  cellsRoute,
  filesRoute,
  gameUtilsRoute,
  ticketsRoute,
  ticketMarketRoute,
  configRoute,
  steamRoute,
  searchRoute,
  wheelRoute,
  historyRoute,
  adminRoute,
  hltbRoute,
  batchRoute,
  rulesRoute,
} from "./routes/index.route";
import { registerClient, unregisterClient } from "./lib/websocket.utils";
import { initAutoBackup } from "./lib/backup.utils";
import { initJobQueue } from "./lib/queue.utils";

const logger = new Logger("SYSTEM");

const configErrors = validateConfig();
if (configErrors.length > 0) {
  logger.error("Configuration errors:");
  for (const err of configErrors) {
    logger.error(`  ✗ ${err}`);
  }
  process.exit(1);
}

migrate();
initJobQueue();
logger.info("Database migrations applied");

new Elysia()
  .use(
    swagger({
      path: "/api/docs",
      documentation: {
        info: { title: "DPG API", version: "1.0.0" },
      },
    }),
  )
  .get("/health", () => ({ ok: true }))
  .ws("/ws", {
    open(ws) {
      registerClient(ws);
    },
    close(ws) {
      unregisterClient(ws);
    },
  })
  .use(
    cors({
      origin: Bun.env.CORS_ORIGIN,
      credentials: true,
    }),
  )
  .use(errorPlugin)
  .use(compressionPlugin)
  .use(loggingPlugin)
  .use(databasePlugin)
  .use(servicesPlugin)
  .use(sentinelRoute)
  .use(adminRoute)
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
  .use(filesRoute)
  .use(gameUtilsRoute)
  .use(ticketsRoute)
  .use(ticketMarketRoute)
  .use(configRoute)
  .use(steamRoute)
  .use(hltbRoute)
  .use(batchRoute)
  .use(searchRoute)
  .use(wheelRoute)
  .use(historyRoute)
  .use(hangmanRoute)
  .use(ratStoreRoute)
  .use(petsRoute)
  .use(jackpotRoute)
  .use(questsRoute)
  .use(statsRoute)
  .use(rulesRoute)

  .get("/", () => "DPG SERVER")
  .listen(Bun.env.PORT ?? 200, (e) => {
    const URL = `http://${e.hostname}:${e.port}`;
    logger.info(iluhaAscii);
    logger.info(`🐀 DPG API -> ${URL}`);
    logger.info(`[Admin] -> ${URL}/admin`);
  });

const shutdown = async () => {
  logger.info("Shutting down gracefully...");
  const { rawDb } = await import("@/db/index.db");
  try {
    rawDb.run("PRAGMA optimize;");
  } catch {}
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

initAutoBackup();
