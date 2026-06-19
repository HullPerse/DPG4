import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";

import Logger, { iluhaAscii } from "./lib/logger.utils";
import migrate from "./db/migration.db";
import {
  errorPlugin,
  compressionPlugin,
  databasePlugin,
} from "./plugins/index.plugin";
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
} from "./routes/index.route";
import { registerClient, unregisterClient } from "./lib/websocket.utils";
import { initAutoBackup } from "./lib/autoBackup";

const logger = new Logger("SYSTEM");

migrate();
logger.info("Database migrations applied");

new Elysia()
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
  .use(searchRoute)
  .use(wheelRoute)
  .use(historyRoute)
  .use(hangmanRoute)
  .use(ratStoreRoute)
  .use(petsRoute)
  .use(jackpotRoute)
  .use(questsRoute)
  .use(statsRoute)

  .get("/", () => "DPG SERVER")
  .listen(Bun.env.PORT ?? 2000, (e) => {
    const URL = `http://${e.hostname}:${e.port}`;
    logger.info(iluhaAscii);
    logger.info(`🐀 DPG API -> ${URL}`);
    logger.info(`[Admin] -> ${URL}/admin`);
  });

initAutoBackup();
