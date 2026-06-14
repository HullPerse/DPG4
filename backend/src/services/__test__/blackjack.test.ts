import { describe, expect, test, beforeEach } from "bun:test";
import { createTestDb, createServices, createUser, getUser } from "./helpers";
import {
  computeOutcome,
  handValue,
  isBlackjack,
  blackjackPayout,
  dealerPlay,
  createShoe,
} from "../../lib/blackjack.utils";
import type { Card } from "@/types/gambling";

function card(rank: Card["rank"], suit: Card["suit"] = "hearts"): Card {
  return { suit, rank };
}

describe("Blackjack utils", () => {
  describe("handValue", () => {
    test("simple values", () => {
      expect(handValue([card("2"), card("3")])).toBe(5);
      expect(handValue([card("10"), card("K")])).toBe(20);
    });

    test("aces soft->hard", () => {
      expect(handValue([card("A"), card("7")])).toBe(18);
      expect(handValue([card("A"), card("A")])).toBe(12);
      expect(handValue([card("A"), card("A"), card("A")])).toBe(13);
      expect(handValue([card("A"), card("9")])).toBe(20);
      expect(handValue([card("A"), card("K")])).toBe(21);
    });

    test("bust detection", () => {
      expect(handValue([card("10"), card("K"), card("5")])).toBe(25);
      expect(handValue([card("10"), card("K"), card("A")])).toBe(21);
    });
  });

  describe("isBlackjack", () => {
    test("ace + 10-value is blackjack", () => {
      expect(isBlackjack([card("A"), card("K")])).toBe(true);
      expect(isBlackjack([card("A"), card("10")])).toBe(true);
      expect(isBlackjack([card("A"), card("J")])).toBe(true);
    });

    test("three cards not blackjack", () => {
      expect(isBlackjack([card("A"), card("7"), card("3")])).toBe(false);
    });

    test("non-21 two cards not blackjack", () => {
      expect(isBlackjack([card("10"), card("10")])).toBe(false);
    });
  });

  describe("blackjackPayout", () => {
    test("pays 2.2x floored", () => {
      expect(blackjackPayout(10)).toBe(22);
      expect(blackjackPayout(5)).toBe(11);
      expect(blackjackPayout(3)).toBe(6);
      expect(blackjackPayout(1)).toBe(2);
    });
  });

  describe("dealerPlay", () => {
    test("dealer draws to 17+", () => {
      const deck = createShoe();
      const hand = [card("10"), card("5")];
      dealerPlay(hand, deck);
      expect(handValue(hand)).toBeGreaterThanOrEqual(17);
    });

    test("dealer stands on 17", () => {
      const deck = createShoe();
      const hand = [card("10"), card("7")];
      dealerPlay(hand, deck);
      expect(handValue(hand)).toBe(17);
    });
  });

  describe("computeOutcome", () => {
    test("player blackjack vs non-blackjack", () => {
      const result = computeOutcome(
        [card("A"), card("K")],
        [card("10"), card("8")],
        10,
      );
      expect(result.outcome).toBe("blackjack");
      expect(result.payout).toBe(22);
    });

    test("both blackjack -> push", () => {
      const result = computeOutcome(
        [card("A"), card("K")],
        [card("A"), card("J")],
        10,
      );
      expect(result.outcome).toBe("push");
      expect(result.payout).toBe(10);
    });

    test("dealer blackjack -> lose", () => {
      const result = computeOutcome(
        [card("10"), card("8")],
        [card("A"), card("K")],
        10,
      );
      expect(result.outcome).toBe("lose");
      expect(result.payout).toBe(0);
    });

    test("player bust -> lose", () => {
      const result = computeOutcome(
        [card("10"), card("K"), card("5")],
        [card("10"), card("7")],
        10,
      );
      expect(result.outcome).toBe("lose");
      expect(result.payout).toBe(0);
    });

    test("dealer bust -> win 2x", () => {
      const result = computeOutcome(
        [card("10"), card("8")],
        [card("10"), card("K"), card("5")],
        10,
      );
      expect(result.outcome).toBe("win");
      expect(result.payout).toBe(20);
    });

    test("player higher -> win 2x", () => {
      const result = computeOutcome(
        [card("10"), card("9")],
        [card("10"), card("7")],
        10,
      );
      expect(result.outcome).toBe("win");
      expect(result.payout).toBe(20);
    });

    test("dealer higher -> lose", () => {
      const result = computeOutcome(
        [card("10"), card("7")],
        [card("10"), card("9")],
        10,
      );
      expect(result.outcome).toBe("lose");
      expect(result.payout).toBe(0);
    });

    test("equal values -> push", () => {
      const result = computeOutcome(
        [card("10"), card("8")],
        [card("K"), card("8")],
        10,
      );
      expect(result.outcome).toBe("push");
      expect(result.payout).toBe(10);
    });
  });
});

