import { useRef, useEffect, useCallback } from "react";
import type { RocketPhase } from "@/types/gamble";
import {
  buildFlightPath,
  computeMultiplier,
  elapsedFromMultiplier,
  isActivePhase,
  multiplierColor,
} from "@/lib/gambling/rocket.utils";

const ROCKET_START_MULT = 0.5;
import { RatMarker } from "./scene.rocket";

interface FlightChartProps {
  phase: RocketPhase;
  multiplier: number;
  crashPoint: number;
  bid: number;
  flightStart: number | null;
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  pad: number,
  maxM: number,
  maxT: number,
) {
  ctx.strokeStyle = "rgba(144, 140, 170, 0.12)";
  ctx.lineWidth = 1;

  const multLines = [ROCKET_START_MULT, 1, 2, 5, 10, 20].filter((m) => m >= ROCKET_START_MULT && m <= maxM);
  for (const m of multLines) {
    const y = h - pad - ((m - ROCKET_START_MULT) / (maxM - ROCKET_START_MULT)) * (h - pad * 2);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(w - pad / 2, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(144, 140, 170, 0.45)";
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${m}x`, pad - 6, y + 3);
  }

  for (let t = 2; t <= maxT; t += 2) {
    const x = pad + (t / maxT) * (w - pad * 2);
    ctx.beginPath();
    ctx.moveTo(x, pad / 2);
    ctx.lineTo(x, h - pad);
    ctx.stroke();
  }
}

function FlightChart({
  phase,
  multiplier,
  crashPoint,
  bid,
  flightStart,
}: FlightChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ratRef = useRef<HTMLDivElement>(null);
  const displayMultRef = useRef(1);
  const rafRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const pad = 36;

    const active = isActivePhase(phase);
    const crashed = phase === "crashed";
    const cashed = phase === "cashed";

    let elapsedMs = 0;
    let currentMult = multiplier || 1;

    if (active && flightStart) {
      elapsedMs = Date.now() - flightStart;
      currentMult = computeMultiplier(elapsedMs);
    } else if (crashed || cashed) {
      currentMult = multiplier;
      elapsedMs = elapsedFromMultiplier(currentMult);
    }

    displayMultRef.current = currentMult;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#1a1826");
    bg.addColorStop(1, "#191724");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const pathElapsed = crashed ? elapsedFromMultiplier(crashPoint) : elapsedMs;
    const { points, maxT, maxM, tip } = buildFlightPath(pathElapsed, w, h, pad);

    const ratEl = ratRef.current;
    if (ratEl) {
      const hasPath = points.length > 1 && (active || crashed || cashed);
      ratEl.style.left = `${hasPath ? tip.x : pad}px`;
      ratEl.style.top = `${hasPath ? tip.y : h - pad}px`;
    }

    drawGrid(ctx, w, h, pad, maxM, maxT);

    if (points.length > 1 && (active || crashed || cashed)) {
      const lineColor = crashed
        ? "#eb6f92"
        : cashed
          ? "#9ccfd8"
          : multiplierColor(currentMult);

      const fillGrad = ctx.createLinearGradient(0, tip.y, 0, h - pad);
      fillGrad.addColorStop(
        0,
        crashed ? "rgba(235, 111, 146, 0.25)" : "rgba(246, 193, 119, 0.2)",
      );
      fillGrad.addColorStop(1, "rgba(25, 23, 36, 0)");

      ctx.beginPath();
      ctx.moveTo(points[0].x, h - pad);
      for (const p of points) ctx.lineTo(p.x, p.y);
      ctx.lineTo(tip.x, h - pad);
      ctx.closePath();
      ctx.fillStyle = fillGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++)
        ctx.lineTo(points[i].x, points[i].y);

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = lineColor;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 14, 0, Math.PI * 2);
      ctx.fillStyle = crashed
        ? "rgba(235, 111, 146, 0.35)"
        : cashed
          ? "rgba(156, 207, 216, 0.35)"
          : "rgba(246, 193, 119, 0.25)";
      ctx.fill();
    }

    const labelColor = crashed
      ? "#eb6f92"
      : cashed
        ? "#9ccfd8"
        : multiplierColor(currentMult);
    const labelText = crashed
      ? `КРАХ ${crashPoint.toFixed(2)}x`
      : cashed
        ? `ЗАБРАНО ${currentMult.toFixed(2)}x`
        : active
          ? `${currentMult.toFixed(2)}x`
          : "Готов к запуску";

    ctx.textAlign = "center";
    ctx.font = "bold 28px monospace";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillText(labelText, w / 2 + 1, h / 2 - 19);
    ctx.fillStyle = labelColor;
    ctx.fillText(labelText, w / 2, h / 2 - 20);

    if (active && bid > 0) {
      const payout = Math.floor(bid * currentMult);
      ctx.font = "13px monospace";
      ctx.fillStyle = "rgba(224, 222, 244, 0.7)";
      ctx.fillText(`Выигрыш: ${payout} чубриков`, w / 2, h / 2 + 8);
    }
  }, [phase, multiplier, crashPoint, bid, flightStart]);

  useEffect(() => {
    const tick = () => {
      draw();
      if (isActivePhase(phase) || phase === "crashed" || phase === "cashed") {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    tick();
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, phase]);

  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  const showRat =
    isActivePhase(phase) || phase === "crashed" || phase === "cashed";

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {showRat && (
        <div
          ref={ratRef}
          className="absolute -translate-x-1/2 -translate-y-1/2 transition-none"
        >
          <RatMarker
            multiplier={multiplier || displayMultRef.current}
            phase={phase}
            size={120}
          />
        </div>
      )}
    </div>
  );
}

export default FlightChart;
