import { Elysia } from "elysia";
import { getClientCount } from "../lib/ws";

type Labels = Record<string, string>;

class MetricsCollector {
  private counters = new Map<string, number>();
  private histograms = new Map<string, number[]>();
  private activeGauge = new Map<string, number>();

  inc(name: string, labels: Labels = {}, value = 1) {
    const key = `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",")}}`;
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  observe(name: string, value: number, labels: Labels = {}) {
    const key = `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",")}}`;
    const vals = this.histograms.get(key) || [];
    vals.push(value);
    this.histograms.set(key, vals);
  }

  setGauge(name: string, value: number, labels: Labels = {}) {
    const key = `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(",")}}`;
    this.activeGauge.set(key, value);
  }

  snapshot(): string {
    const lines: string[] = [];

    for (const [key, val] of this.counters) {
      lines.push(`# TYPE ${key.split("{")[0]} counter`);
      lines.push(`${key} ${val}`);
    }

    for (const [key, vals] of this.histograms) {
      const base = key.split("{")[0];
      lines.push(`# TYPE ${base} histogram`);
      lines.push(`# HELP ${base} Request latency in ms`);
      const sorted = [...vals].sort((a, b) => a - b);
      const count = sorted.length;
      const sum = sorted.reduce((a, b) => a + b, 0);
      lines.push(`${key}_count ${count}`);
      lines.push(`${key}_sum ${sum}`);
      if (count > 0) {
        lines.push(`${key}_bucket{le="10"} ${sorted.filter((v) => v <= 10).length}`);
        lines.push(`${key}_bucket{le="50"} ${sorted.filter((v) => v <= 50).length}`);
        lines.push(`${key}_bucket{le="100"} ${sorted.filter((v) => v <= 100).length}`);
        lines.push(`${key}_bucket{le="500"} ${sorted.filter((v) => v <= 500).length}`);
        lines.push(`${key}_bucket{le="+Inf"} ${count}`);
      }
    }

    for (const [key, val] of this.activeGauge) {
      lines.push(`# TYPE ${key.split("{")[0]} gauge`);
      lines.push(`${key} ${val}`);
    }

    return lines.join("\n");
  }
}

export const metrics = new MetricsCollector();

export const metricsPlugin = new Elysia({ name: "metrics" })
  .onRequest(({ request }) => {
    const url = new URL(request.url);
    metrics.setGauge("active_requests", (metrics.activeGauge.get("active_requests") ?? 0) + 1);
    (request as any).__start = performance.now();
    (request as any).__path = url.pathname;
    (request as any).__method = request.method;
  })
  .onAfterResponse(({ request, set }) => {
    const start = (request as any).__start;
    if (start) {
      const duration = performance.now() - start;
      const path = (request as any).__path || "unknown";
      const method = (request as any).__method || "UNKNOWN";
      const status = String(set.status || 200);

      metrics.observe("http_request_duration_ms", duration, { method, path, status });
      metrics.inc("http_requests_total", { method, path, status });

      if (Number(status) >= 500) {
        metrics.inc("http_errors_total", { method, path, status });
      }
    }
    const current = metrics.activeGauge.get("active_requests") ?? 1;
    metrics.setGauge("active_requests", Math.max(0, current - 1));
  })
  .get("/metrics", ({ set }) => {
    metrics.setGauge("ws_clients", getClientCount());
    set.headers["Content-Type"] = "text/plain; version=0.0.4";
    return metrics.snapshot();
  });
