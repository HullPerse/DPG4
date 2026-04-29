import {
  memo,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "../ui/button.component";
import { AnimationState, WheelItem, WheelRoll } from "@/types/wheel";
import {
  getCenteredItem,
  rollAnimation,
  rollPrepare,
  updateWheelAnimation,
} from "@/lib/wheel.utils";
import {
  DEFAULT_FRICTION,
  DEFAULT_ROLL_DURATION,
  ITEM_WIDTH,
  MIN_ITEMS_FOR_ROLL,
} from "@/config/wheel.config";
import renderWheelItems from "./renderer.component";
import { calculateCost } from "@/lib/utils";
import { useUserStore } from "@/store/user.store";
import { useDataStore } from "@/store/data.store";
import UserApi from "@/api/user.api";
import { RefreshCcw } from "lucide-react";
const userApi = new UserApi();

function Wheel({
  list,
  onResult,
  free = true,
}: {
  list: WheelItem[];
  onResult: (item: WheelItem | null) => void;
  free?: boolean;
}) {
  const user = useUserStore((state) => state.user);

  //states
  const [rolling, setRolling] = useState<WheelRoll>({
    isRolling: false,
    hasRolled: false,
  });
  const [shuffled, setShuffled] = useState<WheelItem[]>(list);

  //refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionRef = useRef(0);
  const lastIndexRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number>(null);
  const animationStateRef = useRef<AnimationState>({
    startTime: 0,
    velocity: 0,
  });

  const updateCenterHighlight = useCallback(() => {
    if (!containerRef.current || shuffled.length === 0) return;

    const centerIndex: number = getCenteredItem(
      scrollPositionRef.current,
      containerRef.current.parentElement?.clientWidth ?? 0,
      shuffled.length,
      ITEM_WIDTH,
    );

    if (
      lastIndexRef.current &&
      containerRef.current.children[lastIndexRef.current]
    ) {
      const prevComponent = containerRef.current.children[lastIndexRef.current];

      prevComponent.classList.remove(
        "scale-105",
        "bg-primary/20",
        "border-primary",
      );
      prevComponent.classList.add("border-highlight-high");
    }

    if (centerIndex >= 0 && containerRef.current.children[centerIndex]) {
      const currComponent = containerRef.current.children[centerIndex];
      currComponent.classList.add(
        "scale-105",
        "bg-primary/20",
        "border-primary",
      );
      currComponent.classList.remove("border-highlight-high");
      lastIndexRef.current = centerIndex;
    } else {
      lastIndexRef.current = null;
    }
  }, []);

  const addWheelHistory = useDataStore((state) => state.addWheelHistory);

  const selectCenteredPreview = useCallback(() => {
    if (!containerRef.current || !rolling.hasRolled || shuffled.length === 0)
      return;

    const centerIndex: number = getCenteredItem(
      scrollPositionRef.current,
      containerRef.current.parentElement?.clientWidth ?? 0,
      shuffled.length,
      ITEM_WIDTH,
    );

    const selectedItem =
      centerIndex >= 0 && centerIndex < shuffled.length
        ? shuffled[centerIndex]
        : shuffled[0];

    if (selectedItem) {
      addWheelHistory({
        id: selectedItem.id,
        label: selectedItem.label,
        image: selectedItem.image,
        type: selectedItem.type,
        timestamp: new Date().toISOString(),
      });
    }

    return onResult(selectedItem);
  }, [shuffled, rolling.hasRolled, addWheelHistory]);

  //animate function
  const animate = useCallback(
    (timestamp: number) => {
      const state = animationStateRef.current;

      //if animation doesnt work remove this line
      if (!state) return;

      const wheelAnimation = updateWheelAnimation(
        timestamp,
        state,
        DEFAULT_ROLL_DURATION,
        DEFAULT_FRICTION,
      );

      state.velocity = wheelAnimation.velocity;
      scrollPositionRef.current += wheelAnimation.scrollDelta;

      if (containerRef.current) {
        containerRef.current.style.transform = `translateX(-${scrollPositionRef.current}px)`;
        updateCenterHighlight();
      }

      if (wheelAnimation.isCompleted) {
        setRolling({
          isRolling: false,
          hasRolled: true,
        });
        selectCenteredPreview();
      } else {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    },
    [updateCenterHighlight, selectCenteredPreview],
  );

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!rolling.isRolling) {
      updateCenterHighlight();

      if (rolling.hasRolled) selectCenteredPreview();
    }
  }, [rolling, updateCenterHighlight, selectCenteredPreview]);

  //recompute on data changes
  useEffect(() => {
    if (!rolling.isRolling) updateCenterHighlight();
  }, [updateCenterHighlight, rolling.isRolling]);

  //recompute on viewport resize
  useEffect(() => {
    const onResize = () => {
      if (!rolling.isRolling) updateCenterHighlight();
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [rolling.isRolling, updateCenterHighlight]);

  const handleRoll = useCallback(
    async (type: "general" | "refresh") => {
      if (rolling.isRolling) return;

      if (!free && type === "general") {
        const currentScore = await userApi.getUserScore(String(user?.id));

        if (currentScore < calculateCost()) return;

        await userApi.scoreUser(String(user?.id), -calculateCost());
      }

      const rollItems = rollPrepare(list, MIN_ITEMS_FOR_ROLL);

      onResult(null);
      setRolling({
        isRolling: true,
        hasRolled: false,
      });

      if (containerRef.current) {
        scrollPositionRef.current = 0;
        containerRef.current.style.transform = `translateX(0px)`;
      }

      setShuffled(rollItems);
      animationStateRef.current = {
        startTime: 0,
        velocity: 0,
      };

      rollAnimation(animate, animationFrameRef);
    },
    [rolling.isRolling, animate],
  );

  const renderedItems = useMemo(
    () => (
      <>
        {renderWheelItems(
          containerRef as RefObject<HTMLDivElement>,
          scrollPositionRef.current,
          shuffled,
          ITEM_WIDTH,
          rolling.isRolling,
          onResult,
        )}
      </>
    ),
    [shuffled, rolling.isRolling, containerRef, onResult],
  );

  return (
    <main className="flex flex-col gap-2 w-full items-center">
      <section className="relative w-3xl max-w-full h-32 overflow-hidden border-2 border-highlight-high bg-card mx-auto">
        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-green-500 z-20" />
        <div
          ref={containerRef}
          className="flex flex-row gap-2 items-center h-full will-change-transform"
        >
          {renderedItems}
        </div>
      </section>
      <div className="flex flex-row gap-1 w-full items-center justify-center">
        <Button
          variant="success"
          disabled={
            rolling.isRolling ||
            list.length === 0 ||
            (!free && Number(user?.money) < calculateCost())
          }
          className="w-md flex-1 max-w-xl"
          onClick={() => handleRoll("general")}
        >
          {rolling.isRolling
            ? "ВРАЩЕНИЕ..."
            : !free
              ? `КРУТИТЬ ЗА ${calculateCost()} чб. [${user?.money} всего]`
              : "КРУТИТЬ"}
        </Button>
        {!free && (
          <Button
            variant="info"
            size="icon"
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
