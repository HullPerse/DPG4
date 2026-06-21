import type { Card, Rank, Suit } from "@/types/gambling";

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

export function createShoe(decks = 6): Card[] {
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

export function draw(deck: Card[]): Card {
  if (deck.length < 20) {
    deck.push(...createShoe());
  }
  const card = deck.pop();
  if (!card) throw new Error("Deck empty");
  return card;
}

export function handValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;

  const rankValue = (rank: Rank) => {
    if (rank === "A") return 11;
    else if (["K", "Q", "J"].includes(rank)) return 10;
    else return Number(rank);
  };

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

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

export function isPeekCard(card: Card): boolean {
  return (
    card.rank === "A" ||
    card.rank === "10" ||
    card.rank === "J" ||
    card.rank === "Q" ||
    card.rank === "K"
  );
}

export function blackjackPayout(bid: number): number {
  return Math.floor(bid * 2.2);
}

export function resolveLabels(
  outcome: "blackjack" | "win" | "lose" | "push",
  player: number,
  dealer: number,
): { label: string; tone: string } {
  const outcomeMap = {
    blackjack: { label: "Блэкджек!", tone: "jackpot" },
    win: { label: `Победа ${player} - ${dealer}`, tone: "win" },
    push: { label: `Ничья ${player} - ${dealer}`, tone: "chance" },
    lose: {
      label: `Проигрыш ${player} - ${dealer}`,
      tone: "lose",
    },
  };

  return outcomeMap[outcome];
}

export function computeOutcome(
  playerHand: Card[],
  dealerHand: Card[],
  bid: number,
): { payout: number; outcome: "blackjack" | "win" | "lose" | "push" } {
  const player = {
    value: handValue(playerHand),
    blackjack: isBlackjack(playerHand),
  };

  const dealer = {
    value: handValue(dealerHand),
    blackjack: isBlackjack(dealerHand),
  };

  if (player.blackjack && dealer.blackjack) {
    return { payout: bid, outcome: "push" };
  }

  if (player.blackjack) {
    return { payout: blackjackPayout(bid), outcome: "blackjack" };
  }

  if (dealer.blackjack) return { payout: 0, outcome: "lose" };

  if (player.value > 21) return { payout: 0, outcome: "lose" };
  if (dealer.value > 21) return { payout: bid * 2, outcome: "win" };
  if (player.value > dealer.value) return { payout: bid * 2, outcome: "win" };
  if (player.value < dealer.value) return { payout: 0, outcome: "lose" };

  return { payout: bid, outcome: "push" };
}

export function dealerPlay(hand: Card[], deck: Card[]) {
  while (handValue(hand) < 17) {
    hand.push(draw(deck));
  }
}
