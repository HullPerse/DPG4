import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { Button } from "../ui/button.component";
import { EasingAnimation, WheelItem, WheelRoll } from "@/types/wheel";
import {
  getCenteredItem,
  duplicateItemsToMinimum,
  buildSpinTargetScroll,
  updateEasingAnimation,
  createEasingAnimation,
  runAnimation,
} from "@/lib/wheel.utils";
import {
  ITEM_WIDTH,
  MIN_ITEMS_FOR_ROLL,
  ANIMATION_DURATION_MIN,
  ANIMATION_DURATION_MAX,
} from "@/config/wheel.config";
import renderWheelItems from "./renderer.component";
import { spinWheel } from "@/api/wheel.api";
import { shuffleArray } from "@/lib/utils";
import { calculateCostSync } from "@/lib/utils";
import { useUserStore } from "@/store/user.store";
import { RefreshCcw } from "lucide-react";

function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type SpinPlan = {
  shuffled: WheelItem[];
  winnerIndex: number;
};

function Wheel({
  list,
  onResult,
  free = true,
  listType,
}: {
  list: WheelItem[];
  onResult: (item: WheelItem | null) => void;
  free?: boolean;
  listType?: string;
}) {
  const user = useUserStore((state) => state.user);
  const refreshUser = useUserStore((state) => state.refresh);

  const [rolling, setRolling] = useState<WheelRoll>({
    isRolling: false,
    hasRolled: false,
  });
  const [shuffled, setShuffled] = useState<WheelItem[]>(list);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef(0);
  const lastHighlightRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const easingRef = useRef<EasingAnimation>({
    startTime: 0,
    startScroll: 0,
    targetScroll: 0,
    duration: 0,
  });
  const winnerRef = useRef<number>(-1);
  const spinStartedRef = useRef(false);
  const [pendingSpin, setPendingSpin] = useState<SpinPlan | null>(null);
  const onResultRef = useRef(onResult);
  const shuffledRef = useRef(shuffled);

  onResultRef.current = onResult;
  shuffledRef.current = shuffled;

  const spinCost = calculateCostSync();

  const setHighlight = useCallback((index: number) => {
    if (index < 0 || lastHighlightRef.current === index) return;
    lastHighlightRef.current = index;
    setHighlightedIndex(index);
  }, []);

  const updateCenterHighlight = useCallback(() => {
    if (!containerRef.current || shuffledRef.current.length === 0) return;

    const centerIndex = getCenteredItem(
      scrollPositionRef.current,
      containerRef.current.parentElement?.clientWidth ?? 0,
      shuffledRef.current.length,
      ITEM_WIDTH,
    );

    setHighlight(centerIndex);
  }, [setHighlight]);

  const finalizeSpin = useCallback(() => {
    const items = shuffledRef.current;
    if (items.length === 0) return;

    const wIndex = winnerRef.current;
    const selectedItem =
      wIndex >= 0 && wIndex < items.length ? items[wIndex] : items[0];

    lastHighlightRef.current = wIndex;
    setHighlightedIndex(wIndex >= 0 ? wIndex : 0);
    onResultRef.current(selectedItem);
  }, []);

  const animate = useCallback(
    (timestamp: number) => {
      const state = easingRef.current;
      if (!state) return;

      const result = updateEasingAnimation(timestamp, state);
      scrollPositionRef.current = result.scrollPosition;

      if (containerRef.current) {
        containerRef.current.style.transform = `translateX(-${scrollPositionRef.current}px)`;
        updateCenterHighlight();
      }

      if (result.isCompleted) {
        spinStartedRef.current = false;
        setPendingSpin(null);
        setRolling({
          isRolling: false,
          hasRolled: true,
        });
        finalizeSpin();
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    },
    [updateCenterHighlight, finalizeSpin],
  );

  const startSpinAnimation = useCallback(
    (winnerIndex: number, itemCount: number) => {
      const containerWidth =
        containerRef.current?.parentElement?.clientWidth ?? 0;
      const targetScroll = buildSpinTargetScroll(
        winnerIndex,
        itemCount,
        containerWidth,
      );
      const duration = randomInRange(
        ANIMATION_DURATION_MIN,
        ANIMATION_DURATION_MAX,
      );

      scrollPositionRef.current = 0;
      if (containerRef.current) {
        containerRef.current.style.transform = "translateX(0px)";
      }

      easingRef.current = createEasingAnimation(0, targetScroll, duration);
      runAnimation(animate, animationFrameRef);
    },
    [animate],
  );

  useLayoutEffect(() => {
    if (!pendingSpin || !rolling.isRolling || spinStartedRef.current) return;

    spinStartedRef.current = true;
    winnerRef.current = pendingSpin.winnerIndex;
    startSpinAnimation(pendingSpin.winnerIndex, pendingSpin.shuffled.length);
  }, [pendingSpin, shuffled, rolling.isRolling, startSpinAnimation]);

  useLayoutEffect(() => {
    if (!rolling.isRolling && !rolling.hasRolled) {
      updateCenterHighlight();
    }
  }, [rolling.isRolling, rolling.hasRolled, updateCenterHighlight]);

  useEffect(() => {
    if (!rolling.isRolling && !rolling.hasRolled) {
      setShuffled(list);
    }
  }, [list, rolling.isRolling, rolling.hasRolled]);

  useEffect(() => {
    const onResize = () => {
      if (!rolling.isRolling && !rolling.hasRolled) updateCenterHighlight();
    };

    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [rolling.isRolling, rolling.hasRolled, updateCenterHighlight]);

  const queueSpin = useCallback((plan: SpinPlan) => {
    setShuffled(plan.shuffled);
    setPendingSpin(plan);
  }, []);

  const handleRoll = useCallback(
    async (type: "general" | "refresh") => {
      if (rolling.isRolling || list.length === 0) return;

      setError(null);
      spinStartedRef.current = false;
      setPendingSpin(null);
      lastHighlightRef.current = null;
      setHighlightedIndex(null);
      onResultRef.current(null);
      setRolling({
        isRolling: true,
        hasRolled: false,
      });

      if (containerRef.current) {
        scrollPositionRef.current = 0;
        containerRef.current.style.transform = "translateX(0px)";
      }

      const duplicated = duplicateItemsToMinimum(list, MIN_ITEMS_FOR_ROLL);

      if (type === "refresh") {
        const localShuffled = shuffleArray(duplicated);
        const winnerIndex = Math.floor(Math.random() * localShuffled.length);
        queueSpin({ shuffled: localShuffled, winnerIndex });
        return;
      }

      try {
        const response = await spinWheel(duplicated, free, listType);
        if (!free) void refreshUser();
        queueSpin({
          shuffled: response.shuffled,
          winnerIndex: response.winnerIndex,
        });
      } catch (err) {
        spinStartedRef.current = false;
        setPendingSpin(null);
        setRolling({
          isRolling: false,
          hasRolled: false,
        });
        setError(
          err instanceof Error ? err.message : "Не удалось крутить колесо",
        );
      }
    },
    [rolling.isRolling, list, free, listType, queueSpin, refreshUser],
  );

  const canAfford = free || Number(user?.money ?? 0) >= spinCost;

  return (
    <main className="flex flex-col gap-2 w-full items-center">
      <section className="relative w-3xl max-w-full h-32 overflow-hidden border-2 border-highlight-high bg-card mx-auto">
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-green-500 z-20" />
        <div
          ref={containerRef}
          className="flex flex-row gap-2 items-center h-full will-change-transform"
        >
          {renderWheelItems(
            shuffled,
            rolling.isRolling,
            rolling.hasRolled,
            highlightedIndex,
            onResult,
          )}
        </div>
      </section>
      {error && (
        <p className="text-sm text-red-500 text-center px-2" role="alert">
          {error}
        </p>
      )}
      <div className="flex flex-row gap-1 w-full items-center justify-center">
        <Button
          variant="success"
          disabled={rolling.isRolling || list.length === 0 || !canAfford}
          className="w-md flex-1 max-w-xl"
          onClick={() => handleRoll("general")}
        >
          {rolling.isRolling
            ? "ВРАЩЕНИЕ..."
            : !free
              ? `КРУТИТЬ ЗА ${spinCost} чб. [${user?.money ?? 0} всего]`
              : "КРУТИТЬ"}
        </Button>
        {!free && (
          <Button
            variant="info"
            size="icon"
            disabled={rolling.isRolling}
            title="Перемешать без списания"
            onClick={() => handleRoll("refresh")}
          >
            <RefreshCcw />
          </Button>
        )}
      </div>
    </main>
  );
}

export default memo(Wheel);
