import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { getHistory, type HistoryRecord } from "@/api/history.api";
import { ChevronRight } from "lucide-react";

const TYPE_FILTERS = [
  { value: "", label: "Все" },
  { value: "wheel", label: "Колесо" },
  { value: "dice", label: "Кости" },
  { value: "blackjack", label: "Блэкджек" },
  { value: "rocket", label: "Ракета" },
  { value: "pachinko", label: "Пачинко" },
];

const TYPE_LABELS: Record<string, string> = {
  wheel: "Колесо",
  dice: "Кости",
  blackjack: "Блэкджек",
  rocket: "Ракета",
  pachinko: "Пачинко",
};

const TYPE_COLORS: Record<string, string> = {
  wheel: "bg-amber-600/20 text-amber-400 border-amber-600",
  dice: "bg-blue-600/20 text-blue-400 border-blue-600",
  blackjack: "bg-green-600/20 text-green-400 border-green-600",
  rocket: "bg-red-600/20 text-red-400 border-red-600",
  pachinko: "bg-purple-600/20 text-purple-400 border-purple-600",
};

function HistoryTypeBadge({ type }: { type: string }) {
  const color =
    TYPE_COLORS[type] ?? "bg-gray-600/20 text-gray-400 border-gray-600";
  const label = TYPE_LABELS[type] ?? type;
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 border ${color}`}>
      {label}
    </span>
  );
}

function NetBadge({ net }: { net: number }) {
  if (net > 0) {
    return (
      <span className="text-xs font-bold text-green-400 bg-green-600/20 border border-green-600 px-1.5 py-0.5">
        +{net}
      </span>
    );
  }
  if (net < 0) {
    return (
      <span className="text-xs font-bold text-red-400 bg-red-600/20 border border-red-600 px-1.5 py-0.5">
        {net}
      </span>
    );
  }
  return (
    <span className="text-xs font-bold text-muted bg-highlight-low border border-highlight-high px-1.5 py-0.5">
      {net}
    </span>
  );
}

function HistoryCard({ record }: { record: HistoryRecord }) {
  return (
    <div className="flex flex-row gap-2 p-2 border-2 border-highlight-high bg-card hover:border-primary transition-colors">
      {record.type === "wheel" && record.image ? (
        <div className="w-16 h-16 shrink-0 overflow-hidden bg-highlight-low">
          <img
            src={record.image}
            alt={record.label}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ) : record.type === "wheel" ? (
        <div className="w-16 h-16 shrink-0 flex items-center justify-center text-3xl bg-highlight-low">
          🐀
        </div>
      ) : null}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <HistoryTypeBadge type={record.type} />
          <NetBadge net={record.net} />
        </div>
        <span className="text-sm text-text truncate">{record.label}</span>
        <div className="flex items-center gap-2 text-xs text-muted">
          {record.owner && <span>{record.owner.username}</span>}
          <span>
            {new Date(record.created).toLocaleTimeString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {record.bid > 0 && <span>Ставка: {record.bid}</span>}
          {record.payout > 0 && <span>Результат: {record.payout}</span>}
        </div>
      </div>
    </div>
  );
}

function WheelHistoryApp() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const limit = 50;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getHistory(page, limit, typeFilter || undefined);
      setHistory(res.data);
      setTotal(res.total);
    } catch {
      setHistory([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, typeFilter]);

  const groupedByDate: Record<string, HistoryRecord[]> = {};
  history.forEach((item) => {
    const date = new Date(item.created).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(item);
  });

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="flex flex-col h-full w-full bg-background overflow-hidden">
      <header className="flex items-center gap-1 px-3 py-2 border-b border-highlight-high bg-highlight-low overflow-x-auto">
        {TYPE_FILTERS.map((f) => (
          <Button
            key={f.value || "all"}
            variant="link"
            className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 border-iris border-2 shadow-sharp-sm"
            disabled={f.value === typeFilter}
            onClick={() => {
              setTypeFilter(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </Button>
        ))}
      </header>

      <section className="flex-1 overflow-y-auto p-2 bg-card">
        {loading ? (
          <WindowLoader />
        ) : history.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted">
            История пуста
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {Object.entries(groupedByDate).map(([date, items]) => (
              <div key={date} className="flex flex-col gap-2">
                <h2 className="text-sm font-bold text-muted border-b border-highlight-low pb-1">
                  {date}
                </h2>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => (
                    <HistoryCard key={item.id} record={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="flex items-center justify-between px-3 py-2 border-t-2 border-highlight-high text-xs text-muted">
        <span>Всего: {total}</span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <Button
              variant="info"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ←
            </Button>
            <span className="px-2 self-center">
              {page} / {totalPages}
            </span>
            <Button
              variant="info"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </footer>
    </main>
  );
}

export default WheelHistoryApp;
