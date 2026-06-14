import { useUserStore } from "@/store/user.store";
import { Button } from "@/components/ui/button.component";
import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  blackjackDeal,
  blackjackHit,
  blackjackStand,
  syncBlackjack,
  abandonBlackjack,
} from "@/api/gambling.api";
import BlackjackScene from "../components/scenes/scene.blackjack";
import { animDelayMs, rules } from "@/lib/gambling/blackjack.utils";
import type {
  BlackjackState,
  BlackjackUiResult,
  PlayingCard,
} from "@/types/gamble";
import { useBidOptions, useGamblingStore } from "@/hooks/use-gambling";
import { BalanceDisplay } from "../components/balance.component";
import { BidSelector } from "../components/bid.component";
import { GameResult } from "../components/result.component";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildDealFlyingCards(state: BlackjackState): Set<string> {
  const ids = new Set<string>();
  state.playerHand.forEach((_, i) => ids.add(`p-${i}`));
  state.dealerHand.forEach((_, i) => ids.add(`d-${i}`));
  if (state.dealerHoleHidden) ids.add("d-hole");
  return ids;
}

function BlackjackTab() {
  const { user, balance, ticketBalance, gamblingBanned, setGamblingBanned } =
    useGamblingStore();
  const bidOptions = useBidOptions();

  const [game, setGame] = useState<BlackjackState | null>(null);
  const [bid, setBid] = useState(3);

  const [flyingCards, setFlyingCards] = useState<Set<string>>(() => new Set());
  const [uiResult, setUiResult] = useState<BlackjackUiResult>(null);
  const [revealHole, setRevealHole] = useState(false);
  const [holeCard, setHoleCard] = useState<PlayingCard | null>(null);
  const [syncing, setSyncing] = useState(true);
  const flyClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const RULES = useMemo(() => rules(bid), [bid]);

  const scheduleFlyClear = useCallback((count: number) => {
    if (flyClearRef.current) clearTimeout(flyClearRef.current);
    flyClearRef.current = setTimeout(() => {
      setFlyingCards(new Set());
      flyClearRef.current = null;
    }, animDelayMs(count));
  }, []);

  useEffect(() => {
    return () => {
      if (flyClearRef.current) clearTimeout(flyClearRef.current);
    };
  }, []);

  const applyState = useCallback(
    (state: BlackjackState) => {
      setGame(state);
      if (user) {
        useUserStore.setState({
          user: { ...user, tickets: state.balance },
        });
      }
      if (state.result) {
        const netLabel =
          state.result.net >= 0
            ? `${state.result.label}`
            : `${state.result.label}`;
        setUiResult({
          net: state.result.net,
          label: netLabel,
          tone: state.result.tone,
        });
        if (state.result.banned) setGamblingBanned(true);
      }
    },
    [user, setGamblingBanned],
  );

  const restoreGame = useCallback(
    (state: BlackjackState) => {
      setGame(state);
      setBid(state.bid);
      setFlyingCards(new Set());
      if (user) {
        useUserStore.setState({
          user: { ...user, tickets: state.balance },
        });
      }
      if (state.result) {
        const netLabel =
          state.result.net >= 0
            ? `${state.result.label}`
            : `${state.result.label}`;
        setUiResult({
          net: state.result.net,
          label: netLabel,
          tone: state.result.tone,
        });
        if (state.result.banned) setGamblingBanned(true);
      } else {
        setUiResult(null);
      }
    },
    [user, setGamblingBanned],
  );

  useEffect(() => {
    if (!user) {
      setSyncing(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const state = await syncBlackjack();
        if (!cancelled && state) restoreGame(state);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, restoreGame]);

  const dealMutation = useMutation({
    mutationFn: () => blackjackDeal(bid),
    onSuccess: (state) => {
      setUiResult(null);
      setRevealHole(false);
      setHoleCard(null);

      const fly = buildDealFlyingCards(state);
      setFlyingCards(fly);
      applyState(state);
      scheduleFlyClear(fly.size);
    },
    onError: async () => {
      try {
        const existing = await syncBlackjack();
        if (existing) restoreGame(existing);
      } catch {
        /* ignore */
      }
    },
  });

  const hitMutation = useMutation({
    mutationFn: () => blackjackHit(),
    onSuccess: (state) => {
      const newIndex = state.playerHand.length - 1;
      const fly = new Set<string>([`p-${newIndex}`]);
      setFlyingCards(fly);
      applyState(state);
      scheduleFlyClear(1);
    },
    onError: () => {
      /* keep current game */
    },
  });

  const standMutation = useMutation({
    mutationFn: () => blackjackStand(),
    onSuccess: async (state) => {
      const hadHole = game?.dealerHoleHidden;
      const fly = new Set<string>();

      if (hadHole && state.dealerHand.length > 1) {
        setHoleCard(state.dealerHand[1]);
        setRevealHole(true);
        await sleep(650);
      }

      for (let i = 2; i < state.dealerHand.length; i++) {
        fly.add(`d-${i}`);
      }

      setRevealHole(false);
      setHoleCard(null);
      setFlyingCards(fly);
      applyState(state);
      if (fly.size > 0) scheduleFlyClear(fly.size);
    },
    onError: () => {
      /* keep current game */
    },
  });

  const loading =
    dealMutation.isPending || hitMutation.isPending || standMutation.isPending;

  const newHand = async () => {
    if (user && game?.phase === "player") {
      try {
        await abandonBlackjack();
      } catch {
        /* server may already be clear */
      }
    }
    if (flyClearRef.current) clearTimeout(flyClearRef.current);
    setFlyingCards(new Set());
    setGame(null);
    setUiResult(null);
    setRevealHole(false);
    setHoleCard(null);
  };

  const inRound = game !== null;
  const canPlay = game?.phase === "player";

  const dealerVisible =
    revealHole && game ? game.dealerHand.slice(0, 1) : (game?.dealerHand ?? []);

  const dealerHidden = Boolean(game?.dealerHoleHidden || revealHole);

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      <BalanceDisplay balance={balance} ticketBalance={ticketBalance}>
        {game && (
          <span className="text-sm text-primary">
            Вы: {game.playerValue}
            {game.dealerValue !== null && ` · Дилер: ${game.dealerValue}`}
          </span>
        )}
      </BalanceDisplay>

      {!inRound && (
        <BidSelector
          bidOptions={bidOptions}
          bid={bid}
          onBidChange={setBid}
          disabled={loading || gamblingBanned}
        />
      )}

      <section className="relative w-full min-h-106 overflow-hidden border-2 border-highlight-high bg-background">
        <BlackjackScene
          playerHand={game?.playerHand ?? []}
          dealerHand={dealerVisible}
          dealerHoleHidden={dealerHidden}
          holeCard={holeCard}
          flyingCards={flyingCards}
          revealHole={revealHole}
        />

        <GameResult result={uiResult} />
      </section>

      <section className="flex flex-col mt-auto gap-1 w-xl">
        {syncing ? (
          <Button variant="info" className="w-full" loading />
        ) : !inRound ? (
          <Button
            variant="info"
            className="w-full"
            loading={loading}
            disabled={ticketBalance < bid || gamblingBanned}
            onClick={() => dealMutation.mutate()}
          >
            {gamblingBanned ? "Вы забанены" : ticketBalance < bid ? "Недостаточно тикетов" : `Раздать (${bid})`}
          </Button>
        ) : canPlay ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="success"
                className="flex-1"
                loading={loading}
                onClick={() => hitMutation.mutate()}
              >
                Взять
              </Button>
              <Button
                variant="info"
                className="flex-1"
                loading={loading}
                onClick={() => standMutation.mutate()}
              >
                Хватит
              </Button>
            </div>
            <Button
              variant="error"
              className="w-full"
              loading={loading}
              onClick={newHand}
            >
              Сбросить руку
            </Button>
          </div>
        ) : (
          <Button
            variant="info"
            className="w-full"
            loading={loading}
            onClick={newHand}
          >
            Новая рука
          </Button>
        )}

        <details className="border-2 border-highlight-high bg-background px-2 text-sm">
          <summary className="cursor-pointer font-semibold text-muted select-none py-1">
            Правила
          </summary>
          <ul className="mt-1 mb-2 flex flex-col gap-1 pl-1">
            {RULES.map((rule) => (
              <li key={rule.text} className="flex justify-between gap-2">
                <span>{rule.text}</span>
                <span className="text-right font-medium">{rule.result}</span>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </main>
  );
}

export default memo(BlackjackTab);
