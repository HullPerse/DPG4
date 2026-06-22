import Elysia from "elysia";
import { db } from "@/db/index.db";
import ActivityService from "@/services/activity.service";
import UserService from "@/services/user.service";
import LogService from "@/services/log.service";
import EconomyService from "@/services/economy.service";
import GameService from "@/services/game.service";
import EffectService from "@/services/effect.service";
import DiceService from "@/services/gambling/dice.service";
import BlackjackService from "@/services/gambling/blackjack.service";
import RocketService from "@/services/gambling/rocket.service";
import PachinkoService from "@/services/gambling/pachinko.service";
import MinesService from "@/services/gambling/mines.service";
import JackpotService from "@/services/gambling/jackpot.service";

function createServices() {
  const activityService = new ActivityService(db);
  const userService = new UserService(db, activityService);
  const gameService = new GameService(db, activityService);
  const logService = new LogService(db);
  const economyService = new EconomyService(
    db,
    userService,
    activityService,
    logService,
  );
  const effectService = new EffectService(
    db,
    userService,
    activityService,
    gameService,
    economyService,
    logService,
  );
  const diceService = new DiceService(db, userService, economyService);
  const blackjackService = new BlackjackService(
    db,
    userService,
    economyService,
  );
  const rocketService = new RocketService(db, userService, economyService);
  const pachinkoService = new PachinkoService(db, userService, economyService);
  const minesService = new MinesService(db, userService, economyService);
  const jackpotService = new JackpotService(db);
  return {
    activityService,
    userService,
    gameService,
    logService,
    economyService,
    effectService,
    diceService,
    blackjackService,
    rocketService,
    pachinkoService,
    minesService,
    jackpotService,
  };
}

let services: ReturnType<typeof createServices> | null = null;

const getService = () => {
  if (!services) return (services = createServices());
  else return services;
};
const service = getService();

const servicesPlugin = new Elysia({ name: "services" })
  .decorate("activityService", service.activityService)
  .decorate("userService", service.userService)
  .decorate("gameService", service.gameService)
  .decorate("economyService", service.economyService)
  .decorate("effectService", service.effectService)
  .decorate("logService", service.logService)
  .decorate("diceService", service.diceService)
  .decorate("blackjackService", service.blackjackService)
  .decorate("rocketService", service.rocketService)
  .decorate("pachinkoService", service.pachinkoService)
  .decorate("minesService", service.minesService)
  .decorate("jackpotService", service.jackpotService);

export default servicesPlugin;
