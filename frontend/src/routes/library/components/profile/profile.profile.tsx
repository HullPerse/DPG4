import { getFileUrl } from "@/api/client.api";
import ImageComponent from "@/components/shared/image.component";
import ReviewComponent from "@/components/shared/review.component";
import { getStatusColor } from "@/lib/utils";
import { Game, GameReview, GameStatus } from "@/types/games";
import { User } from "@/types/user";

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

export default function Profile({
  user,
  games,
}: {
  user: User;
  games: Game[];
}) {
  const getLastReview = (): Game => {
    const onlyReviews = games?.filter((game) =>
      game.review ? game.review !== undefined : false,
    );
    return onlyReviews[0];
  };

  const lastReview = getLastReview();

  return (
    <main className="flex flex-col w-full p-2 gap-2">
      <section className="flex flex-row gap-2">
        {/* USER */}
        <div className="flex flex-row">
          <span className="border-2 border-highlight-high w-40 h-40 items-center justify-center text-center flex text-8xl">
            {user.avatar}
          </span>
        </div>
        {/* RECENT GAMES (all time hours) */}
        <div className="flex flex-col w-full min-h-40 h-40 max-h-40 gap-2">
          <div className="flex flex-row items-center gap-2">
            <span className="text-3xl font-bold">{user.username}</span>
          </div>
          {games.length > 0 && (
            <div className=" border-2 border-highlight-high w-full h-full flex flex-row gap-2 items-center">
              <div className="relative h-full">
                <ImageComponent
                  src={games[0]?.data.capsuleImage}
                  alt={games[0]?.data.name}
                  className="w-80 h-28 aspect-video border-r-2 border-highlight-high hover:cursor-pointer"
                />
                <div className="absolute bottom-0 bg-black/50 text-xl font-bold border-t-2 border-r-2 border-highlight-high text-primary">
                  <span className="overflow-hidden text-ellipsis whitespace-pre-wrap line-clamp-2">
                    {games[0]?.data.name}
                  </span>
                </div>
              </div>
              <span
                className="text-xl font-bold flex-col flex w-full gap-2"
                style={{
                  color: getStatusColor(
                    (STATUSES.find((s) => s.name === games[0].status)
                      ?.name as GameStatus) ?? "PLAYING",
                  ),
                }}
              >
                <div className="text-center">
                  {STATUSES.find((s) => s.name === games[0].status)?.label}
                </div>
                <div className="text-center">
                  [{games[0]?.playtime.hltb} ч.]
                </div>
              </span>
            </div>
          )}
        </div>
      </section>
      <section className="flex flex-col gap-2">
        {lastReview?.review && (
          <div className="flex flex-col w-full h-full pb-5">
            <span className="flex w-full h-10 bg-highlight-low border-x-2 border-t-2 border-highlight-high p-1 font-bold text-xl">
              Последний отзыв:
            </span>

            <ReviewComponent
              id={String(lastReview.id)}
              title={lastReview.data.name}
              review={lastReview.review as GameReview}
              image={getFileUrl(lastReview)}
              user={user}
            />
          </div>
        )}

        {games.length > 0 && (
          <div className="flex flex-col w-full h-full pb-5">
            <section className="flex w-full h-10 bg-highlight-low border-x-2 border-t-2 border-highlight-high p-1 font-bold text-xl items-center justify-between">
              Последние игры:
              <span className="text-sm opacity-75">
                {games.reduce(
                  (acc, game) => acc + (game.playtime.user ?? 0),
                  0,
                )}{" "}
                ч. всего
              </span>
            </section>
            <section className="flex flex-col border-2 border-highlight-high">
              {[...games].map((game, index) => {
                if (index > 4) return null;

                return (
                  <div
                    key={game.id}
                    className="relative flex flex-row w-full min-h-24 h-24 p-2 items-center justify-between bg-card border-b border-highlight-high"
                  >
                    {/* LABEL */}
                    <section className="flex flex-row w-full h-full items-center gap-2">
                      <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden">
                        <ImageComponent
                          src={
                            game.data.capsuleImage ??
                            "https://placehold.co/16x10"
                          }
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
                );
              })}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
