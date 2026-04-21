import ImageComponent from "@/components/shared/image.component";
import { getStatusColor } from "@/lib/utils";
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

export default function Games({ games }: { games: Game[] }) {
  const reversedArray = [...games].reverse();

  return (
    <main className="flex flex-col w-full p-2 gap-2 overflow-y-auto">
      {reversedArray.length > 0 && (
        <section className="flex flex-col gap-2">
          {reversedArray.map((game) => (
            <div
              key={game.id}
              className="relative flex flex-row w-full min-h-24 h-24 p-2 items-center justify-between bg-card border-2 border-highlight-high shadow-sharp-sm"
            >
              {/* LABEL */}
              <section className="flex flex-row w-full h-full items-center gap-2">
                <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden">
                  <ImageComponent
                    src={game.data.capsuleImage}
                    alt={game.data.name}
                  />
                </div>
                <span className="font-bold truncate line-clamp-1">
                  {game.data.name} [{game.playtime.hltb} ч.]
                </span>
              </section>

              {/* DATA */}
              <section className="absolute flex flex-col right-1 bottom-1 items-end gap-1 ml-auto font-bold opacity-75">
                <span style={{ color: getStatusColor(game.status) }}>
                  {STATUSES.find((status) => status.name === game.status)
                    ?.label ?? game.status}
                </span>
                <span>{game.playtime.user ?? 0} ч. всего</span>
                <span>
                  Добавлено {new Date(game.created).toLocaleDateString()}
                </span>
              </section>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
