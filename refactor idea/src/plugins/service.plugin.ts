import Elysia from "elysia";
import { db } from "@/db/index.db";

// import { ActivityService } from "./services/activity.service";
// import { UserService } from "@/services/user.service";
// import { GameService } from "./services/game.service";
// import { EconomyService } from "./services/economy.service";
// import { EffectService } from "./services/items/effect.items";
// import { InventoryLogService } from "./services/inventory-log.service";
// import { DiceService } from "./services/gambling/dice.service";
// import { BlackjackService } from "./services/gambling/blackjack.service";
// import { RocketService } from "./services/gambling/rocket.service";
// import { PachinkoService } from "./services/gambling/pachinko.service";
// import { MinesService } from "./services/gambling/mines.service";
// import { JackpotService } from "./services/gambling/jackpot.service";

// const activityService = new ActivityService(db);
// const userService = new UserService(db, activityService);
// const gameService = new GameService(db, activityService);
// const inventoryLogService = new InventoryLogService(db);
// const economyService = new EconomyService(db, userService, activityService, inventoryLogService);
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

const servicePlugin = new Elysia({ name: "services" });
// .decorate("activityService", activityService)
// .decorate("userService", userService)
// .decorate("gameService", gameService)
// .decorate("economyService", economyService)
// .decorate("effectService", effectService)
// .decorate("inventoryLogService", inventoryLogService)
// .decorate("diceService", diceService)
// .decorate("blackjackService", blackjackService)
// .decorate("rocketService", rocketService)
// .decorate("pachinkoService", pachinkoService)
// .decorate("minesService", minesService)
// .decorate("jackpotService", jackpotService);

export default servicePlugin;
