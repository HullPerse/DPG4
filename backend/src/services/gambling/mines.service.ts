import type { ActiveMinesGame, MinesRevealResult, MinesDevOverrides } from "@/types/gambling";
import type { Db } from "@/types/server";
import UserService from "@/services/user.service";
import EconomyService from "@/services/economy.service";
import { GAMBLING_MIN_BET, GAMBLING_MAX_BET } from "@/lib/gambling.constants";
import Logger from "@/lib/logger.utils";
import { processPayout, recordHistory } from "@/lib/gambling/payout.utils";
import { loadSession, saveSession, closeSession } from "@/lib/gambling/session.utils";

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
      const existing = await loadSession(this.db, userId, "mines");
      if (existing) throw new Error("Game already in progress");
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
    await saveSession(this.db, userId, "mines", game as unknown as Record<string, unknown>, bid);

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
    const session = await loadSession(this.db, userId, "mines");
    if (!session) throw new Error("No active game");
    const game = session.state as unknown as ActiveMinesGame;
    if (game.phase !== "playing") throw new Error("No active game");
    if (x < 0 || x >= GRID || y < 0 || y >= GRID)
      throw new Error("Invalid tile");
    if (game.revealed[x][y]) throw new Error("Tile already revealed");

    game.revealed[x][y] = true;
    game.revealedCount += 1;
    const hitMine = game.grid[x][y] && !devOverrides?.devForceAllSafe;

    if (hitMine) {
      game.phase = "lost";
      await closeSession(this.db, userId, "mines");

      let balance = 0;
      let banned = false;
      if (!devMode) {
        const result = await processPayout(this.db, this.economyService, userId, game.bid, 0);
        balance = result.balance;
        banned = result.banned;
        await recordHistory(this.db, userId, "mines", `Мина! -${game.bid}`, "",
          game.bid, 0, -game.bid,
          { mineCount: game.mineCount, revealedCount: game.revealedCount, phase: "lost" });
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
        balance,
        banned,
      };
    }

    await saveSession(this.db, userId, "mines", game as unknown as Record<string, unknown>, game.bid);

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
    const session = await loadSession(this.db, userId, "mines");
    if (!session) throw new Error("No active game");
    const game = session.state as unknown as ActiveMinesGame;
    if (game.phase !== "playing") throw new Error("No active game");

    const mult = computeMultiplier(game.mineCount, game.revealedCount);
    const payout = Math.floor(game.bid * mult);
    const net = payout - game.bid;

    game.phase = "won";
    await closeSession(this.db, userId, "mines");

    let balance = 0;
    let banned = false;
    if (!devMode) {
      const result = await processPayout(this.db, this.economyService, userId, game.bid, payout);
      balance = result.balance;
      banned = result.banned;
      await recordHistory(this.db, userId, "mines", `Выигрыш ${mult.toFixed(2)}x +${net}`, "",
        game.bid, payout, net,
        { mineCount: game.mineCount, revealedCount: game.revealedCount, multiplier: mult, phase: "won" });
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
      balance,
      banned,
    };
  }

  async abort(userId: string): Promise<void> {
    await closeSession(this.db, userId, "mines");
  }
  async getState(userId: string): Promise<ActiveMinesGame | undefined> {
    const session = await loadSession(this.db, userId, "mines");
    return session ? (session.state as unknown as ActiveMinesGame) : undefined;
  }
}
