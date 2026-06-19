import { useEffect, useRef, useState } from "react";
import { adminFetch } from "@/adminApi";

interface LogEntry {
  t: string | null;
  l: string | null;
  u: string | null;
  m: string;
  d: string[];
}

const LEVEL_COLORS: Record<string, string> = {
  INFO: "text-blue-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
  DEBUG: "text-gray-500",
};

export function LogsPage() {
  const [lines, setLines] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [linesLimit, setLinesLimit] = useState(200);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams({
        lines: String(linesLimit),
        offset: "0",
      });
      if (search.trim()) params.set("search", search.trim());
      const data = await adminFetch<{ lines: LogEntry[]; total: number }>(
        `/api/admin/logs?${params}`,
      );
      setLines(data.lines);
      setTotal(data.total);
    } catch {}
  };

  useEffect(() => {
    fetchLogs();
  }, [search, linesLimit]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchLogs, 10_000);
    return () => clearInterval(id);
  }, [autoRefresh, search, linesLimit]);

  return (
    <div className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Логи сервера</h1>
        <span className="text-muted text-sm">({total} записей)</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Поиск по логам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border-highlight-high bg-card text-text placeholder:text-muted w-64 rounded-lg border px-3 py-1.5 text-sm outline-none"
        />
        <select
          value={linesLimit}
          onChange={(e) => setLinesLimit(Number(e.target.value))}
          className="border-highlight-high bg-card text-text rounded-lg border px-3 py-1.5 text-sm outline-none"
        >
          <option value={50}>50 строк</option>
          <option value={100}>100 строк</option>
          <option value={200}>200 строк</option>
          <option value={500}>500 строк</option>
          <option value={1000}>1000 строк</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-iris"
          />
          Автообновление (10с)
        </label>
        <button
          type="button"
          onClick={fetchLogs}
          className="bg-iris hover:bg-iris/80 rounded-lg px-3 py-1.5 text-sm text-white transition-colors"
        >
          Обновить
        </button>
      </div>

      <div className="border-highlight-high bg-card flex-1 overflow-y-auto rounded-lg border font-mono text-sm leading-relaxed">
        {lines.length === 0 ? (
          <div className="text-muted flex h-full items-center justify-center">
            Логов нет
          </div>
        ) : (
          <div className="p-3">
            {lines.map((entry, i) => {
              const levelColor = LEVEL_COLORS[entry.l ?? ""] ?? "text-text";
              const time = entry.t ? entry.t.slice(11, 19) : "";
              const detail = entry.d.length ? ` ${entry.d.join(" ")}` : "";
              const userPrefix = entry.u ? `${entry.u}: ` : "";
              return (
                <div key={i} className="hover:bg-highlight-low flex gap-2 px-2 py-0.5">
                  <span className="text-muted shrink-0">{time}</span>
                  <span className={`${levelColor} shrink-0 w-12`}>
                    {entry.l ?? "?"}
                  </span>
                  <span className="text-text shrink-0 font-semibold">
                    {userPrefix}
                  </span>
                  <span className="text-text break-all">
                    {entry.m}{detail}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
