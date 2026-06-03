import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";
import { Button } from "@/components/ui/button.component";
import { useCallback, useEffect, useRef, useState, memo, lazy, Suspense } from "react";
import { cn } from "@/lib/utils";
import {
  dropPachinko,
  settlePachinko,
  syncPachinko,
  abandonPachinko,
} from "@/api/gambling.api";
const PachinkoScene = lazy(() => import("../components/scene.pachinko"));
import { SmallLoader } from "@/components/shared/loader.component";
import type { PachinkoState } from "@/types/gamble";
import {
  BOARD_WIDTH,
  PACHINKO_SLOT_MULTIPLIERS,
  getSlotWidths,
  formatPachinkoResultLabel,
  getPachinkoResultColor,
  randomDropOffsetX,
  slotColor,
  type PachinkoUiResult,
} from "@/lib/gambling/pachinko.utils";

const BIDS = [1, 2, 3, 5, 8, 10] as const;

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
};

function PachinkoTab() {
  const user = useUserStore((state) => state.user);
  const gamblingBanned = useDataStore((state) => state.gamblingBanned);
  const setGamblingBanned = useDataStore((state) => state.setGamblingBanned);

  const [gameState, setGameState] = useState<PachinkoState>(IDLE_STATE);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [loading, setLoading] = useState(false);
  const [bid, setBid] = useState<number>(3);
  const [dropKey, setDropKey] = useState(0);
  const [startX, setStartX] = useState(0);
  const [result, setResult] = useState<PachinkoUiResult | null>(null);
  const settlingRef = useRef(false);
  const balance = user?.money ?? 0;

  const inDrop = gameState.phase === "dropping";
  const roundDone = gameState.phase === "done";
  const showRat = inDrop || roundDone;
  const canAct = !loading && !inDrop && !gamblingBanned && balance >= bid;
  const highlightSlot = roundDone ? gameState.slotIndex : null;

  useEffect(() => {
    if (!user) return;
    syncPachinko(String(user.id))
      .then((state) => {
        if (state.phase === "dropping") {
          setGameState(state);
          setDropKey((k) => k + 1);
          setStartX(randomDropOffsetX());
          settlingRef.current = false;
        }
      })
      .catch(() => {});
  }, [user?.id]);

  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user ? String(user.id) : null;

  useEffect(() => {
    return () => {
      const uid = userIdRef.current;
      if (uid && gameStateRef.current.phase === "dropping") {
        abandonPachinko(uid).catch(() => {});
      }
    };
  }, []);

  const handleDrop = async () => {
    if (!user || loading || inDrop || gamblingBanned || balance < bid) return;
    setLoading(true);
    setResult(null);
    settlingRef.current = false;

    const offset = randomDropOffsetX();
    setStartX(offset);

    try {
      const state = await dropPachinko(String(user.id), bid);
      setGameState(state);
      setDropKey((k) => k + 1);
      useUserStore.setState({ user: { ...user, money: state.balance } });
      setLoading(false);
    } catch {
      setLoading(false);
      setGameState(IDLE_STATE);
    }
  };

  const handleSettled = useCallback(
    async (slotIndex: number) => {
      if (
        !user ||
        settlingRef.current ||
        gameStateRef.current.phase !== "dropping"
      )
        return;
      settlingRef.current = true;

      const slot = Math.max(
        0,
        Math.min(PACHINKO_SLOT_MULTIPLIERS.length - 1, Math.floor(slotIndex)),
      );

      try {
        const state = await settlePachinko(String(user.id), slot);
        setGameState(state);
        useUserStore.setState({ user: { ...user, money: state.balance } });
        if (state.banned) setGamblingBanned(true);
        setResult({
          net: state.net,
          label: formatPachinkoResultLabel(state.label, state.net),
          tone: state.tone || "chance",
        });
      } catch {
        setGameState(IDLE_STATE);
        setResult(null);
      }
    },
    [user, setGamblingBanned],
  );

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      <section className="flex flex-col w-xl items-stretch gap-1 border-2 border-highlight-high bg-background px-2 py-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Баланс</span>
          <span className="text-lg font-bold">{balance} чубриков</span>
        </div>
      </section>

      <section className="flex w-xl gap-0.5 px-1 py-1 border-2 border-highlight-high bg-background overflow-x-auto items-center justify-center">
        {(() => {
          const slotWidths = getSlotWidths(bid);
          return PACHINKO_SLOT_MULTIPLIERS.map((mult, i) => (
            <div
              key={i}
              className={cn(
                "flex flex-none flex-col items-center justify-center py-1 rounded text-[10px] font-mono font-bold border transition-colors",
                highlightSlot === i
                  ? "border-white/70 scale-105 z-10"
                  : "border-transparent",
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

      <section className="relative w-full flex-1 min-h-80 max-h-128 overflow-hidden border-2 border-highlight-high bg-background">
        <Suspense fallback={null}>
          <PachinkoScene
            dropKey={dropKey}
            startX={startX}
            showRat={showRat}
            simulating={inDrop}
            highlightIndex={highlightSlot}
            onSettled={handleSettled}
            bid={bid}
          />
        </Suspense>
        {result && (
          <span
            className={cn(
              "absolute top-0 left-1/2 -translate-x-1/2 text-center text-lg font-bold w-full px-1 py-1 bg-black/85",
              getPachinkoResultColor(result),
            )}
          >
            {result.label}
          </span>
        )}
        {!showRat && !result && (
          <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none">
            <p className="text-muted text-sm font-mono tracking-widest">
              ПАЧИНКО
            </p>
          </div>
        )}
      </section>

      <section className="flex w-xl items-center justify-center gap-1.5 border-2 border-highlight-high bg-background px-3 py-1.5">
        <span className="text-sm text-muted mr-1">Ставка</span>
        {BIDS.map((v) => (
          <button
            key={v}
            onClick={() => setBid(v)}
            disabled={inDrop || loading}
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
        <Button
          variant="info"
          className="w-full h-11"
          onClick={handleDrop}
          disabled={!canAct}
        >
          {gamblingBanned ? (
            "Вы забанены"
          ) : loading ? (
            <SmallLoader />
          ) : inDrop ? (
            "Крыса летит..."
          ) : balance < bid ? (
            "Недостаточно чубриков"
          ) : (
            `Бросить крысу (${bid})`
          )}
        </Button>
      </section>
    </main>
  );
}

export default memo(PachinkoTab);
