import { eq } from "drizzle-orm";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import * as schema from "../db/schema";
import { getUserById, scoreUser } from "./user.service";
import { logger } from "../lib/logger";
import { nowIso } from "../lib/dates";

type Db = BunSQLiteDatabase<typeof schema>;

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  suit: Suit;
  rank: Rank;
}

interface ActiveGame {
  userId: string;
  bid: number;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  phase: "player" | "ended";
}

export interface BlackjackResult {
  outcome: "blackjack" | "win" | "lose" | "push";
  payout: number;
  net: number;
  label: string;
  tone: "jackpot" | "win" | "lose" | "chance";
  banned: boolean;
}

export interface BlackjackState {
  phase: "player" | "ended";
  playerHand: Card[];
  dealerHand: Card[];
  dealerHoleHidden: boolean;
  playerValue: number;
  dealerValue: number | null;
  bid: number;
  balance: number;
  result: BlackjackResult | null;
}

const games = new Map<string, ActiveGame>();

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

function createShoe(decks = 6): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ suit, rank });
      }
    }
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function draw(game: ActiveGame): Card {
  if (game.deck.length < 20) {
    game.deck = createShoe();
  }
  const card = game.deck.pop();
  if (!card) throw new Error("Deck empty");
  return card;
}

function rankValue(rank: Rank): number {
  if (rank === "A") return 11;
  if (rank === "K" || rank === "Q" || rank === "J") return 10;
  return Number(rank);
}

export function handValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") aces++;
    total += rankValue(card.rank);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

function isPeekCard(card: Card): boolean {
  return (
    card.rank === "A" ||
    card.rank === "10" ||
    card.rank === "J" ||
    card.rank === "Q" ||
    card.rank === "K"
  );
}

function blackjackPayout(bid: number): number {
  return Math.floor(bid * 2.5);
}

async function applyGamblingPayout(
  db: Db,
  userId: string,
  bid: number,
  payout: number,
): Promise<{ banned: boolean; balance: number }> {
  const user = await getUserById(db, userId);
  if (!user) throw new Error("User not found");

  let gamblingWinnings = user.gamblingWinnings ?? 0;
  let gamblingBanned = user.gamblingBanned ?? false;

  if (payout > 0) {
    gamblingWinnings += payout;
    if (gamblingWinnings >= 30 && !gamblingBanned) {
      gamblingBanned = true;
    }
    await scoreUser(db, userId, payout);
  }

  await db
    .update(schema.users)
    .set({
      gamblingWinnings,
      gamblingBanned,
      updated: nowIso(),
    })
    .where(eq(schema.users.id, userId));

  const updated = await getUserById(db, userId);
  return { banned: gamblingBanned, balance: updated?.money ?? 0 };
}

function resolveLabels(
  outcome: BlackjackResult["outcome"],
  playerValue: number,
  dealerValue: number,
): { label: string; tone: BlackjackResult["tone"] } {
  switch (outcome) {
    case "blackjack":
      return { label: "Блэкджек!", tone: "jackpot" };
    case "win":
      return { label: `Победа ${playerValue} — ${dealerValue}`, tone: "win" };
    case "push":
      return { label: `Ничья ${playerValue} — ${dealerValue}`, tone: "chance" };
    case "lose":
      return { label: `Проигрыш ${playerValue} — ${dealerValue}`, tone: "lose" };
  }
}

function computeOutcome(game: ActiveGame): {
  payout: number;
  outcome: BlackjackResult["outcome"];
} {
  const pv = handValue(game.playerHand);
  const dv = handValue(game.dealerHand);
  const playerBj = isBlackjack(game.playerHand);
  const dealerBj = isBlackjack(game.dealerHand);

  if (playerBj && dealerBj) {
    return { payout: game.bid, outcome: "push" };
  }
  if (playerBj) {
    return { payout: blackjackPayout(game.bid), outcome: "blackjack" };
  }
  if (dealerBj) {
    return { payout: 0, outcome: "lose" };
  }
  if (pv > 21) {
    return { payout: 0, outcome: "lose" };
  }
  if (dv > 21) {
    return { payout: game.bid * 2, outcome: "win" };
  }
  if (pv > dv) {
    return { payout: game.bid * 2, outcome: "win" };
  }
  if (pv < dv) {
    return { payout: 0, outcome: "lose" };
  }
  return { payout: game.bid, outcome: "push" };
}

