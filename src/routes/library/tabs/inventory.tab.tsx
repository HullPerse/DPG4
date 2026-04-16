import { memo, startTransition, useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon } from "lucide-react";
import { Input } from "@/components/ui/input.component";
import { useUserStore } from "@/store/user.store";
import { Inventory } from "@/types/items";
import ItemsApi from "@/api/items.api";

const itemsApi = new ItemsApi();

function InventoryTab({ id }: { id?: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [searchTerms, setSearchTerms] = useState<string>("");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["inventoryTab", id],
    queryFn: async (): Promise<Inventory[]> => {
      return await itemsApi.getInventory(id ?? String(user?.id));
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["inventoryTab", id],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("inventory", "*", invalidateQuery);
  useSubscription("items", "*", invalidateQuery);

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
    <main className="p-2 flex flex-col w-full h-full gap-8">
      <Input
        autoFocus
        type="text"
        placeholder="Поиск пользователя"
        value={searchTerms}
        onChange={(e) => setSearchTerms(e.target.value)}
      />
      <section className="flex flex-wrap gap-2 overflow-y-auto w-full pb-2 items-start justify-start">
        {data
          ?.filter((item) =>
            item.label.toUpperCase().includes(searchTerms.toUpperCase()),
          )
          .map((item) => (
            <div
              key={item.id}
              className="flex flex-col min-w-40 min-h-40 w-40 h-40 bg-red-500 overflow-hidden"
            ></div>
          ))}
      </section>
    </main>
  );
}
export default memo(InventoryTab);
