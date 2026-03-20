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
      <span className="flex w-full h-full items-center justify-center font-bold text-2xl">
        Тут будет ваш отзыв!
      </span>
    );

  const totalScore =
    data?.game.review?.votes?.reduce((a, b) => a + b.score, 0) ?? 0;

  return (
    <main className="flex flex-row w-full h-full border-2 border-highlight-high rounded">
      <section className="flex flex-col h-full w-25 border-r-2 border-highlight-high items-center pt-2">
        <div className="border-2 border-highlight-high size-20 rounded flex items-center justify-center">
          <div className="relative w-full h-full text-4xl items-center flex justify-center pb-2">
            {data?.user.avatar}
            {totalScore !== 0 && totalScore && (
              <span
                className="absolute -bottom-1 -right-1 text-[20px] border border-highlight-high rounded bg-background min-w-6 w-10 items-center justify-center flex text-center font-bold"
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
        <div className="flex flex-col gap-1 p-2 w-full">
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
