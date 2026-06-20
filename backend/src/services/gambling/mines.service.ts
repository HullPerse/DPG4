import { eq } from "drizzle-orm";
import * as schema from "@/db/schema.db";
import { nowIso, newId } from "@/lib/index.utils";
import { ActiveMinesGame, MinesRevealResult, MinesDevOverrides } from "@/types/gambling";
import { Db } from "@/types/server";
import UserService from "@/services/user.service";
import EconomyService from "@/services/economy.service";
import {
  GAMBLING_BAN_THRESHOLD,
  GAMBLING_MIN_BET,
  GAMBLING_MAX_BET,
} from "@/lib/gambling.constants";
import Logger from "@/lib/logger.utils";

const GRID = 5;
const HOUSE_EDGE = 0.97;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateGrid(mineCount: number): boolean[][] {
  const positions = Array.from({ length: GRID * GRID }, (_, i) => i);
  const minePositions = new Set(shuffleArray(positions).slice(0, mineCount));
  const grid: boolean[][] = [];
  for (let r = 0; r < GRID; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < GRID; c++) row.push(minePositions.has(r * GRID + c));
    grid.push(row);
  }
  return grid;
}

function emptyGrid(): boolean[][] {
  return Array.from({ length: GRID }, () => Array(GRID).fill(false));
}

function computeMultiplier(mineCount: number, revealedCount: number): number {
  if (revealedCount === 0) return 1;
  let prob = 1;
  for (let i = 0; i < revealedCount; i++)
    prob *= (GRID * GRID - mineCount - i) / (GRID * GRID - i);
  return Math.max(1, Math.floor((HOUSE_EDGE / prob) * 100) / 100);
}

function getMinePositions(grid: boolean[][]): [number, number][] {
  const positions: [number, number][] = [];
  for (let r = 0; r < GRID; r++)
    for (let c = 0; c < GRID; c++) if (grid[r][c]) positions.push([r, c]);
  return positions;
}

export default class MinesService {
  private games = new Map<string, ActiveMinesGame>();
  private logger = new Logger("MINES");

  constructor(
    private db: Db,
    private userService: UserService,
    private economyService: EconomyService,
  ) {}

  async start(
    userId: string,
    bid: number,
    mineCount: number,
    devMode?: boolean,
    devOverrides?: MinesDevOverrides,
  ): Promise<MinesRevealResult> {
    if (!devMode) {
      if (
        bid < GAMBLING_MIN_BET ||
        bid > GAMBLING_MAX_BET ||
        !Number.isInteger(bid)
      )
        throw new Error("Invalid bid");
      if (!Number.isInteger(mineCount) || mineCount < 1 || mineCount > 10)
        throw new Error("Invalid mine count");
      if (this.games.has(userId)) throw new Error("Game already in progress");
      const user = await this.userService.getById(userId);
      if (!user) throw new Error("User not found");
      if (user.tickets < bid) throw new Error("Insufficient balance");
      if (user.gamblingBanned) throw new Error("Banned from gambling");
      await this.economyService.deductTickets(userId, bid);
    }

    const grid = generateGrid(mineCount);
    const game: ActiveMinesGame = {
      userId,
      bid,
      mineCount,
      grid,
      revealed: emptyGrid(),
      revealedCount: 0,
      phase: "playing",
    };
    this.games.set(userId, game);

    return {
      phase: "playing",
      x: -1,
      y: -1,
      isMine: false,
      currentMultiplier: 1,
      revealed: game.revealed,
      ...(devOverrides?.devShowMines
        ? { minePositions: getMinePositions(game.grid) }
        : {}),
      payout: 0,
      net: 0,
      label: "",
      tone: "",
      balance: 0,
      banned: false,
    };
  }

