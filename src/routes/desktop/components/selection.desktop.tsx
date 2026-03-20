import { forwardRef, memo } from "react";

const Selection = forwardRef<HTMLDivElement, { visible: boolean }>(
  function Selection({ visible }, ref) {
    if (!visible) return null;

    return (
      <div
        ref={ref}
        className="pointer-events-none absolute z-50 border border-primary bg-primary/20"
        style={{
          left: 0,
          top: 0,
          width: 0,
          height: 0,
        }}
      />
    );
  },
);

export default memo(Selection);
