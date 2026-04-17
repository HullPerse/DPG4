import ItemsApi from "@/api/items.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { useUserStore } from "@/store/user.store";
import { Inventory } from "@/types/items";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon } from "lucide-react";
import { memo, startTransition, useCallback } from "react";

const itemsApi = new ItemsApi();

function TradeTab({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tradeTab", id],
    queryFn: async (): Promise<Inventory[]> => {
      return await itemsApi.getInventory(id);
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["tradeTab", id],
        refetchType: "all",
      });
    });
  }, [queryClient, id]);

  useSubscription("inventory", "*", invalidateQuery);

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
export default memo(TradeTab);
