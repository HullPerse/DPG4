import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";
import { Button } from "@/components/ui/button.component";
import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { cn } from "@/lib/utils";
import {
  blackjackDeal,
  blackjackHit,
  blackjackStand,
  syncBlackjack,
  abandonBlackjack,
} from "@/api/gambling.api";
import BlackjackScene from "../components/scene.blackjack";
import { SmallLoader } from "@/components/shared/loader.component";
import {
  animDelayMs,
  getBlackjackResultColor,
  rules,
} from "@/lib/gambling/blackjack.utils";
import type {
  BlackjackState,
  BlackjackUiResult,
  PlayingCard,
} from "@/types/gamble";

const BIDS = [1, 2, 3, 5, 8, 10] as const;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildDealFlyingCards(state: BlackjackState): Set<string> {
  const ids = new Set<string>();
  state.playerHand.forEach((_, i) => ids.add(`p-${i}`));
  state.dealerHand.forEach((_, i) => ids.add(`d-${i}`));
  if (state.dealerHoleHidden) ids.add("d-hole");
  return ids;
}

function BlackjackTab() {
  const user = useUserStore((state) => state.user);
  const gamblingBanned = useDataStore((state) => state.gamblingBanned);
  const setGamblingBanned = useDataStore((state) => state.setGamblingBanned);

  const [game, setGame] = useState<BlackjackState | null>(null);
  const [bid, setBid] = useState(3);
  const [busy, setBusy] = useState(false);
  const [flyingCards, setFlyingCards] = useState<Set<string>>(() => new Set());
  const [uiResult, setUiResult] = useState<BlackjackUiResult>(null);
  const [revealHole, setRevealHole] = useState(false);
  const [holeCard, setHoleCard] = useState<PlayingCard | null>(null);
  const [syncing, setSyncing] = useState(true);
  const flyClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const balance = user?.money ?? 0;
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
          user: { ...user, money: state.balance },
        });
      }
      if (state.result) {
        const netLabel =
          state.result.net >= 0
            ? `${state.result.label} · итого +${state.result.net}`
            : `${state.result.label} · итого ${state.result.net}`;
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
          user: { ...user, money: state.balance },
        });
      }
      if (state.result) {
        const netLabel =
          state.result.net >= 0
            ? `${state.result.label} · итого +${state.result.net}`
            : `${state.result.label} · итого ${state.result.net}`;
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
        const state = await syncBlackjack(String(user.id));
        if (!cancelled && state) restoreGame(state);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, restoreGame]);

  const handleDeal = async () => {
    if (busy || !user || balance < bid || gamblingBanned) return;

    setBusy(true);
    setUiResult(null);
    setRevealHole(false);
    setHoleCard(null);
    setFlyingCards(new Set());

    try {
      const state = await blackjackDeal(String(user.id), bid);
      const fly = buildDealFlyingCards(state);
      setFlyingCards(fly);
      applyState(state);
      scheduleFlyClear(fly.size);
    } catch {
      try {
        const existing = await syncBlackjack(String(user.id));
        if (existing) restoreGame(existing);
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  const handleHit = async () => {
    if (busy || !user || !game || game.phase !== "player") return;

    setBusy(true);
    try {
      const state = await blackjackHit(String(user.id));
      const newIndex = state.playerHand.length - 1;
      const fly = new Set<string>([`p-${newIndex}`]);
      setFlyingCards(fly);
      applyState(state);
      scheduleFlyClear(1);
    } catch {
      /* keep current game */
    } finally {
      setBusy(false);
    }
  };

  const handleStand = async () => {
    if (busy || !user || !game || game.phase !== "player") return;

    setBusy(true);
    try {
      const hadHole = game.dealerHoleHidden;
      const state = await blackjackStand(String(user.id));
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
    } catch {
      /* keep current game */
    } finally {
      setBusy(false);
    }
  };

  const newHand = async () => {
    if (user && game?.phase === "player") {
      try {
        await abandonBlackjack(String(user.id));
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
      <section className="flex flex-col w-xl items-center gap-1 border-2 border-highlight-high bg-background px-2 py-1">
        <span className="text-lg font-bold">{balance} чубриков</span>
        {game && (
          <span className="text-sm text-primary">
            Вы: {game.playerValue}
            {game.dealerValue !== null && ` · Дилер: ${game.dealerValue}`}
          </span>
        )}
      </section>

      {!inRound && (
        <section className="flex w-xl items-center justify-center gap-1.5 border-2 border-highlight-high bg-background px-3 py-1.5">
          <span className="text-sm text-muted mr-1">Ставка</span>
          {BIDS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setBid(v)}
              disabled={busy || gamblingBanned}
              className={cn(
                "min-w-8 h-8 rounded text-sm font-semibold transition-colors cursor-pointer",
                bid === v
                  ? "bg-highlight-high text-background"
                  : "bg-foreground/10 text-muted hover:bg-foreground/20",
              )}
            >
              {v}
            </button>
          ))}
        </section>
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

        {uiResult && (
          <span
            className={cn(
              "absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-lg font-bold w-full px-1 bg-black p-1",
              getBlackjackResultColor(uiResult),
            )}
          >
            {uiResult.label} чубриков
          </span>
        )}
      </section>

      <section className="flex flex-col mt-auto gap-1 w-xl">
        {syncing ? (
          <Button variant="info" className="w-full" disabled>
            <SmallLoader />
          </Button>
        ) : !inRound ? (
          <Button
            variant="info"
            className="w-full"
            onClick={handleDeal}
            disabled={busy || balance < bid || gamblingBanned}
          >
            {gamblingBanned ? (
              "Вы забанены"
            ) : busy ? (
              <SmallLoader />
            ) : (
              `Раздать (${bid})`
            )}
          </Button>
        ) : canPlay ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button
                variant="success"
                className="flex-1"
                onClick={handleHit}
                disabled={busy}
              >
                {busy ? <SmallLoader /> : "Взять"}
              </Button>
              <Button
                variant="info"
                className="flex-1"
                onClick={handleStand}
                disabled={busy}
              >
                {busy ? <SmallLoader /> : "Хватит"}
              </Button>
            </div>
            <Button
              variant="error"
              className="w-full"
              onClick={newHand}
              disabled={busy}
            >
              Сбросить руку
            </Button>
          </div>
        ) : (
          <Button
            variant="info"
            className="w-full"
            onClick={newHand}
            disabled={busy}
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