describe("BlackjackService", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let services: ReturnType<typeof createServices>;
  let userId: string;

  beforeEach(async () => {
    const ctx = createTestDb();
    db = ctx.db;
    services = createServices(db);
    const user = await createUser(db, { money: 100 });
    userId = user.id;
  });

  test("deal deducts bid and returns player state", async () => {
    const state = await services.blackjackService.deal(userId, 5);
    expect(state.phase).toBe("player");
    expect(state.bid).toBe(5);
    expect(state.playerHand).toHaveLength(2);
    expect(state.dealerHand).toHaveLength(1);
    expect(state.dealerHoleHidden).toBe(true);
    expect(state.playerValue).toBeGreaterThanOrEqual(2);
    expect(state.result).toBeNull();
    const user = await getUser(db, userId);
    expect(user!.tickets).toBe(95);
  });

  test("deal rejects invalid bid", async () => {
    expect(services.blackjackService.deal(userId, 0)).rejects.toThrow(
      "Invalid bid",
    );
    expect(services.blackjackService.deal(userId, 51)).rejects.toThrow(
      "Invalid bid",
    );
  });

  test("deal rejects insufficient balance", async () => {
    const poor = await createUser(db, { tickets: 2 });
    expect(services.blackjackService.deal(poor.id, 5)).rejects.toThrow(
      "Insufficient balance",
    );
  });

  test("deal rejects banned user", async () => {
    const banned = await createUser(db, { gamblingBanned: true });
    expect(services.blackjackService.deal(banned.id, 3)).rejects.toThrow(
      "Banned from gambling",
    );
  });

  test("deal rejects when game already active", async () => {
    const state = await services.blackjackService.deal(userId, 3);
    if (state.phase === "ended") return;
    expect(services.blackjackService.deal(userId, 3)).rejects.toThrow(
      "Game already in progress",
    );
  });

  test("hit adds card to player hand or game already ended", async () => {
    const state = await services.blackjackService.deal(userId, 3);
    if (state.phase === "ended") return;
    const hitState = await services.blackjackService.hit(userId);
    expect(hitState.playerHand.length).toBe(state.playerHand.length + 1);
  });

  test("hit without active game rejects", async () => {
    expect(services.blackjackService.hit(userId)).rejects.toThrow(
      "No active game",
    );
  });

  test("stand finishes game", async () => {
    const state = await services.blackjackService.deal(userId, 3);
    if (state.phase === "ended") {
      expect(state.result).not.toBeNull();
      return;
    }
    const endState = await services.blackjackService.stand(userId);
    expect(endState.phase).toBe("ended");
    expect(endState.result).not.toBeNull();
    expect(endState.dealerHand.length).toBeGreaterThanOrEqual(2);
    expect(endState.dealerHoleHidden).toBe(false);
    expect(endState.dealerValue).not.toBeNull();
  });

  test("stand gives valid payout", async () => {
    const state = await services.blackjackService.deal(userId, 3);
    if (state.phase === "ended") {
      expect(state.result!.payout).toBeGreaterThanOrEqual(0);
      const expectedNet = -3 + state.result!.payout;
      expect(state.result!.net).toBe(expectedNet);
      return;
    }
    const endState = await services.blackjackService.stand(userId);
    expect(["win", "lose", "push", "blackjack"]).toContain(
      endState.result!.outcome,
    );
    expect(endState.result!.payout).toBeGreaterThanOrEqual(0);
    const expectedNet = -3 + endState.result!.payout;
    expect(endState.result!.net).toBe(expectedNet);
  });

  test("stand credits tickets on win", async () => {
    const state = await services.blackjackService.deal(userId, 10);
    if (state.phase === "player") {
      const endState = await services.blackjackService.stand(userId);
      const user = await getUser(db, userId);
      const ticketsAfterDeal = 100 - 10;
      const expectedTickets = ticketsAfterDeal + endState.result!.payout;
      expect(user!.tickets).toBe(expectedTickets);
    }
  });

  test("abandon removes active game", async () => {
    const state = await services.blackjackService.deal(userId, 3);
    if (state.phase === "ended") return;
    services.blackjackService.abandon(userId);
    expect(services.blackjackService.hit(userId)).rejects.toThrow(
      "No active game",
    );
  });

  test("getState returns current game or null", async () => {
    expect(await services.blackjackService.getState(userId)).toBeNull();
    const dealState = await services.blackjackService.deal(userId, 3);
    if (dealState.phase === "ended") return;
    const state = await services.blackjackService.getState(userId);
    expect(state).not.toBeNull();
    expect(state!.phase).toBe("player");
  });

  test("gambling ban triggers on big win", async () => {
    const lowUser = await createUser(db, {
      money: 100,
      gamblingWinnings: 95,
      gamblingBanned: false,
    });
    let state = await services.blackjackService.deal(lowUser.id, 10);
    if (state.phase === "player") {
      state = await services.blackjackService.stand(lowUser.id);
    }
    if (state.result!.payout >= 5) {
      const user = await getUser(db, lowUser.id);
      if (state.result!.payout > 0) {
        expect(user!.gamblingWinnings).toBeGreaterThanOrEqual(100);
        expect(user!.gamblingBanned).toBe(true);
      }
    }
  });
});
