import { Gift, Grid3x3, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminFetch } from "@/adminApi";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resourceIcons } from "@/config/resourceIcons";
import { formatTableSize } from "@/lib/formatTableSize";
import type { AdminSchema } from "@/types";

export function Dashboard({ schema }: { schema: AdminSchema }) {
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [responseTimes, setResponseTimes] = useState<Record<string, number> | null>(null);
  const [tableSizes, setTableSizes] = useState<Record<string, number> | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    adminFetch<{ counts: Record<string, number> }>("/api/admin/stats")
      .then((r) => setCounts(r.counts))
      .catch(() => setCounts(null));
  }, []);

  useEffect(() => {
    const fetch = () =>
      adminFetch<{
        tableResponseTimes: Record<string, number>;
        tableSizes: Record<string, number>;
      }>("/api/sentinel/health")
        .then((r) => {
          setResponseTimes(r.tableResponseTimes);
          setTableSizes(r.tableSizes);
        })
        .catch(() => {});
    fetch();
    const id = setInterval(fetch, 5000);
    return () => clearInterval(id);
  }, []);

  const handleBroadcast = async () => {
    setBroadcasting(true);
    setMessage("");
    try {
      await adminFetch("/api/admin/broadcast-reload", { method: "POST" });
      setMessage("Сигнал отправлен: клиенты обновят данные и сбросят кэши.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="p-6 md:p-8">
      <p className="text-muted text-[10px] font-bold tracking-widest uppercase">
        DPG · панель управления
      </p>
      <h1 className="from-text to-primary mt-1 bg-gradient-to-br bg-clip-text text-3xl font-bold text-transparent">
        Админка
      </h1>
      <p className="text-muted mt-2 max-w-lg text-sm">
        Управление базой и инструменты для живой сессии.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => void handleBroadcast()} disabled={broadcasting}>
          <RefreshCw className={broadcasting ? "animate-spin" : undefined} />
          {broadcasting ? "Отправка…" : "Обновить всех игроков"}
        </Button>
        <Link
          to="/grant-item"
          className="border-highlight-high bg-card text-text hover:border-iris inline-flex h-9 items-center gap-2 border-2 px-4 text-sm font-bold"
        >
          <Gift className="size-4" />
          Выдать предмет
        </Link>
        <Link
          to="/cells-board"
          className="border-highlight-high bg-card text-text hover:border-iris inline-flex h-9 items-center gap-2 border-2 px-4 text-sm font-bold"
        >
          <Grid3x3 className="size-4" />
          Поле (cells)
        </Link>
      </div>

      {message && (
        <Card className="border-green-500/40 bg-green-500/10 mt-4 text-sm text-green-300">
          {message}
        </Card>
      )}

      <div className="mt-8">
        {!counts ? (
          <Loader2 className="text-primary size-7 animate-spin" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Object.entries(schema.tables).map(([key, meta]) => {
              const Icon = resourceIcons[key];
              return (
                <Link
                  key={key}
                  to={`/${key}`}
                  className="border-highlight-high bg-card hover:border-primary/50 relative block border-2 p-4 shadow-sharp-sm transition-colors hover:-translate-y-0.5"
                >
                  <div className="text-muted flex items-center gap-2 text-sm">
                    {Icon ? <Icon className="size-4" /> : null}
                    {meta.label}
                  </div>
                  <div className="text-primary mt-2 text-2xl font-bold">
                    {counts[key] ?? 0}
                  </div>
                  {responseTimes?.[key] !== undefined && (
                    <span className="text-muted absolute top-2 right-2 text-[10px] font-medium tabular-nums">
                      {responseTimes[key] >= 0
                        ? `${responseTimes[key].toFixed(2)}ms`
                        : "err"}
                    </span>
                  )}
                  {tableSizes?.[key] !== undefined && (
                    <span className="text-muted absolute right-2 bottom-2 text-[10px] font-medium tabular-nums">
                      {formatTableSize(tableSizes[key])}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
