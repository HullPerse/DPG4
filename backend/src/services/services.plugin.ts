import Elysia from "elysia";
import { db } from "../db";
import { ActivityService } from "./activity.service";
import { UserService } from "./user.service";
import { GameService } from "./game.service";
import { EconomyService } from "./economy.service";
import { EffectService } from "./items/effect.items";
import { DiceService } from "./gambling/dice.service";
import { BlackjackService } from "./gambling/blackjack.service";
import { RocketService } from "./gambling/rocket.service";
import { PachinkoService } from "./gambling/pachinko.service";

const activityService = new ActivityService(db);
const userService = new UserService(db, activityService);
const gameService = new GameService(db, activityService);
const economyService = new EconomyService(db, userService, activityService);
const effectService = new EffectService(db, userService, activityService, gameService, economyService);
const diceService = new DiceService(db, userService);
const blackjackService = new BlackjackService(db, userService);
const rocketService = new RocketService(db, userService);
const pachinkoService = new PachinkoService(db, userService);

export const servicesPlugin = new Elysia({ name: "services" })
  .decorate("activityService", activityService)
  .decorate("userService", userService)
  .decorate("gameService", gameService)
  .decorate("economyService", economyService)
  .decorate("effectService", effectService)
  .decorate("diceService", diceService)
  .decorate("blackjackService", blackjackService)
  .decorate("rocketService", rocketService)
  .decorate("pachinkoService", pachinkoService);
