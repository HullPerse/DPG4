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

export default function HomeLibrary({
  games,
  setCurrentGame,
}: {
  games: Game[];
  setCurrentGame: (gameId: string) => void;
}) {
  const reversedGames = [...games].reverse();

  return (
    <main className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2">
      <section className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
        {reversedGames.map((game) => (
          <div
            key={game.id}
            className="flex w-full cursor-pointer flex-col border border-highlight-high shadow-sharp-sm"
            onClick={() => setCurrentGame(game.id as string)}
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-highlight-medium">
              <ImageComponent
                src={game.data.capsuleImage}
                alt={game.data.name}
                className="h-full w-full object-cover"
                placeholder="https://placehold.co/600x400"
              />
            </div>
            <div className="mt-1 flex flex-col">
              <span className="line-clamp-1 text-sm text-text">
                {game.data.name}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs"
                  style={{ color: getStatusColor(game.status) }}
                >
                  {STATUSES.find((s) => s.name === game.status)?.label ??
                    game.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
