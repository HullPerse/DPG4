import ActivityService from "./services/activity.service";
import UserService from "./services/user.service";
import LogService from "./services/log.service";
import EconomyService from "./services/economy.service";
import Elysia from "elysia";
import { db } from "@/db/index.db";

const activityService = new ActivityService(db);
const userService = new UserService(db, activityService);
// const gameService = new GameService(db, activityService);
const logService = new LogService(db);
const economyService = new EconomyService(
  db,
  userService,
  activityService,
  logService,
);
// const effectService = new EffectService(
//   db,
//   userService,
//   activityService,
//   gameService,
//   economyService,
//   inventoryLogService,
// );
// const diceService = new DiceService(db, userService);
// const blackjackService = new BlackjackService(db, userService);
// const rocketService = new RocketService(db, userService);
// const pachinkoService = new PachinkoService(db, userService);
// const minesService = new MinesService(db, userService);
// const jackpotService = new JackpotService(db, userService);

const servicesPlugin = new Elysia({ name: "services" })
  .decorate("activityService", activityService)
  .decorate("userService", userService)
  .decorate("economyService", economyService)
  .decorate("logService", logService);
// .decorate("gameService", gameService)
// .decorate("effectService", effectService)
// .decorate("diceService", diceService)
// .decorate("blackjackService", blackjackService)
// .decorate("rocketService", rocketService)
// .decorate("pachinkoService", pachinkoService)
// .decorate("minesService", minesService)
// .decorate("jackpotService", jackpotService);
//
export default servicesPlugin;
