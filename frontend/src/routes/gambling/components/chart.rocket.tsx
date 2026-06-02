import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { multiplierColor } from "@/lib/gambling/rocket.utils";
import type { RocketHistoryEntry } from "@/types/gamble";

export function CrashHistoryPills({ history }: { history: RocketHistoryEntry[] }) {
  const recent = [...history].reverse().slice(0, 12);

  if (recent.length === 0) {
    return (
      <div className="flex items-center justify-center h-8 text-muted text-xs">
        История крахов пуста
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 justify-center px-1 py-1">
      {recent.map((entry, i) => (
        <span
          key={`${entry.timestamp}-${i}`}
          className={cn(
            "px-2 py-0.5 rounded text-xs font-mono font-semibold border",
            entry.crashPoint < 2
              ? "border-[#3e8fb0]/40 text-[#3e8fb0] bg-[#3e8fb0]/10"
              : entry.crashPoint < 5
                ? "border-[#f6c177]/40 text-[#f6c177] bg-[#f6c177]/10"
                : "border-[#eb6f92]/40 text-[#eb6f92] bg-[#eb6f92]/10",
          )}
        >
          {entry.crashPoint.toFixed(2)}x
        </span>
      ))}
    </div>
  );
}

function CrashChart({ history }: { history: RocketHistoryEntry[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || history.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const gap = 4;
    const barW = Math.min((w - gap) / history.length - gap, 20);

    ctx.clearRect(0, 0, w, h);

    const maxCrash = Math.max(...history.map((e) => e.crashPoint), 2);

    history.forEach((entry, i) => {
      const x = gap + i * (barW + gap);
      const barH = (entry.crashPoint / maxCrash) * (h - 10);
      const y = h - 5 - barH;
      const color = multiplierColor(entry.crashPoint);

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [2, 2, 0, 0]);
      ctx.fill();

      if (barW > 10) {
        ctx.fillStyle = "#e0def4";
        ctx.font = "8px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`${entry.crashPoint.toFixed(2)}x`, x + barW / 2, y - 3);
      }
    });
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted text-sm">
        История пока пуста
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ minHeight: 60 }}
    />
  );
}

export default CrashChart;
