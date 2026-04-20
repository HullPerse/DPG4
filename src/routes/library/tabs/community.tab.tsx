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
import { useUserStore } from "@/store/user.store";

const activityApi = new ActivityApi();

function CommunityTab() {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const setUserProfile = useDataStore((state) => state.setUserProfile);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["communityTab"],
    queryFn: async (): Promise<Activity[]> => {
      return await activityApi.getActivities();
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

  const activities = data ?? [];

  return (
    <main className="flex flex-col w-full h-full gap-1 overflow-y-auto pb-15 p-2">
      {activities.map((activity) => (
        <ActivityCard
          key={activity.id}
          activity={activity}
          clickEvent={() => setUserProfile(String(user?.id))}
        />
      ))}
    </main>
  );
}

function ActivityCard({
  activity,
  clickEvent,
}: {
  activity: Activity;
  clickEvent: () => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(activity.created), {
    addSuffix: true,
    locale: ru,
  });

  return (
    <button
      type="button"
      className="flex items-center gap-3 border-2 border-highlight-high bg-card p-2 cursor-pointer hover:opacity-100 opacity-75"
      onClick={clickEvent}
    >
      {activity.type === "image" ? (
        activity.image ? (
          <ImageComponent
            src={activity.image}
            alt="activity"
            className="size-12 shrink-0 rounded-full object-cover"
          />
        ) : null
      ) : (
        <span className="w-10 h-10 flex items-center justify-center border border-highlight-high text-xl">
          {activity.image}
        </span>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <p className="truncate text-sm text-text">{activity.text}</p>
        <span className="text-xs text-muted">{timeAgo}</span>
      </div>
    </button>
  );
}

export default memo(CommunityTab);
