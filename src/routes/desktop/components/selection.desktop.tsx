export default function Selection({
  selectionRect,
}: {
  selectionRect: { left: number; top: number; width: number; height: number };
}) {
  return (
    <div
      className="absolute pointer-events-none z-50 border border-primary bg-primary/20"
      style={{
        left: selectionRect.left,
        top: selectionRect.top,
        width: selectionRect.width,
        height: selectionRect.height,
      }}
    />
  );
}
