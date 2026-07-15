import { useUserStore } from "@/store/user.store";
import { cn } from "@/lib/index.utils";
import { Button } from "@/components/ui/button.component";
import { useCallback, useEffect, useRef, useState, memo, lazy, Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { dropPachinko, settlePachinko, syncPachinko, abandonPachinko } from "@/api/gambling.api";
const PachinkoScene = lazy(() => import("../components/scenes/scene.pachinko"));
import type {
  PachinkoState,
  RiskGateChoice,
  PachinkoSessionStats,
  PachinkoHistoryEntry,
} from "@/types/gamble";
import {
  BOARD_WIDTH,
  PACHINKO_SLOT_MULTIPLIERS,
  getSlotWidths,
  randomDropOffsetX,
  slotColor,
  RISK_GATE_THRESHOLD,
  type PachinkoUiResult,
} from "@/lib/gambling/pachinko.utils";
import { useBidOptions, useGamblingStore } from "@/hooks/index.hook";
import { BalanceDisplay } from "../components/balance.component";
import { BidSelector } from "../components/bid.component";
import { GameResult } from "../components/result.component";
import { useDevModeStore } from "../hooks/dev.store";

const IDLE_STATE: PachinkoState = {
  phase: "idle",
  bid: 0,
  balance: 0,
  slotIndex: null,
  multiplier: 0,
  payout: 0,
  net: 0,
  label: "",
  tone: "",
  banned: false,
  kickAvailable: false,
};

function PachinkoTab() {
  const { user, balance, ticketBalance, gamblingBanned, setGamblingBanned } = useGamblingStore();
  const bidOptions = useBidOptions();

  const [gameState, setGameState] = useState<PachinkoState>(IDLE_STATE);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [bid, setBid] = useState<number>(3);
  const [ratAmount, setRatAmount] = useState<number>(1);

  const [dropKey, setDropKey] = useState(0);
  const [startX, setStartX] = useState(0);
  const [result, setResult] = useState<PachinkoUiResult | null>(null);
  const settlingRef = useRef(false);
  const [kickTrigger, setKickTrigger] = useState(0);
  const getOverrides = useDevModeStore((s) => s.getOverrides);
  const isPachinkoDev = useDevModeStore((s) => s.isActive("pachinko"));
  const [showKickButton, setShowKickButton] = useState(false);
  const kickPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [settleTrigger, setSettleTrigger] = useState(0);
  const [riskGateActive, setRiskGateActive] = useState(false);
  const [riskGateChoice, setRiskGateChoice] = useState<RiskGateChoice>(null);
  const [showRiskGatePrompt, setShowRiskGatePrompt] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);

  const sessionStatsRef = useRef<PachinkoSessionStats>({
    streak: 0,
    bestStreak: 0,
    totalDrops: 0,
    totalWins: 0,
    totalNet: 0,
    history: [],
  });
  const [, forceUpdate] = useState(0);

  const dropMutation = useMutation({
    mutationFn: () => dropPachinko(bid, ratAmount, getOverrides("pachinko")),
    onSuccess: (state) => {
      setResult(null);
      settlingRef.current = false;
      setStartX(randomDropOffsetX());
      setGameState(state);
      setDropKey((k) => k + 1);
      useUserStore.setState({ user: { ...useUserStore.getState().user!, tickets: state.balance } });
    },
    onError: () => {
      setGameState(IDLE_STATE);
      setCountdown(null);
    },
  });

  const inDrop = gameState.phase === "dropping";
  const roundDone = gameState.phase === "done";
  const showRat = inDrop || roundDone;
  const totalBid = bid * ratAmount;
  const canAct =
    !dropMutation.isPending &&
    !inDrop &&
    countdown === null &&
    !gamblingBanned &&
    (isPachinkoDev || ticketBalance >= totalBid);
  const highlightSlot = roundDone ? gameState.slotIndex : null;

  useEffect(() => {
    syncPachinko()
      .then((state) => {
        if (state.phase === "dropping") {
          setGameState(state);
          setDropKey((k) => k + 1);
          setStartX(randomDropOffsetX());
          settlingRef.current = false;
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (gameStateRef.current.phase === "dropping") {
        abandonPachinko().catch(() => {});
      }
    };
  }, []);

  // Countdown effect
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        dropMutation.mutate();
      } else {
        setCountdown(countdown - 1);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Shake decay
  useEffect(() => {
    if (shakeIntensity <= 0) return;
    const timer = setTimeout(() => {
      setShakeIntensity(Math.max(0, shakeIntensity - 0.3));
    }, 150);
    return () => clearTimeout(timer);
  }, [shakeIntensity]);

  // Flash decay
  useEffect(() => {
    if (!flashColor) return;
    const timer = setTimeout(() => setFlashColor(null), 400);
    return () => clearTimeout(timer);
  }, [flashColor]);

  const handleSettled = useCallback(
    async (slotIndexes: number[]) => {
      if (!user || settlingRef.current || gameStateRef.current.phase !== "dropping") return;
      settlingRef.current = true;

      const clamped = slotIndexes.map((raw) =>
        Math.max(0, Math.min(PACHINKO_SLOT_MULTIPLIERS.length - 1, Math.floor(raw))),
      );

      try {
        const state = await settlePachinko(clamped, getOverrides("pachinko"));
        setGameState(state);
        useUserStore.setState((s) => {
          const u = s.user;
          if (!u) return {};
          return { user: { ...u, tickets: state.balance } };
        });
        if (state.banned) setGamblingBanned(true);

        // Dramatic effects
        setSettleTrigger((k) => k + 1);
        setShakeIntensity(1);

        // Update session stats
        const stats = sessionStatsRef.current;
        stats.totalDrops += 1;
        if (state.net > 0) {
          stats.totalWins += 1;
          stats.streak += 1;
          if (stats.streak > stats.bestStreak) stats.bestStreak = stats.streak;
          setFlashColor(state.tone === "jackpot" ? "#f6c177" : "#9ccfd8");
        } else {
          stats.streak = 0;
          setFlashColor("#eb6f92");
        }
        stats.totalNet += state.net;
        const entry: PachinkoHistoryEntry = {
          net: state.net,
          label: state.label,
          tone: state.tone,
          timestamp: Date.now(),
          riskGate: riskGateChoice !== null,
        };
        stats.history.unshift(entry);
        if (stats.history.length > 10) stats.history.pop();
        forceUpdate((n) => n + 1);

        // Check risk gate eligibility
        if (stats.streak >= RISK_GATE_THRESHOLD && !riskGateActive) {
          setShowRiskGatePrompt(true);
        }

        const net = state.net;
        setResult({
          net,
          label: state.net > 0 ? `+${state.net}` : `${state.net}`,
          tone: state.tone || "chance",
        });

        setRiskGateChoice(null);
      } catch {
        setGameState(IDLE_STATE);
        setResult(null);
      }
    },
    [user, setGamblingBanned, riskGateChoice, riskGateActive],
  );

  useEffect(() => {
    if (!inDrop) {
      setShowKickButton(false);
      if (kickPollRef.current) {
        clearInterval(kickPollRef.current);
        kickPollRef.current = null;
      }
      return;
    }

    kickPollRef.current = setInterval(async () => {
      try {
        const state = await syncPachinko();
        if (state.kickAvailable) {
          setShowKickButton(true);
          if (kickPollRef.current) {
            clearInterval(kickPollRef.current);
            kickPollRef.current = null;
          }
        }
      } catch {}
    }, 3_000);

    return () => {
      if (kickPollRef.current) {
        clearInterval(kickPollRef.current);
        kickPollRef.current = null;
      }
    };
  }, [inDrop]);

  const handleKick = () => {
    setKickTrigger((k) => k + 1);
    setShowKickButton(false);
  };

  const handleDrop = () => {
    if (showRiskGatePrompt) {
      setRiskGateActive(true);
      setShowRiskGatePrompt(false);
      return;
    }
    setCountdown(3);
  };

  const handleRiskGatePick = (choice: RiskGateChoice) => {
    if (!choice) return;
    setRiskGateChoice(choice);
    setRiskGateActive(false);
    setCountdown(3);
  };

  const handleSkipRiskGate = () => {
    setShowRiskGatePrompt(false);
    setRiskGateActive(false);
    sessionStatsRef.current.streak = 0;
    forceUpdate((n) => n + 1);
    setCountdown(3);
  };

  const handleCountdownEnd = () => {};

  const stats = sessionStatsRef.current;

  return (
    <main className="flex h-full w-full flex-col gap-2 p-2">
      <BalanceDisplay balance={balance} ticketBalance={ticketBalance} />

      <div className="flex w-full flex-1 gap-2 min-h-0">
        {/* Scene */}
        <section className="relative flex-1 min-h-0 max-h-full overflow-hidden border-2 border-highlight-high bg-background">
          <Suspense fallback={null}>
            <PachinkoScene
              dropKey={dropKey}
              startX={startX}
              showRat={showRat}
              simulating={inDrop}
              highlightIndex={highlightSlot}
              onSettled={handleSettled}
              bid={bid}
              kickTrigger={kickTrigger}
              ratAmount={ratAmount}
              countdown={countdown}
              onCountdownEnd={handleCountdownEnd}
              showRiskGate={riskGateActive || (showRiskGatePrompt && riskGateChoice === null)}
              riskGateChoice={riskGateChoice}
              settleTrigger={settleTrigger}
              shakeIntensity={shakeIntensity}
            />
          </Suspense>

          {/* Flash overlay */}
          {flashColor && (
            <div
              className="absolute inset-0 z-20 pointer-events-none transition-opacity duration-300"
              style={{
                backgroundColor: flashColor,
                opacity: 0.15,
                mixBlendMode: "overlay",
              }}
            />
          )}

          <GameResult result={result} />

          {showKickButton && inDrop && (
            <Button
              onClick={handleKick}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-4 py-2 text-lg font-bold"
            >
              Пнуть
            </Button>
          )}

          {!showRat && !result && !countdown && (
            <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none">
              <p className="text-muted text-sm font-mono tracking-widest">ПАЧИНКО</p>
            </div>
          )}

          {/* Risk gate prompt overlay */}
          {showRiskGatePrompt && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70">
              <p className="text-amber-400 text-lg font-bold font-mono mb-2 tracking-wider">
                ВРАТА РИСКА
              </p>
              <p className="text-muted text-sm mb-4 text-center px-4">
                {stats.streak} побед подряд!
                <br />
                Войдешь во врата?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setRiskGateActive(true);
                    setShowRiskGatePrompt(false);
                  }}
                  className="px-4 py-2 text-sm font-bold bg-amber-500/20 border border-amber-500 text-amber-400 hover:bg-amber-500/30"
                >
                  Войти
                </Button>
                <Button
                  onClick={handleSkipRiskGate}
                  className="px-4 py-2 text-sm bg-foreground/10 text-muted hover:bg-foreground/20"
                >
                  Пропустить
                </Button>
              </div>
            </div>
          )}

          {/* Risk gate pick overlay */}
          {riskGateActive && !riskGateChoice && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70">
              <p className="text-amber-400 text-lg font-bold font-mono mb-1 tracking-wider">
                ВЫБЕРИ ВРАТА
              </p>
              <p className="text-muted text-xs mb-4">Какая сторона принесет удачу?</p>
              <div className="flex gap-6">
                <button
                  onClick={() => handleRiskGatePick("left")}
                  className="flex flex-col items-center gap-1 px-6 py-3 border-2 border-highlight-high bg-background hover:border-amber-500/60 hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  <span className="text-2xl font-bold font-mono text-c4a7e7">←</span>
                  <span className="text-sm font-bold text-text">ЛЕВЫЕ</span>
                  <span className="text-[10px] text-muted">x2 бонус</span>
                </button>
                <button
                  onClick={() => handleRiskGatePick("right")}
                  className="flex flex-col items-center gap-1 px-6 py-3 border-2 border-highlight-high bg-background hover:border-amber-500/60 hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  <span className="text-2xl font-bold font-mono text-eb6f92">→</span>
                  <span className="text-sm font-bold text-text">ПРАВЫЕ</span>
                  <span className="text-[10px] text-muted">x2 бонус</span>
                </button>
              </div>
              <p className="text-[10px] text-muted mt-4 px-8 text-center">
                Одна сторона получит усиление, другая - ловушку
              </p>
              <Button
                onClick={handleSkipRiskGate}
                className="mt-2 px-3 py-1 text-xs bg-foreground/5 text-muted hover:bg-foreground/10"
              >
                Отмена
              </Button>
            </div>
          )}
        </section>
      </div>

      <section className="flex w-full gap-0.5 px-1 py-1 border-2 border-highlight-high bg-background overflow-x-auto items-center justify-center">
        {(() => {
          const slotWidths = getSlotWidths(bid);
          return PACHINKO_SLOT_MULTIPLIERS.map((mult, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-none flex-col items-center justify-center py-1 rounded text-[10px] font-mono font-bold border transition-colors",
                highlightSlot === i ? "border-white/70 scale-105 z-10" : "border-transparent",
              )}
              style={{
                width: `${(slotWidths[i] / BOARD_WIDTH) * 95}%`,
                color: slotColor(mult),
                backgroundColor: `${slotColor(mult)}22`,
              }}
            >
              <span>{mult}x</span>
            </div>
          ));
        })()}
      </section>

      <BidSelector
        bidOptions={bidOptions}
        bid={bid}
        onBidChange={setBid}
        disabled={inDrop || dropMutation.isPending || countdown !== null}
      />

      <section className="flex w-full items-center justify-center gap-1.5 border-2 border-highlight-high bg-background px-3 py-1.5">
        <span className="text-sm text-muted mr-1">Крыс</span>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            onClick={() => setRatAmount(v)}
            disabled={inDrop || dropMutation.isPending || countdown !== null}
            className={
              "min-w-8 h-8 rounded text-sm font-semibold transition-colors cursor-pointer " +
              (ratAmount === v
                ? "bg-highlight-high text-background"
                : "bg-foreground/10 text-muted hover:bg-foreground/20") +
              (inDrop || dropMutation.isPending || countdown !== null
                ? " opacity-40 pointer-events-none"
                : "")
            }
          >
            {v}
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-1 w-full mt-auto">
        {showRiskGatePrompt ? (
          <Button
            variant="info"
            className="w-full h-11 animate-pulse text-amber-400 border-amber-500"
            disabled={!canAct}
            onClick={handleDrop}
          >
            ВРАТА РИСКА • {stats.streak} побед
          </Button>
        ) : riskGateActive ? (
          <Button variant="info" className="w-full h-11" disabled>
            Выбери сторону...
          </Button>
        ) : (
          <Button
            variant="info"
            className="w-full h-11"
            loading={dropMutation.isPending}
            disabled={!canAct}
            onClick={handleDrop}
          >
            {gamblingBanned
              ? "Вы забанены"
              : countdown !== null
                ? `...${countdown}`
                : inDrop
                  ? "Крыса летит..."
                  : !isPachinkoDev && ticketBalance < totalBid
                    ? "Недостаточно тикетов"
                    : `Бросить крысу (${totalBid})`}
          </Button>
        )}
      </section>
    </main>
  );
}

export default memo(PachinkoTab);
