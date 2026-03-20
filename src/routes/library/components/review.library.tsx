import { WindowError } from "@/components/shared/error.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Infinity as InfinityIcon,
  NetworkIcon,
} from "lucide-react";
import GameApi from "@/api/games.api";
import UserApi from "@/api/user.api";
import { Button } from "@/components/ui/button.component";
import { startTransition, useCallback, useState } from "react";
import { useSubscription } from "@/hooks/subscription.hook";

const gameApi = new GameApi();
const userApi = new UserApi();

function EditReview() {
  return <main> edit review </main>;
}

function ReviewLibrary({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState<"like" | "dislike" | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["libraryReview", id],
    queryFn: async () => {
      const game = await gameApi.getReview(String(id));
      const user = await userApi.getUserById(String(game.user.id));

      return { game, user };
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["libraryReview", id],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("games", "*", invalidateQuery);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при загрузке отзыва")}
        icon={<NetworkIcon />}
      />
    );

  if (!data?.game.review)
    return (
      <span className="flex h-full w-full items-center justify-center text-2xl font-bold">
        Тут будет ваш отзыв!
      </span>
    );

  const totalScore =
    data?.game.review?.votes?.reduce((a, b) => a + b.score, 0) ?? 0;

  return (
    <main className="flex h-full w-full flex-row rounded border-2 border-highlight-high">
      <section className="flex h-full w-25 flex-col items-center border-r-2 border-highlight-high pt-2">
        <div className="flex size-20 items-center justify-center rounded border-2 border-highlight-high">
          <div className="relative flex h-full w-full items-center justify-center pb-2 text-4xl">
            {data?.user.avatar}
            {totalScore !== 0 && totalScore && (
              <span
                className="absolute -right-1 -bottom-1 flex w-10 min-w-6 items-center justify-center rounded border border-highlight-high bg-background text-center text-[20px] font-bold"
                style={{
                  color: totalScore > 0 ? "green" : "red",
                }}
              >
                {totalScore > 100 || totalScore < -100 ? (
                  <InfinityIcon />
                ) : (
                  totalScore
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex w-full flex-col gap-1 p-2">
          <Button
            variant="success"
            size="icon"
            className="w-full"
            onClick={async () => {
              if (!data) return;
              setLoading("like");

              await gameApi.voteReview(
                data.game.id,
                {
                  id: String(data.user.id),
                  username: data.user.username,
                },
                1,
              );
              setLoading(null);
            }}
          >
            {loading === "like" ? (
              <SmallLoader />
            ) : (
              <ChevronUp
                color={
                  data?.game.review?.votes?.some(
                    (item) =>
                      item.user === String(data.user.id) && item.score === 1,
                  )
                    ? "gold"
                    : "white"
                }
                className="size-6"
              />
            )}
          </Button>
          <Button
            variant="error"
            size="icon"
            className="w-full"
            onClick={async () => {
              if (!data) return;
              setLoading("dislike");

              await gameApi.voteReview(
                data.game.id,
                {
                  id: String(data.user.id),
                  username: data.user.username,
                },
                -1,
              );
              setLoading(null);
            }}
          >
            {loading === "dislike" ? (
              <SmallLoader />
            ) : (
              <ChevronDown
                color={
                  data?.game.review?.votes?.some(
                    (item) =>
                      item.user === String(data.user.id) && item.score === -1,
                  )
                    ? "gold"
                    : "white"
                }
                className="size-6"
              />
            )}
          </Button>
        </div>
      </section>
      <section>{data?.game.review?.comment}</section>
    </main>
  );
}

export { EditReview, ReviewLibrary };
