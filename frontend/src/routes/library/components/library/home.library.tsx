import ImageComponent from "@/components/shared/image.component";
import { getStatusColor } from "@/lib/index.utils";
import { Game } from "@/types/games";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState, useEffect } from "react";

const STATUSES = [
  {
    name: "PLAYING",
    label: "В ПРОЦЕССЕ",
  },
  {
    name: "COMPLETED",
    label: "ПРОЙДЕНО",
  },
  {
    name: "DROPPED",
    label: "ДРОПНУТО",
  },
  {
    name: "REROLLED",
    label: "РЕРОЛЬНУТО",
  },
];

export default function HomeLibrary({
  games,
  setCurrentGame,
}: {
  games: Game[];
  setCurrentGame: (gameId: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(3);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const MIN_CARD_WIDTH = 200;
    const ro = new ResizeObserver(([entry]) => {
      setCols(Math.max(1, Math.floor((entry.contentRect.width - 16) / MIN_CARD_WIDTH)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const reversedGames = [...games];

  const rows = useMemo(() => {
    const result: Game[][] = [];
    for (let i = 0; i < reversedGames.length; i += cols) {
      result.push(reversedGames.slice(i, i + cols));
    }
    return result;
  }, [reversedGames, cols]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 122,
    overscan: 10,
    getItemKey: (index) => rows[index]?.[0]?.id ?? index,
  });

  return (
    <main
      ref={listRef}
      className="relative flex h-full w-full flex-col gap-2 overflow-y-auto p-2"
      style={{ scrollBehavior: "smooth", willChange: "transform", scrollbarGutter: "stable" }}
    >
      <section className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 top-0 grid w-full gap-3"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {row.map((game) => (
                <div
                  key={game.id}
                  role="button"
                  className="flex w-full cursor-pointer flex-col border border-highlight-high shadow-sharp-sm opacity-85 hover:opacity-100"
                  onClick={() => setCurrentGame(game.id as string)}
                >
                  <div className="relative h-18 w-full overflow-hidden rounded-sm border border-highlight-medium">
                    <ImageComponent
                      src={game.data.capsuleImage}
                      alt={game.data.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="mt-1 flex flex-col">
                    <span className="line-clamp-1 text-sm text-text">{game.data.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: getStatusColor(game.status) }}>
                        {STATUSES.find((s) => s.name === game.status)?.label ?? game.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </section>
    </main>
  );
}
