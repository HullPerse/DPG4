import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.component";
import { getWheelHistory, clearWheelHistory, type WheelHistoryRecord } from "@/api/wheel.api";
import { Trash } from "lucide-react";

function WheelHistoryApp() {
  const [history, setHistory] = useState<WheelHistoryRecord[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await getWheelHistory(page, limit);
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
  }, [page]);

  const handleClear = async () => {
    try {
      await clearWheelHistory();
      setHistory([]);
      setTotal(0);
      setPage(1);
    } catch {}
  };

  const groupedByDate: Record<string, WheelHistoryRecord[]> = {};
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
      <header className="flex items-center justify-between px-3 py-2 border-b border-highlight-high bg-highlight-low">
        <Button
          variant="error"
          size="icon"
          onClick={handleClear}
          className="gap-1 ml-auto"
          disabled={history.length === 0}
        >
          <Trash className="size-3" />
        </Button>
      </header>

      <section className="flex-1 overflow-y-auto p-2 bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted">
            Загрузка...
          </div>
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
                    <div
                      key={item.id}
                      className="flex flex-col gap-1 p-2 border-2 border-highlight-high bg-card hover:border-primary transition-colors"
                    >
                      {item.itemType === "image" && item.itemImage ? (
                        <div className="w-full h-24 overflow-hidden bg-highlight-low">
                          <img
                            src={item.itemImage}
                            alt={item.itemLabel}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center text-4xl bg-highlight-low">
                          {item.itemImage || "🎁"}
                        </div>
                      )}
                      <span className="text-sm text-text truncate">
                        {item.itemLabel}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(item.created).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="flex items-center justify-between px-3 py-2 border-t-2 border-highlight-high text-xs text-muted">
        <span>Всего результатов: {total}</span>
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
              →
            </Button>
          </div>
        )}
      </footer>
    </main>
  );
}

export default WheelHistoryApp;
