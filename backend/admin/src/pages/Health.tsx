import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { adminFetch } from "@/adminApi";
import { Card } from "@/components/ui/card";

type HealthData = {
  ok: boolean;
  uptime: number;
  memory: { heapUsed: number; heapTotal: number; rss: number };
  db: { ok: boolean; path: string };
  redis: boolean;
  ws: { clients: number };
  tableResponseTimes: Record<string, number>;
};

function fmtUptime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${m}m ${s}s`;
}

function fmtBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState("");

  const fetchHealth = () => {
    setError("");
    adminFetch<HealthData>("/api/sentinel/health")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  };

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 5000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <p className="text-muted text-[10px] font-bold tracking-widest uppercase">
        DPG · мониторинг
      </p>
      <h1 className="from-text to-primary mt-1 bg-clip-text text-3xl font-bold text-transparent">
        Состояние сервера
      </h1>
      {error && <p className="text-love mt-2 text-sm">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <div className="text-muted text-xs font-bold uppercase tracking-wider">
            Статус
          </div>
          <div
            className={`mt-1 text-lg font-bold ${data.ok ? "text-green-400" : "text-love"}`}
          >
            {data.ok ? "✓ Работает" : "✗ Ошибка"}
          </div>
          <div className="text-muted mt-1 text-xs">
            uptime {fmtUptime(data.uptime)}
          </div>
        </Card>

        <Card>
          <div className="text-muted text-xs font-bold uppercase tracking-wider">
            Память
          </div>
          <div className="mt-1 space-y-0.5 text-sm">
            <div>Heap: {fmtBytes(data.memory.heapUsed)}</div>
            <div>RSS: {fmtBytes(data.memory.rss)}</div>
          </div>
        </Card>

        <Card>
          <div className="text-muted text-xs font-bold uppercase tracking-wider">
            База данных
          </div>
          <div
            className={`mt-1 text-lg font-bold ${data.db.ok ? "text-green-400" : "text-love"}`}
          >
            {data.db.ok ? "✓ Доступна" : "✗ Нет доступа"}
          </div>
          <div className="text-muted mt-1 truncate text-xs">{data.db.path}</div>
        </Card>

        <Card>
          <div className="text-muted text-xs font-bold uppercase tracking-wider">
            Redis
          </div>
          <div
            className={`mt-1 text-lg font-bold ${data.redis ? "text-green-400" : "text-muted"}`}
          >
            {data.redis ? "✓ Доступен" : "○ Не используется"}
          </div>
        </Card>

        <Card>
          <div className="text-muted text-xs font-bold uppercase tracking-wider">
            WebSocket
          </div>
          <div className="mt-1 text-sm">
            Клиенты: {data.ws.clients}
          </div>
        </Card>
      </div>

      <div className="mt-8">
        <p className="text-muted text-[10px] font-bold tracking-widest uppercase mb-3">
          Время ответа таблиц (ms)
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Object.entries(data.tableResponseTimes).map(([table, ms]) => (
            <div
              key={table}
              className="border-highlight-high bg-card flex items-center justify-between border-2 px-3 py-2 text-sm"
            >
              <span className="text-text font-medium">{table}</span>
              <span className={ms >= 0 ? "text-muted" : "text-love"}>
                {ms >= 0 ? `${ms.toFixed(2)}ms` : "ошибка"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