  async reveal(
    userId: string,
    x: number,
    y: number,
    devMode?: boolean,
    devOverrides?: MinesDevOverrides,
  ): Promise<MinesRevealResult> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "playing") throw new Error("No active game");
    if (x < 0 || x >= GRID || y < 0 || y >= GRID)
      throw new Error("Invalid tile");
    if (game.revealed[x][y]) throw new Error("Tile already revealed");

    game.revealed[x][y] = true;
    game.revealedCount += 1;
    const hitMine = game.grid[x][y] && !devOverrides?.devForceAllSafe;

    if (hitMine) {
      game.phase = "lost";
      this.games.delete(userId);
      const user = devMode ? null : await this.userService.getById(userId);
      if (!devMode && user) {
        await this.db.insert(schema.history).values({
          id: newId(),
          userId,
          owner: { id: user.id, username: user.username },
          type: "mines",
          label: `Мина! -${game.bid}`,
          image: "",
          bid: game.bid,
          payout: 0,
          net: -game.bid,
          data: {
            mineCount: game.mineCount,
            revealedCount: game.revealedCount,
            phase: "lost",
          },
          created: nowIso(),
        });
      }
      this.logger.info(`lose bid:${game.bid} mines:${game.mineCount}`);
      return {
        phase: "lost",
        x,
        y,
        isMine: true,
        currentMultiplier: 0,
        revealed: game.revealed,
        minePositions: getMinePositions(game.grid),
        payout: 0,
        net: -game.bid,
        label: `Мина! Проигрыш -${game.bid}`,
        tone: "lose",
        balance: user?.tickets ?? 0,
        banned: user?.gamblingBanned ?? false,
      };
    }

    const mult = computeMultiplier(game.mineCount, game.revealedCount);
    const user = devMode ? null : await this.userService.getById(userId);
    return {
      phase: "playing",
      x,
      y,
      isMine: false,
      currentMultiplier: mult,
      revealed: game.revealed,
      ...(devOverrides?.devShowMines
        ? { minePositions: getMinePositions(game.grid) }
        : {}),
      payout: 0,
      net: 0,
      label: "",
      tone: "chance",
      balance: user?.tickets ?? 0,
      banned: false,
    };
  }

  async cashout(userId: string, devMode?: boolean): Promise<MinesRevealResult> {
    const game = this.games.get(userId);
    if (!game || game.phase !== "playing") throw new Error("No active game");

    const mult = computeMultiplier(game.mineCount, game.revealedCount);
    const payout = Math.floor(game.bid * mult);
    const net = payout - game.bid;

    if (!devMode) await this.economyService.addTickets(userId, payout);

    game.phase = "won";
    this.games.delete(userId);

    const user = devMode ? null : await this.userService.getById(userId);
    let gamblingWinnings = (user?.gamblingWinnings ?? 0) + Math.max(0, net);
    let gamblingBanned = user?.gamblingBanned ?? false;
    if (
      !devMode &&
      gamblingWinnings >= GAMBLING_BAN_THRESHOLD &&
      !gamblingBanned
    )
      gamblingBanned = true;
    if (!devMode)
      await this.db
        .update(schema.users)
        .set({ gamblingWinnings, gamblingBanned, updated: nowIso() })
        .where(eq(schema.users.id, userId));

    if (!devMode && user) {
      await this.db.insert(schema.history).values({
        id: newId(),
        userId,
        owner: { id: user.id, username: user.username },
        type: "mines",
        label: `Выигрыш ${mult.toFixed(2)}x +${net}`,
        image: "",
        bid: game.bid,
        payout,
        net,
        data: {
          mineCount: game.mineCount,
          revealedCount: game.revealedCount,
          multiplier: mult,
          phase: "won",
        },
        created: nowIso(),
      });
    }

    const tone =
      net >= game.bid * 5 ? "jackpot" : net >= game.bid * 2 ? "win" : "chance";
    this.logger.info(`cashout mult:${mult}x net:${net}`);
    return {
      phase: "won",
      x: -1,
      y: -1,
      isMine: false,
      currentMultiplier: mult,
      revealed: game.revealed,
      minePositions: getMinePositions(game.grid),
      payout,
      net,
      label: `Выигрыш ${mult.toFixed(2)}x +${net}`,
      tone,
      balance: user?.tickets ?? 0,
      banned: gamblingBanned,
    };
  }

  abort(userId: string): void {
    this.games.delete(userId);
  }
  getState(userId: string): ActiveMinesGame | undefined {
    return this.games.get(userId);
  }
}
