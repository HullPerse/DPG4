import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon } from "lucide-react";
import { startTransition, useCallback } from "react";
import GameApi from "@/api/games.api";
import ReviewComponent from "@/components/shared/review.component";
import { image } from "@/api/client.api";
import { User } from "@/types/user";
import { Game, GameReview } from "@/types/games";

const gameApi = new GameApi();

export default function ReviewsProfile({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["reviewsTab"],
    queryFn: async (): Promise<{ user: User | null; games: Game[] }> => {
      return await gameApi.getAllReviews(id);
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["reviewsTab"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("games", "*", invalidateQuery);

  if (isLoading || isFetching) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  return (
    <main className="flex flex-col w-full overflow-y-auto p-4 gap-4 pb-15">
      {data?.games.map((game) => (
        <div key={game.id} className="flex flex-col">
          <p className="font-bold text-xl">
            {new Date(game.created).toLocaleDateString()}
          </p>
          <ReviewComponent
            id={String(game.id)}
            title={game.data.name}
            review={game.review as GameReview}
            image={game.image ? `${image.game}${game.id}/${game.image}` : null}
            user={data.user as User}
          />
        </div>
      ))}
    </main>
  );
}
