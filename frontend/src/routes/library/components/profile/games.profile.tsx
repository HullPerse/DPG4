import { useMemo, useState } from "react";
import ImageComponent from "@/components/shared/image.component";
import { Input } from "@/components/ui/input.component";
import { getStatusColor, highlightText, openWindow } from "@/lib/utils";
import { Game } from "@/types/games";

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

function matchesSearch(game: Game, query: string) {
  const q = query.trim().toUpperCase();
  if (!q) return true;

  const statusLabel =
    STATUSES.find((s) => s.name === game.status)?.label ?? game.status;

  return (
    game.data.name.toUpperCase().includes(q) ||
    statusLabel.toUpperCase().includes(q) ||
    String(game.data.id ?? "").includes(q)
  );
}

export default function Games({ games }: { games: Game[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredGames = useMemo(() => {
    const list = games.filter((game) => matchesSearch(game, searchTerm));
    return [...list].reverse();
  }, [games, searchTerm]);

  return (
    <main className="flex flex-col w-full h-full gap-2 overflow-hidden">
      <div className="shrink-0 px-2 pt-2">
        <Input
          type="text"
          placeholder="Поиск по названию, статусу или ID"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10"
        />
        {searchTerm.trim() && (
          <p className="text-xs text-text/60 mt-1 px-1">
            Найдено: {filteredGames.length} из {games.length}
          </p>
        )}
      </div>

      <section className="flex flex-col flex-1 min-h-0 p-2 pt-0 gap-2 overflow-y-auto">
        {filteredGames.length > 0 ? (
          filteredGames.map((game) => {
            const statusLabel =
              STATUSES.find((status) => status.name === game.status)?.label ??
              game.status;

            return (
              <div
                key={game.id}
                className="relative flex flex-row w-full min-h-24 h-24 p-2 items-center justify-between bg-card border-2 border-highlight-high shadow-sharp-sm"
              >
                <section className="flex flex-row w-full h-full items-center gap-2">
                  <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden hover:cursor-pointer">
                    <ImageComponent
                      src={game.data.capsuleImage}
                      alt={game.data.name}
                      onClick={() => {
                        openWindow(
                          String(game.data.id),
                          game.data.capsuleImage,
                          "Изображение",
                        );
                      }}
                    />
                  </div>
                  <span className="font-bold line-clamp-2">
                    {highlightText(game.data.name, searchTerm)} [
                    {game.playtime.hltb} ч.]
                  </span>
                </section>

                <span
                  className="absolute flex flex-col right-1 top-1 items-end gap-1 ml-auto font-bold opacity-75"
                  style={{ color: getStatusColor(game.status) }}
                >
                  {highlightText(statusLabel, searchTerm)}
                </span>

                {game.status === "COMPLETED" && (
                  <span className="absolute flex flex-col right-1 bottom-1 items-end gap-1 ml-auto font-bold opacity-75">
                    {game.playtime.user ?? 0} ч. всего
                  </span>
                )}
              </div>
            );
          })
        ) : games.length > 0 ? (
          <p className="text-text/60 text-center py-8">
            По запросу «{searchTerm}» ничего не найдено
          </p>
        ) : (
          <p className="text-text/60 text-center py-8">Игр пока нет</p>
        )}
      </section>
    </main>
  );
}
