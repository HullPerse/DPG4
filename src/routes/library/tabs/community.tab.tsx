import ActivityApi from "@/api/activity.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { Activity } from "@/types/activity";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon } from "lucide-react";
import { memo, startTransition, useCallback } from "react";
import ImageComponent from "@/components/shared/image.component";
import { useDataStore } from "@/store/data.store";
import GameApi from "@/api/games.api";
import { Game, GameReview } from "@/types/games";
import { User } from "@/types/user";
import ReviewComponent from "@/components/shared/review.component";
import { image } from "@/api/client.api";

const gameApi = new GameApi();
const activityApi = new ActivityApi();

type CommunityItem =
  | (Activity & { itemType: "activity" })
  | (Game & { itemType: "review" });

function CommunityTab() {
  const queryClient = useQueryClient();
  const setUserProfile = useDataStore((state) => state.setUserProfile);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["communityTab"],
    queryFn: async (): Promise<CommunityItem[]> => {
      const activity = await activityApi.getActivities();
      const reviews = await gameApi
        .getAllGames()
        .then((res) => res.filter((g) => g.review || g.image));

      const combined = [
        ...activity.map((a) => ({ ...a, itemType: "activity" as const })),
        ...reviews.map((r) => ({ ...r, itemType: "review" as const })),
      ].sort(
        (a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime(),
      );

      return combined;
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["communityTab"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("activity", "*", invalidateQuery);

  if (isLoading) return <WindowLoader />;
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
    <main className="flex flex-col w-full h-full gap-1 overflow-y-auto p-2">
      {data?.map((item) => {
        const timeAgo = formatDistanceToNow(new Date(item.created), {
          addSuffix: true,
          locale: ru,
        });

        if (item.itemType === "activity") {
          const activityItem = item as Activity & { itemType: "activity" };
          return (
            <button
              key={activityItem.id}
              type="button"
              className="relative flex items-center gap-3 border-2 border-highlight-high bg-card p-2 cursor-pointer hover:opacity-100 opacity-75"
              onClick={() => {
                setUserProfile({
                  type: "profile",
                  id: String(activityItem.author),
                });
              }}
            >
              {activityItem.type === "image" ? (
                activityItem.image ? (
                  <ImageComponent
                    src={activityItem.image}
                    alt="activity"
                    className="h-16 min-w-16 max-w-32 border border-highlight-high"
                    type="contain"
                  />
                ) : null
              ) : (
                <span className="w-10 h-10 flex items-center justify-center border border-highlight-high text-xl">
                  {activityItem.image}
                </span>
              )}

              <p className="truncate text-sm text-text font-bold line-clamp-2">
                {activityItem.text}
              </p>
              <div className="absolute right-1 bottom-1 flex flex-col flex-1 min-w-0">
                <span className="text-xs text-muted">{timeAgo}</span>
              </div>
            </button>
          );
        }

        const reviewItem = item as Game & { itemType: "review" };
        const user = {
          id: String(reviewItem.user.id),
          username: reviewItem.user.username,
          avatar: "🕹️",
        } as User;

        return (
          <ReviewComponent
            key={reviewItem.id}
            id={String(reviewItem.id)}
            title={reviewItem.data.name}
            review={reviewItem.review as GameReview}
            image={
              reviewItem.image
                ? `${image.game}${reviewItem.id}/${reviewItem.image}`
                : null
            }
            user={user}
            updated={reviewItem.updated}
          />
        );
      })}
    </main>
  );
}

export default memo(CommunityTab);
