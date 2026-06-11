import { useUserStore } from "@/store/user.store";
import { Button } from "@/components/ui/button.component";
import { useState, useCallback, memo, lazy, Suspense } from "react";
import { useMutation } from "@tanstack/react-query";
import { spinWheel } from "@/api/gambling.api";
const WheelScene = lazy(() => import("../components/scenes/scene.wheel"));
import type { WheelState } from "@/types/gamble";
import { useBidOptions, useGamblingStore } from "@/hooks/use-gambling";
import { BalanceDisplay } from "../components/balance.component";
import { BidSelector } from "../components/bid.component";
import { GameResult } from "../components/result.component";

function WheelTab() {
  const { user, balance, gamblingBanned, setGamblingBanned } =
    useGamblingStore();
  const bidOptions = useBidOptions();

  const [bid, setBid] = useState<number>(3);
  const [spinning, setSpinning] = useState(false);
  const [targetSegment, setTargetSegment] = useState<number | null>(null);
  const [result, setResult] = useState<{
    net: number;
    label: string;
    tone: string;
  } | null>(null);
  const [spinKey, setSpinKey] = useState(0);

  const spinMutation = useMutation({
    mutationFn: () => spinWheel(bid),
    onSuccess: (state: WheelState) => {
      setTargetSegment(state.segment);
      setSpinning(true);
      useUserStore.setState({ user: { ...user!, money: state.balance } });
      if (state.banned) setGamblingBanned(true);
      setResult({ net: state.net, label: state.label, tone: state.tone });
    },
  });

  const handleSpinComplete = useCallback(() => {
    setSpinning(false);
  }, []);

  const canSpin =
    !spinMutation.isPending && !spinning && !gamblingBanned && balance >= bid;

  return (
    <main className="flex h-full w-full flex-col items-center gap-2 p-2">
      <BalanceDisplay balance={balance} />

      <section className="relative w-full flex-1 min-h-80 max-h-128 overflow-hidden border-2 border-highlight-high bg-background">
        <Suspense fallback={null}>
          <WheelScene
            key={spinKey}
            spinning={spinning}
            targetSegment={targetSegment}
            onSpinComplete={handleSpinComplete}
          />
        </Suspense>
        <GameResult result={result} />
        {!spinning && !result && (
          <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none">
            <p className="text-muted text-sm font-mono tracking-widest">
              КОЛЕСО
            </p>
          </div>
        )}
      </section>

      <BidSelector
        bidOptions={bidOptions}
        bid={bid}
        onBidChange={setBid}
        disabled={spinning || spinMutation.isPending}
      />

      <section className="flex flex-col gap-1 w-xl mt-auto">
        <Button
          variant="info"
          className="w-full h-11"
          loading={spinMutation.isPending}
          disabled={!canSpin}
          onClick={() => {
            setResult(null);
            setTargetSegment(null);
            setSpinKey((k) => k + 1);
            spinMutation.mutate();
          }}
        >
          {gamblingBanned
            ? "Вы забанены"
            : spinning
              ? "Крутится..."
              : balance < bid
                ? "Недостаточно чубриков"
                : `Крутить (${bid})`}
        </Button>
      </section>
    </main>
  );
}

export default memo(WheelTab);
