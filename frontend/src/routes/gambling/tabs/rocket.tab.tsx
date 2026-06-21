import { useUserStore } from "@/store/user.store";
import { cn } from "@/lib/index.utils";
import { Button } from "@/components/ui/button.component";
import { useCallback, useEffect, useRef, useState, memo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  launchRocket,
  cashoutRocket,
  pollRocket,
  abandonRocket,
  dismissRocket,
  getRocketHistory,
} from "@/api/gambling.api";
import FlightChart from "../components/flight.rocket";
import CrashChart, { CrashHistoryPills } from "../components/chart.rocket";
import type { RocketState, RocketHistoryEntry } from "@/types/gamble";
import {
  isActivePhase,
  liveMultiplier,
  potentialNet,
  potentialPayout,
  formatRocketResultLabel,
  type RocketUiResult,
} from "@/lib/gambling/rocket.utils";
import { useBidOptions, useGamblingStore } from "@/hooks/use-gambling";
import { BalanceDisplay } from "../components/balance.component";
import { BidSelector } from "../components/bid.component";
import { GameResult } from "../components/result.component";
import { useDevModeStore } from "../hooks/dev.store";

const IDLE_STATE: RocketState = {
  phase: "idle",
  multiplier: 0,
  crashPoint: 0,
  bid: 0,
  balance: 0,
  net: 0,
  label: "",
  tone: "",
  banned: false,
};