async function finishGame(
  db: Db,
  game: ActiveGame,
): Promise<BlackjackState> {
  game.phase = "ended";

  const { payout, outcome } = computeOutcome(game);
  const pv = handValue(game.playerHand);
  const dv = handValue(game.dealerHand);
  const { label, tone } = resolveLabels(outcome, pv, dv);

  const { banned, balance } = await applyGamblingPayout(
    db,
    game.userId,
    game.bid,
    payout,
  );

  games.delete(game.userId);

  const user = await getUserById(db, game.userId);
  logger.info(
    user?.username,
    "blackjack",
    outcome,
    `net:${-game.bid + payout}`,
  );

  return toState(game, balance, {
    outcome,
    payout,
    net: -game.bid + payout,
    label,
    tone,
    banned,
  });
}

function dealerPlay(game: ActiveGame) {
  while (handValue(game.dealerHand) < 17) {
    game.dealerHand.push(draw(game));
  }
}

function toState(
  game: ActiveGame,
  balance: number,
  result: BlackjackResult | null = null,
): BlackjackState {
  const ended = game.phase === "ended";
  return {
    phase: game.phase,
    playerHand: [...game.playerHand],
    dealerHand: ended
      ? [...game.dealerHand]
      : [game.dealerHand[0]],
    dealerHoleHidden: !ended && game.dealerHand.length > 1,
    playerValue: handValue(game.playerHand),
    dealerValue: ended ? handValue(game.dealerHand) : null,
    bid: game.bid,
    balance,
    result,
  };
}

async function maybeResolveAfterDeal(
  db: Db,
  game: ActiveGame,
): Promise<BlackjackState | null> {
  if (isBlackjack(game.playerHand)) {
    return finishGame(db, game);
  }

  const dealerUp = game.dealerHand[0];
  if (isPeekCard(dealerUp) && isBlackjack(game.dealerHand)) {
    return finishGame(db, game);
  }

  return null;
}

export async function blackjackDeal(
  db: Db,
  userId: string,
  bid: number,
): Promise<BlackjackState> {
  if (bid < 1 || bid > 10 || !Number.isInteger(bid)) {
    throw new Error("Invalid bid");
  }

  const user = await getUserById(db, userId);
  if (!user) throw new Error("User not found");
  if (user.money < bid) throw new Error("Insufficient balance");
  if (user.gamblingBanned) throw new Error("Banned from gambling");
  if (games.has(userId)) throw new Error("Game already in progress");

  await scoreUser(db, userId, -bid);

  const game: ActiveGame = {
    userId,
    bid,
    deck: createShoe(),
    playerHand: [],
    dealerHand: [],
    phase: "player",
  };

  game.playerHand.push(draw(game));
  game.dealerHand.push(draw(game));
  game.playerHand.push(draw(game));
  game.dealerHand.push(draw(game));

  games.set(userId, game);

  const updated = await getUserById(db, userId);
  const balance = updated?.money ?? 0;

  const instant = await maybeResolveAfterDeal(db, game);
  if (instant) return instant;

  if (handValue(game.playerHand) >= 21) {
    return finishGame(db, game);
  }

  return toState(game, balance);
}

export async function blackjackHit(
  db: Db,
  userId: string,
): Promise<BlackjackState> {
  const game = games.get(userId);
  if (!game || game.phase !== "player") {
    throw new Error("No active game");
  }

  game.playerHand.push(draw(game));

  const updated = await getUserById(db, userId);
  const balance = updated?.money ?? 0;

  if (handValue(game.playerHand) > 21) {
    return finishGame(db, game);
  }

  if (handValue(game.playerHand) === 21) {
    dealerPlay(game);
    return finishGame(db, game);
  }

  return toState(game, balance);
}

export async function blackjackStand(
  db: Db,
  userId: string,
): Promise<BlackjackState> {
  const game = games.get(userId);
  if (!game || game.phase !== "player") {
    throw new Error("No active game");
  }

  dealerPlay(game);
  return finishGame(db, game);
}

export async function getBlackjackState(
  db: Db,
  userId: string,
): Promise<BlackjackState | null> {
  const game = games.get(userId);
  if (!game || game.phase !== "player") return null;

  const user = await getUserById(db, userId);
  return toState(game, user?.money ?? 0);
}

export function abandonBlackjack(userId: string): boolean {
  return games.delete(userId);
}
