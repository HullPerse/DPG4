function StatBar({
  label,
  value,
  color,
  dead,
}: {
  label: string;
  value: number;
  color: string;
  dead?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={`flex flex-col gap-0.5 flex-1 ${dead ? "opacity-40" : ""}`}>
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted">{Math.round(clamped)}</span>
      </div>
      <div className="h-1.5 w-full bg-highlight-high rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500 ease-linear rounded-full"
          style={{
            width: `${clamped}%`,
            backgroundColor: dead ? "#555" : color,
          }}
        />
      </div>
    </div>
  );
}
export default StatBar;
