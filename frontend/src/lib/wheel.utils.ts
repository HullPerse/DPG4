import { EasingAnimation, WheelItem } from "@/types/wheel";
import { ITEM_WIDTH, MIN_ITEMS_FOR_ROLL } from "@/config/wheel.config";

const EASE_FN = easeOutCubic;

export function duplicateItemsToMinimum(
  items: WheelItem[],
  minCount: number = MIN_ITEMS_FOR_ROLL,
): WheelItem[] {
  if (items.length === 0 || items.length >= minCount) return items;

  const duplicated: WheelItem[] = [];
  const timesToRepeat = Math.ceil(minCount / items.length);

  for (let i = 0; i < timesToRepeat; i++) {
    duplicated.push(...items);
  }

  return duplicated.slice(0, minCount);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function getCenteredItem(
  scrollPosition: number,
  containerWidth: number,
  itemCount: number,
  itemWidth: number = ITEM_WIDTH,
): number {
  if (itemCount === 0 || itemWidth <= 0) return -1;
  const centerX = containerWidth / 2;
  const currentCenterPosition = scrollPosition + centerX;

  const approxIndex = Math.round(
    (currentCenterPosition - itemWidth / 2) / itemWidth,
  );

  const clampedIndex = Math.max(0, Math.min(itemCount - 1, approxIndex));
  return clampedIndex;
}

function calculateTargetScroll(
  winnerIndex: number,
  containerWidth: number,
  itemWidth: number = ITEM_WIDTH,
): number {
  return winnerIndex * itemWidth + itemWidth / 2 - containerWidth / 2;
}

/** Scroll position that centers the winner, clamped to the track bounds. */
export function buildSpinTargetScroll(
  winnerIndex: number,
  itemCount: number,
  containerWidth: number,
  itemWidth: number = ITEM_WIDTH,
): number {
  const maxScroll = Math.max(0, itemCount * itemWidth - containerWidth);
  const winnerScroll = calculateTargetScroll(
    winnerIndex,
    containerWidth,
    itemWidth,
  );
  return Math.max(0, Math.min(winnerScroll, maxScroll));
}

export function runAnimation(
  animateCallback: (timestamp: number) => void,
  animationFrameRef: React.MutableRefObject<number | null>,
  delayMs = 50,
): void {
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
  }
  window.setTimeout(() => {
    animationFrameRef.current = requestAnimationFrame(animateCallback);
  }, delayMs);
}

export function createEasingAnimation(
  currentScroll: number,
  targetScroll: number,
  duration: number,
): EasingAnimation {
  return {
    startTime: 0,
    startScroll: currentScroll,
    targetScroll,
    duration,
  };
}

export function updateEasingAnimation(
  timestamp: number,
  state: EasingAnimation,
): { scrollPosition: number; isCompleted: boolean } {
  if (state.startTime === 0) {
    state.startTime = timestamp;
  }

  const elapsed = timestamp - state.startTime;
  const progress = Math.min(elapsed / state.duration, 1);
  const eased = EASE_FN(progress);

  const scrollPosition =
    state.startScroll + (state.targetScroll - state.startScroll) * eased;

  return {
    scrollPosition,
    isCompleted: progress >= 1,
  };
}
