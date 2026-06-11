import { useUserStore } from "@/store/user.store";
import { Button } from "@/components/ui/button.component";
import {
  useCallback,
  useState,
  useRef,
  useEffect,
  memo,
  lazy,
  Suspense,
} from "react";
import { useMutation } from "@tanstack/react-query";
import {
  startMines,
  revealMines,
  cashoutMines,
  abortMines,
} from "@/api/gambling.api";
const MinesScene = lazy(() => import("../components/scene.mines"));
import type { MinesState } from "@/types/gamble";
import { MINES_GRID } from "@/lib/gambling/gamble.constants";
import {
  MINE_COUNT_OPTIONS,
  formatMultiplier,
} from "@/lib/gambling/mines.utils";
import { useBidOptions, useGamblingStore } from "@/hooks/use-gambling";
import { BalanceDisplay } from "../components/balance.component";
import { BidSelector } from "../components/bid.component";
import { GameResult } from "../components/result.component";

const IDLE_STATE: MinesState = {
  phase: "playing",
  x: -1,
  y: -1,
  isMine: false,
  currentMultiplier: 1,
  revealed: Array.from({ length: MINES_GRID }, () =>
    Array(MINES_GRID).fill(false),
  ),
  payout: 0,
  net: 0,
  label: "",
  tone: "",
  balance: 0,
  banned: false,
};

function MinesTab() {
  const { user, balance, gamblingBanned, setGamblingBanned } =
    useGamblingStore();
  const bidOptions = useBidOptions();

  const [gameState, setGameState] = useState<MinesState>(IDLE_STATE);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [bid, setBid] = useState<number>(3);
  const [mineCount, setMineCount] = useState<number>(3);
  const [resetKey, setResetKey] = useState(0);
  const [result, setResult] = useState<{
    net: number;
    label: string;
    tone: string;
  } | null>(null);

  const gameStarted = gameState.revealed.some((r) => r.some((c) => c));
  const gameOver = gameState.phase === "lost";

  const startMutation = useMutation({
    mutationFn: () => startMines(bid, mineCount),
    onSuccess: (state) => {
      setResult(null);
      setResetKey((k) => k + 1);
      setGameState(state);
      useUserStore.setState({ user: { ...user!, money: state.balance } });
    },
  });

  const revealMutation = useMutation({
    mutationFn: ({ x, y }: { x: number; y: number }) => revealMines(x, y),
    onSuccess: (state) => {
      setGameState(state);
      if (state.phase === "lost") {
        useUserStore.setState({ user: { ...user!, money: state.balance } });
        setResult({ net: state.net, label: state.label, tone: state.tone });
      }
    },
  });

  const cashoutMutation = useMutation({
    mutationFn: () => cashoutMines(),
    onSuccess: (state) => {
      setGameState(state);
      useUserStore.setState({ user: { ...user!, money: state.balance } });
      if (state.banned) setGamblingBanned(true);
      setResult({ net: state.net, label: state.label, tone: state.tone });
    },
  });

  useEffect(() => {
    return () => {
      if (
        gameStateRef.current.phase === "playing" &&
        gameStateRef.current.revealed.some((r) => r.some((c) => c))
      ) {
        abortMines().catch(() => {});
      }
    };
  }, []);

  const handleReveal = useCallback(
    (row: number, col: number) => {
      if (revealMutation.isPending || gameOver) return;
      revealMutation.mutate({ x: row, y: col });
    },
    [revealMutation.isPending, gameOver],
  );

  const canStart =
    !startMutation.isPending &&
    !gamblingBanned &&
    balance >= bid &&
    !gameStarted;

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      <BalanceDisplay balance={balance} />

      <section className="relative w-full flex-1 min-h-80 max-h-128 overflow-hidden border-2 border-highlight-high bg-background">
        <Suspense fallback={null}>
          <MinesScene
            revealed={gameState.revealed}
            minePositions={gameState.minePositions}
            phase={gameState.phase}
            onReveal={handleReveal}
            disabled={revealMutation.isPending}
            resetKey={resetKey}
          />
        </Suspense>
        <GameResult result={result} />
        {!gameStarted && !result && (
          <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none">
            <p className="text-muted text-sm font-mono tracking-widest">
              Минное поле
            </p>
          </div>
        )}
        {gameStarted && !gameOver && !cashoutMutation.isPending && (
          <div className="absolute top-2 right-2 flex flex-col items-end gap-1 pointer-events-none">
            <span className="text-sm font-bold tabular-nums text-amber-400 bg-black/60 px-2 py-0.5 rounded">
              {formatMultiplier(gameState.currentMultiplier)}
            </span>
          </div>
        )}
      </section>

      <BidSelector
        bidOptions={bidOptions}
        bid={bid}
        onBidChange={setBid}
        disabled={gameStarted}
      />

      <section className="flex w-xl items-center justify-center gap-1.5 border-2 border-highlight-high bg-background px-3 py-1.5">
        <span className="text-sm text-muted mr-1">Мин</span>
        {MINE_COUNT_OPTIONS.map((v) => (
          <button
            key={v}
            onClick={() => setMineCount(v)}
            disabled={gameStarted}
            className={
              "min-w-8 h-8 rounded text-sm font-semibold transition-colors cursor-pointer " +
              (mineCount === v
                ? "bg-highlight-high text-background"
                : "bg-foreground/10 text-muted hover:bg-foreground/20") +
              (gameStarted ? " opacity-40 pointer-events-none" : "")
            }
          >
            {v}
          </button>
        ))}
      </section>

      <section className="flex flex-col gap-1 w-xl mt-auto">
        {!gameStarted ? (
          <Button
            variant="info"
            className="w-full h-11"
            loading={startMutation.isPending}
            disabled={!canStart}
            onClick={() => startMutation.mutate()}
          >
            {gamblingBanned
              ? "Вы забанены"
              : balance < bid
                ? "Недостаточно чубриков"
                : `Начать игру (${bid})`}
          </Button>
        ) : gameOver ? (
          <Button
            variant="info"
            className="w-full h-11"
            onClick={() => {
              setGameState(IDLE_STATE);
              setResult(null);
              setResetKey((k) => k + 1);
            }}
          >
            Новая игра
          </Button>
        ) : (
          <Button
            variant="success"
            className="w-full h-11"
            loading={cashoutMutation.isPending}
            disabled={cashoutMutation.isPending}
            onClick={() => cashoutMutation.mutate()}
          >
            Забрать ({formatMultiplier(gameState.currentMultiplier)})
          </Button>
        )}
      </section>
    </main>
  );
}

export default memo(MinesTab);
