import { AnimationState, WheelItem } from "@/types/wheel";
import { shuffleArray } from "./utils";

export function duplicateItemsToMinimum(
  items: WheelItem[],
  minCount: number,
): WheelItem[] {
  if (items.length === 0 || items.length >= minCount) return items;

  const duplicated: WheelItem[] = [];
  const timesToRepeat = Math.ceil(minCount / items.length);

  for (let i = 0; i < timesToRepeat; i++) {
    duplicated.push(...items);
  }

  return duplicated.slice(0, minCount);
}

export function updateWheelAnimation(
  timestamp: number,
  state: AnimationState,
  rollDuration: number,
  friction: number,
): { velocity: number; scrollDelta: number; isCompleted: boolean } {
  if (state.startTime === 0) {
    state.startTime = timestamp;
  }

  const elapsed = timestamp - state.startTime;
  const progress = Math.min(elapsed / rollDuration, 1);

  if (progress < 1) {
    const velocity = 25 * (1 - progress) + 0.5;

    return { velocity: velocity, scrollDelta: velocity, isCompleted: false };
  }

  const velocity = state.velocity * friction;

  return {
    velocity: velocity,
    scrollDelta: velocity,
    isCompleted: Math.abs(velocity) <= 0.1,
  };
}

export function getCenteredItem(
  scrollPosition: number,
  containerWidth: number,
  itemCount: number,
  itemWidth: number,
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

export function rollPrepare(items: WheelItem[], minItems: number) {
  if (items.length === 0) return [];

  const rollItems = duplicateItemsToMinimum(shuffleArray(items), minItems);

  return rollItems;
}

export function rollAnimation(
  animateCallback: (timestamp: number) => void,
  animationFrameRef: React.RefObject<number | null>,
): void {
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
  }
  setTimeout(() => {
    animationFrameRef.current = requestAnimationFrame(animateCallback);
  }, 50);
}
