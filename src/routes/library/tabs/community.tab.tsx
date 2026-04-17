import ActivityApi from "@/api/activity.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { Activity } from "@/types/activity";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon } from "lucide-react";
import { memo, startTransition, useCallback } from "react";

const activityApi = new ActivityApi();

function CommunityTab() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
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

  return <main className="p-2 flex flex-col w-full h-full gap-8"></main>;
}
export default memo(CommunityTab);
