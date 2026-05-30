import { memo, useEffect, useRef } from "react";
import { useDataStore } from "@/store/data.store";
import { getCellCenter } from "@/lib/cell.utils";

const STEP_DURATION = 500;

function MovingUserOverlay() {
  const movingUser = useDataStore((state) => state.movingUser);
  const nextStep = useDataStore((state) => state.nextStep);
  const finishMoving = useDataStore((state) => state.finishMoving);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!movingUser) return;

    timeoutRef.current = window.setTimeout(() => {
      nextStep();
    }, STEP_DURATION);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [movingUser?.currentStep, nextStep]);

  useEffect(() => {
    if (movingUser && movingUser.currentStep >= movingUser.path.length - 1) {
      finishMoving();
    }
  }, [movingUser?.currentStep, movingUser?.path?.length, finishMoving]);

  if (!movingUser || !movingUser.isAnimating) return null;

  const currentCell = movingUser.path[movingUser.currentStep];
  const position = getCellCenter(currentCell);

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
        transition: `left ${STEP_DURATION}ms ease-out, top ${STEP_DURATION}ms ease-out`,
      }}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg"
        style={{
          backgroundColor: movingUser.userId ? "#888" : "#888",
        }}
      />
    </div>
  );
}

export default memo(MovingUserOverlay);