function RocketTab() {
  const { user, balance, ticketBalance, gamblingBanned, setGamblingBanned } = useGamblingStore();
  const bidOptions = useBidOptions();

  const [gameState, setGameState] = useState<RocketState>({
    phase: "idle",
    multiplier: 0,
    crashPoint: 0,
    bid: 0,
    balance: 0,
    net: 0,
    label: "",
    tone: "",
    banned: false,
  });

  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [bid, setBid] = useState<number>(3);
  const [history, setHistory] = useState<RocketHistoryEntry[]>([]);
  const getOverrides = useDevModeStore((s) => s.getOverrides);
  const isRocketDev = useDevModeStore((s) => s.isActive("rocket"));
  const [flightStart, setFlightStart] = useState<number | null>(null);
  const devOverridesRef = useRef<Record<string, unknown>>({});
  const [currentMult, setCurrentMult] = useState(1);
  const [result, setResult] = useState<RocketUiResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollGenRef = useRef(0);
  const pollInFlightRef = useRef(false);
  const roundEndedRef = useRef(false);
  const activeBid = isActivePhase(gameState.phase) ? gameState.bid : bid;
  const potentialWin = isActivePhase(gameState.phase) ? potentialPayout(activeBid, currentMult) : 0;
  const potentialGain = isActivePhase(gameState.phase) ? potentialNet(activeBid, currentMult) : 0;

  useEffect(() => {
    if (!isActivePhase(gameState.phase) || !flightStart) {
      setCurrentMult(gameState.multiplier || 1);
      return;
    }
    let raf = 0;
    const tick = () => {
      setCurrentMult(liveMultiplier(gameState.phase, flightStart, gameState.multiplier));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [gameState.phase, gameState.multiplier, flightStart]);

  useEffect(() => {
    getRocketHistory()
      .then(setHistory)
      .catch((e) => console.warn("Failed to fetch rocket history:", e));
  }, []);

  const stopPolling = useCallback(() => {
    pollGenRef.current += 1;
    pollInFlightRef.current = false;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const refreshHistory = useCallback(() => {
    getRocketHistory()
      .then(setHistory)
      .catch((e) => console.warn("Failed to refresh rocket history:", e));
  }, []);

  /** Show result overlay when round ends - do not auto-clear on idle (only via «Готово») */
  useEffect(() => {
    if (gameState.phase === "crashed" || gameState.phase === "cashed") {
      setResult({
        net: gameState.net,
        label: formatRocketResultLabel(gameState.label, gameState.net),
        tone: gameState.tone || "chance",
      });
    }
  }, [gameState.phase, gameState.net, gameState.label, gameState.tone]);

  const applyRoundEnd = useCallback((state: RocketState) => {
    roundEndedRef.current = true;
    setGameState(state);
    setResult({
      net: state.net,
      label: formatRocketResultLabel(state.label, state.net),
      tone: state.tone || "chance",
    });
  }, []);

  const resetToIdle = useCallback(() => {
    roundEndedRef.current = false;
    setFlightStart(null);
    setGameState(IDLE_STATE);
    setResult(null);
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    const gen = pollGenRef.current;

    pollRef.current = setInterval(async () => {
      if (pollInFlightRef.current) return;
      pollInFlightRef.current = true;

      try {
        const polled = await pollRocket(devOverridesRef.current);
        if (gen !== pollGenRef.current) return;

        setGameState((prev) => {
          if (prev.phase === "crashed" || prev.phase === "cashed") return prev;
          if (polled.phase === "idle") return prev;
          return polled;
        });

        if (polled.phase === "crashed" || polled.phase === "cashed") {
          stopPolling();
          const u = useUserStore.getState().user;
          if (u) useUserStore.setState({ user: { ...u, tickets: polled.balance } });
          if (polled.banned) setGamblingBanned(true);
          applyRoundEnd(polled);
          if (polled.phase === "crashed") refreshHistory();
        }

        if (polled.phase === "idle") {
          let resetActive = false;
          setGameState((prev) => {
            if (prev.phase === "crashed" || prev.phase === "cashed") return prev;
            if (roundEndedRef.current) return prev;
            if (!isActivePhase(prev.phase)) return prev;
            resetActive = true;
            return IDLE_STATE;
          });
          if (resetActive) {
            stopPolling();
            setFlightStart(null);
            setResult(null);
          }
        }
      } catch {
        if (gen !== pollGenRef.current) return;
        stopPolling();
        if (isActivePhase(gameStateRef.current.phase) && !roundEndedRef.current) {
          setFlightStart(null);
          setGameState(IDLE_STATE);
          setResult(null);
        }
      } finally {
        pollInFlightRef.current = false;
      }
    }, 120);
  }, [stopPolling, refreshHistory, setGamblingBanned, applyRoundEnd]);

  useEffect(() => {
    if (!user?.id) return;

    const overrides = getOverrides("rocket");
    devOverridesRef.current = overrides;
    pollRocket(overrides)
      .then((state) => {
        const local = gameStateRef.current.phase;
        if (local === "crashed" || local === "cashed") return;

        if (isActivePhase(state.phase)) {
          setGameState(state);
          setFlightStart(Date.now());
          startPolling();
        } else if (state.phase === "crashed" || state.phase === "cashed") {
          applyRoundEnd(state);
        } else if (state.phase === "idle" && local === "idle" && !roundEndedRef.current) {
          resetToIdle();
        }
      })
      .catch((e) => console.warn("Rocket poll error:", e));
  }, [user?.id, startPolling, applyRoundEnd, resetToIdle]);

  const launchMutation = useMutation({
    mutationFn: () => {
      const overrides = getOverrides("rocket");
      devOverridesRef.current = overrides;
      return launchRocket(bid, overrides);
    },
    onSuccess: (state) => {
      roundEndedRef.current = false;
      setResult(null);
      setGameState(state);
      setFlightStart(Date.now());
      startPolling();
    },
    onError: () => resetToIdle(),
  });

  const handleCashout = async () => {
    if (!user || !isActivePhase(gameState.phase)) return;

    try {
      stopPolling();
      const state = await cashoutRocket(devOverridesRef.current);
      applyRoundEnd(state);
      useUserStore.setState({ user: { ...useUserStore.getState().user!, tickets: state.balance } });
      if (state.banned) setGamblingBanned(true);
      refreshHistory();
    } catch {
      stopPolling();
      resetToIdle();
    }
  };

  const handleDismiss = async () => {
    resetToIdle();
    dismissRocket().catch((e) => console.warn("Failed to dismiss rocket:", e));
  };

  useEffect(() => {
    return () => {
      stopPolling();
      const gs = gameStateRef.current;
      if (gs.phase === "flying" || gs.phase === "launching") {
        abandonRocket().catch((e) => console.warn("Failed to abandon rocket:", e));
      }
    };
  }, [stopPolling]);

  const roundEnded = gameState.phase === "crashed" || gameState.phase === "cashed";
  const roundActive = isActivePhase(gameState.phase);
  const canLaunch =
    !launchMutation.isPending &&
    !gamblingBanned &&
    ticketBalance >= bid &&
    !roundActive &&
    !roundEnded;
  const canAffordBid = isRocketDev || ticketBalance >= bid;

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      <BalanceDisplay balance={balance} ticketBalance={ticketBalance}>
        {isActivePhase(gameState.phase) && (
          <div className="flex items-center justify-between border-t border-foreground/10 pt-1">
            <span className="text-sm text-muted">Текущий выигрыш</span>
            <span className="text-sm font-mono font-bold text-primary">
              +{potentialGain} ({potentialWin} всего)
            </span>
          </div>
        )}
      </BalanceDisplay>

      <section className="w-xl border-2 border-highlight-high bg-background">
        <CrashHistoryPills history={history} />
      </section>

      <section className="relative w-full flex-1 min-h-56 max-h-80 overflow-hidden border-2 border-highlight-high bg-background">
        <FlightChart
          phase={gameState.phase}
          multiplier={gameState.multiplier || 1}
          crashPoint={gameState.crashPoint || 1}
          bid={activeBid}
          flightStart={flightStart}
        />
        <GameResult result={result} />
      </section>

      <BidSelector bidOptions={bidOptions} bid={bid} onBidChange={setBid} disabled={roundActive} />

      <section className="flex flex-col gap-1 w-xl mt-auto">
        {gameState.phase === "crashed" || gameState.phase === "cashed" ? (
          <Button variant="info" className="w-full h-11" onClick={handleDismiss}>
            {`Завершить`}
          </Button>
        ) : roundActive ? (
          <Button
            variant="success"
            className={cn(
              "w-full h-11 font-bold transition-all",
              gameState.phase === "flying" && "animate-pulse",
            )}
            onClick={handleCashout}
            disabled={false}
          >
            {gameState.phase === "launching"
              ? `Забрать ×1.00 (+0)`
              : `Забрать ×${currentMult.toFixed(2)} (+${potentialGain})`}
          </Button>
        ) : (
          <Button
            variant="info"
            className="w-full h-11"
            loading={launchMutation.isPending}
            disabled={!canLaunch}
            onClick={() => launchMutation.mutate()}
          >
            {gamblingBanned
              ? "Вы забанены"
              : !canAffordBid
                ? "Недостаточно тикетов"
                : `Запустить крысу (${bid} тикетов)`}
          </Button>
        )}

        <details className="w-full border-2 border-highlight-high bg-background px-2 text-sm">
          <summary className="cursor-pointer font-semibold text-muted select-none py-1">
            График проигрышей
          </summary>
          <div className="mt-1 mb-2 h-20">
            <CrashChart history={history} />
          </div>
        </details>
      </section>
    </main>
  );
}

export default memo(RocketTab);
