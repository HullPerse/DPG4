import { useUserStore } from "@/store/user.store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button.component";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  memo,
  lazy,
  Suspense,
} from "react";
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
  randomDropOffsetX,
  slotColor,
  type PachinkoUiResult,
} from "@/lib/gambling/pachinko.utils";
import { useBidOptions, useGamblingStore } from "@/hooks/use-gambling";
import { BalanceDisplay } from "../components/balance.component";
import { BidSelector } from "../components/bid.component";
import { GameResult } from "../components/result.component";

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
  const { user, balance, gamblingBanned, setGamblingBanned } =
    useGamblingStore();
  const bidOptions = useBidOptions();

  const [gameState, setGameState] = useState<PachinkoState>(IDLE_STATE);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const [loading, setLoading] = useState(false);
  const [bid, setBid] = useState<number>(3);

  const [dropKey, setDropKey] = useState(0);
  const [startX, setStartX] = useState(0);
  const [result, setResult] = useState<PachinkoUiResult | null>(null);
  const settlingRef = useRef(false);
  const [kickTrigger, setKickTrigger] = useState(0);
  const [showKickButton, setShowKickButton] = useState(false);
  const kickPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inDrop = gameState.phase === "dropping";
  const roundDone = gameState.phase === "done";
  const showRat = inDrop || roundDone;
  const canAct = !loading && !inDrop && !gamblingBanned && balance >= bid;
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

  const handleDrop = async () => {
    if (!user || loading || inDrop || gamblingBanned || balance < bid) return;
    setLoading(true);
    setResult(null);
    settlingRef.current = false;

    const offset = randomDropOffsetX();
    setStartX(offset);

    try {
      const state = await dropPachinko(bid);
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
        const state = await settlePachinko(slot);
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

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      <BalanceDisplay balance={balance} />

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
            kickTrigger={kickTrigger}
          />
        </Suspense>
        <GameResult result={result} />
        {showKickButton && inDrop && (
          <Button
            onClick={handleKick}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 px-4 py-2 text-lg font-bold"
          >
            Пнуть
          </Button>
        )}
        {!showRat && !result && (
          <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none">
            <p className="text-muted text-sm font-mono tracking-widest">
              ПАЧИНКО
            </p>
          </div>
        )}
      </section>

      <BidSelector
        bidOptions={bidOptions}
        bid={bid}
        onBidChange={setBid}
        disabled={inDrop || loading}
      />

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
