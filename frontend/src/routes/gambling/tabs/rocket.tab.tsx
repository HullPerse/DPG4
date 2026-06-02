import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";
import { Button } from "@/components/ui/button.component";
import { useCallback, useEffect, useRef, useState, memo } from "react";
import { cn } from "@/lib/utils";
import {
  launchRocket,
  cashoutRocket,
  pollRocket,
  abandonRocket,
  getRocketHistory,
} from "@/api/gambling.api";
import FlightChart from "../components/flight.rocket";
import CrashChart, { CrashHistoryPills } from "../components/chart.rocket";
import { SmallLoader } from "@/components/shared/loader.component";
import type { RocketState, RocketHistoryEntry } from "@/types/gamble";
import {
  isActivePhase,
  liveMultiplier,
  potentialNet,
  potentialPayout,
  formatRocketResultLabel,
  getRocketResultColor,
  type RocketUiResult,
} from "@/lib/gambling/rocket.utils";

const BIDS = [1, 2, 3, 5, 8, 10] as const;

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
  const user = useUserStore((state) => state.user);
  const gamblingBanned = useDataStore((state) => state.gamblingBanned);
  const setGamblingBanned = useDataStore((state) => state.setGamblingBanned);

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

  const [loading, setLoading] = useState(false);
  const [bid, setBid] = useState<number>(3);
  const [history, setHistory] = useState<RocketHistoryEntry[]>([]);
  const [flightStart, setFlightStart] = useState<number | null>(null);
  const [currentMult, setCurrentMult] = useState(1);
  const [result, setResult] = useState<RocketUiResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollGenRef = useRef(0);
  const pollInFlightRef = useRef(false);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const balance = user?.money ?? 0;

  const activeBid = isActivePhase(gameState.phase) ? gameState.bid : bid;
  const potentialWin = isActivePhase(gameState.phase)
    ? potentialPayout(activeBid, currentMult)
    : 0;
  const potentialGain = isActivePhase(gameState.phase)
    ? potentialNet(activeBid, currentMult)
    : 0;

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
    getRocketHistory().then(setHistory).catch(() => {});
  }, []);

  const stopPolling = useCallback(() => {
    pollGenRef.current += 1;
    pollInFlightRef.current = false;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const clearResultTimer = useCallback(() => {
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }, []);

  const refreshHistory = useCallback(() => {
    getRocketHistory().then(setHistory).catch(() => {});
  }, []);

  const applyRoundResult = useCallback((state: RocketState, delayMs = 0) => {
    if (state.phase !== "crashed" && state.phase !== "cashed") return;
    clearResultTimer();

    const payload: RocketUiResult = {
      net: state.net,
      label: formatRocketResultLabel(state.label, state.net),
      tone: state.tone,
    };

    if (delayMs > 0) {
      resultTimerRef.current = setTimeout(() => setResult(payload), delayMs);
    } else {
      setResult(payload);
    }
  }, [clearResultTimer]);

  const startPolling = useCallback(
    (userId: string) => {
      stopPolling();
      const gen = pollGenRef.current;

      pollRef.current = setInterval(async () => {
        if (pollInFlightRef.current) return;
        pollInFlightRef.current = true;

        try {
          const polled = await pollRocket(userId);
          if (gen !== pollGenRef.current) return;

          setGameState((prev) => {
            if (prev.phase === "crashed" || prev.phase === "cashed") return prev;
            if (polled.phase === "idle") return prev;
            return polled;
          });

          if (polled.phase === "crashed") {
            stopPolling();
            const u = useUserStore.getState().user;
            if (u) useUserStore.setState({ user: { ...u, money: polled.balance } });
            if (polled.banned) setGamblingBanned(true);
            applyRoundResult(polled, 700);
            refreshHistory();
          }

          if (polled.phase === "idle" && isActivePhase(gameStateRef.current.phase)) {
            stopPolling();
            setFlightStart(null);
            setGameState(IDLE_STATE);
          }
        } catch {
          if (gen !== pollGenRef.current) return;
          stopPolling();
          setFlightStart(null);
          if (isActivePhase(gameStateRef.current.phase)) {
            setGameState(IDLE_STATE);
          }
        } finally {
          pollInFlightRef.current = false;
        }
      }, 120);
    },
    [stopPolling, refreshHistory, setGamblingBanned, applyRoundResult],
  );

  useEffect(() => {
    if (!user) return;
    const userId = String(user.id);

    pollRocket(userId)
      .then((state) => {
        if (isActivePhase(state.phase)) {
          setGameState(state);
          setFlightStart(Date.now());
          startPolling(userId);
        } else if (state.phase === "crashed" || state.phase === "cashed") {
          setGameState(state);
          setFlightStart(null);
          applyRoundResult(state);
        } else {
          setGameState(IDLE_STATE);
          setFlightStart(null);
        }
      })
      .catch(() => {});
  }, [user, startPolling, applyRoundResult]);

  const handleLaunch = async () => {
    if (loading || !user || balance < bid || gamblingBanned) return;
    setLoading(true);
    clearResultTimer();
    setResult(null);

    try {
      const state = await launchRocket(String(user.id), bid);
      setGameState(state);
      setFlightStart(Date.now());
      setLoading(false);
      startPolling(String(user.id));
    } catch {
      setLoading(false);
      setFlightStart(null);
      setGameState(IDLE_STATE);
    }
  };

  const handleCashout = async () => {
    if (!user || !isActivePhase(gameState.phase)) return;

    try {
      stopPolling();
      const state = await cashoutRocket(String(user.id));
      setGameState(state);
      applyRoundResult(state, 400);
      useUserStore.setState({ user: { ...user, money: state.balance } });
      if (state.banned) setGamblingBanned(true);
      refreshHistory();
    } catch {
      stopPolling();
      setFlightStart(null);
      setGameState(IDLE_STATE);
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
      clearResultTimer();
      const gs = gameStateRef.current;
      if (user && (gs.phase === "flying" || gs.phase === "launching")) {
        abandonRocket(String(user.id)).catch(() => {});
      }
    };
  }, [stopPolling, clearResultTimer, user]);

  const roundEnded =
    gameState.phase === "idle" ||
    gameState.phase === "crashed" ||
    gameState.phase === "cashed";
  const roundActive = isActivePhase(gameState.phase);
  const canAffordBid = balance >= bid;

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      <section className="flex flex-col w-xl items-stretch gap-1 border-2 border-highlight-high bg-background px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Баланс</span>
          <span className="text-lg font-bold">{balance} чубриков</span>
        </div>
        {isActivePhase(gameState.phase) && (
          <div className="flex items-center justify-between border-t border-foreground/10 pt-1">
            <span className="text-sm text-muted">Текущий выигрыш</span>
            <span className="text-sm font-mono font-bold text-primary">
              +{potentialGain} ({potentialWin} всего)
            </span>
          </div>
        )}
      </section>

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
        {result && (
          <span
            className={cn(
              "absolute bottom-0 left-1/2 -translate-x-1/2 text-center text-lg font-bold w-full px-1 py-1 bg-black/80",
              getRocketResultColor(result),
            )}
          >
            {result.label}
          </span>
        )}
      </section>

      <section className="flex w-xl items-center justify-center gap-1.5 border-2 border-highlight-high bg-background px-3 py-1.5">
        <span className="text-sm text-muted mr-1">Ставка</span>
        {BIDS.map((v) => (
          <button
            key={v}
            onClick={() => setBid(v)}
            disabled={roundActive}
            className={cn(
              "min-w-8 h-8 rounded text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
              bid === v
                ? "bg-highlight-high text-background"
                : "bg-foreground/10 text-muted hover:bg-foreground/20",
            )}
          >
            {v}
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-1 w-xl mt-auto">
        {roundEnded ? (
          <Button
            variant="info"
            className="w-full h-11"
            onClick={handleLaunch}
            disabled={loading || gamblingBanned || !canAffordBid}
          >
            {gamblingBanned ? (
              "Вы забанены"
            ) : loading ? (
              <SmallLoader />
            ) : !canAffordBid ? (
              "Недостаточно чубриков"
            ) : (
              `Запустить крысу (${bid} чубриков)`
            )}
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
            onClick={() => {
              setFlightStart(null);
              setGameState(IDLE_STATE);
            }}
          >
            Новая игра
          </Button>
        )}

        <details className="w-full border-2 border-highlight-high bg-background px-2 text-sm">
          <summary className="cursor-pointer font-semibold text-muted select-none py-1">
            График крахов
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
