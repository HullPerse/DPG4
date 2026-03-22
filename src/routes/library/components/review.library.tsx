import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, NetworkIcon } from "lucide-react";
import GameApi from "@/api/games.api";
import UserApi from "@/api/user.api";
import { Button } from "@/components/ui/button.component";
import { startTransition, useCallback } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import Rating from "@/components/shared/rating.component";
import { Image } from "@/components/shared/image.component";
import { image } from "@/api/client.api";

const gameApi = new GameApi();
const userApi = new UserApi();

function EditReview() {
  return <main> edit review </main>;
}

function ReviewLibrary({ id }: { id: string }) {
  const queryClient = useQueryClient();

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
      <section className="flex h-full w-25 flex-col items-center border-r-2 border-highlight-high p-1">
        <div className="flex size-20 items-center justify-center rounded border-2 border-highlight-high">
          <div className=" flex h-full w-full items-center justify-center pb-2 text-4xl">
            {data?.user.avatar}
          </div>
        </div>
        <div className="flex w-full flex-col gap-1 p-2">
          <Button
            variant="success"
            size="icon"
            className="w-full"
            onClick={async () => {
              if (!data) return;

              await gameApi.voteReview(
                data.game.id,
                {
                  id: String(data.user.id),
                  username: data.user.username,
                },
                1,
              );
            }}
          >
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
          </Button>
          {
            <span
              className="flex w-full min-w-6 items-center justify-center rounded border border-highlight-high bg-background text-center text-[20px] font-bold"
              style={{
                color:
                  totalScore === 0 ? "white" : totalScore > 0 ? "green" : "red",
              }}
            >
              {totalScore}
            </span>
          }
          <Button
            variant="error"
            size="icon"
            className="w-full"
            onClick={async () => {
              if (!data) return;

              await gameApi.voteReview(
                data.game.id,
                {
                  id: String(data.user.id),
                  username: data.user.username,
                },
                -1,
              );
            }}
          >
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
          </Button>
        </div>
      </section>
      <section className="flex flex-col w-full">
        <div className="flex flex-row items-center justify-between w-full p-2 min-h-10 h-10 border-b-2 border-highlight-high overflow-hidden">
          <span className="font-bold text-xl max-w-70 text-center truncate">
            {data.game.data.name}
          </span>
          <Rating
            value={data?.game.review?.rating as number as 1 | 2 | 3 | 4 | 5}
            readOnly
          />
        </div>
        <div className="flex flex-col w-full p-1 font-bold overflow-y-auto gap-2 h-fit">
          {data?.game.review?.comment}
        </div>

        {data.game.image && (
          <div className="flex items-center justify-center p-2">
            <div className="relative w-64 h-120 overflow-hidden rounded-lg border border-highlight-high bg-muted">
              <Image
                src={`${image.game}${data.game.id}/${data.game.image}`}
                alt={data.game.data.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export { EditReview, ReviewLibrary };
