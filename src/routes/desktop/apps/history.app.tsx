import { useDataStore } from "@/store/data.store";
import { Button } from "@/components/ui/button.component";
import { memo, useCallback, useMemo } from "react";
import { Trash } from "lucide-react";

function WheelHistoryApp() {
  const wheelHistory = useDataStore((state) => state.wheelHistory);
  const setWheelHistory = useDataStore((state) => state.setWheelHistory);
  const clearHistory = useCallback(() => {
    setWheelHistory([]);
  }, [setWheelHistory]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof wheelHistory> = {};
    wheelHistory.forEach((item) => {
      const date = new Date(item.timestamp).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [wheelHistory]);

  return (
    <main className="flex flex-col h-full w-full bg-background overflow-hidden">
      <header className="flex items-center justify-between px-3 py-2 border-b border-highlight-high bg-highlight-low">
        <Button
          variant="error"
          size="icon"
          onClick={clearHistory}
          className="gap-1 ml-auto"
          disabled={wheelHistory.length === 0}
        >
          <Trash className="size-3" />
        </Button>
      </header>

      <section className="flex-1 overflow-y-auto p-2 bg-card">
        {wheelHistory.length === 0 ? (
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
                      {item.type === "image" && item.image ? (
                        <div className="w-full h-24 overflow-hidden bg-highlight-low">
                          <img
                            src={item.image}
                            alt={item.label}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-24 flex items-center justify-center text-4xl bg-highlight-low">
                          {item.image || "🎁"}
                        </div>
                      )}
                      <span className="text-sm text-text truncate">
                        {item.label}
                      </span>
                      <span className="text-xs text-muted">
                        {new Date(item.timestamp).toLocaleTimeString("ru-RU", {
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

      <footer className="px-3 py-2 border-t-2 border-highlight-high text-xs text-muted">
        Всего результатов: {wheelHistory.length}
      </footer>
    </main>
  );
}

export default memo(WheelHistoryApp);
