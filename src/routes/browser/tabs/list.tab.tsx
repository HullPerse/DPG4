import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, startTransition, useCallback, useState } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon, Plus } from "lucide-react";
import ItemsApi from "@/api/items.api";
import { Item } from "@/types/items";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import { Input } from "@/components/ui/input.component";

const itemsApi = new ItemsApi();

function ListBrowser({ searchTerms }: { searchTerms: string }) {
  const queryClient = useQueryClient();
  const isAdmin = useUserStore((state) => state.isAdmin);

  const [addItem, setAddItem] = useState<boolean>(false);

  const [label, setLabel] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [image, setImage] = useState<string>("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["listTab"],
    queryFn: async (): Promise<Item[]> => itemsApi.getAllItems(),
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["listTab"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("items", "*", invalidateQuery);

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

  if (addItem) {
    return (
      <main className="flex flex-col w-full h-full gap-2 p-2">
        <section className="fle flex-col gap-2">
          <Input />
          <Input />
        </section>
        <section className="flex flex-row w-full mt-auto items-center justify-around">
          <Button
            variant="error"
            onClick={() => setAddItem(false)}
            className="w-[calc(50%-0.5rem)]"
          >
            Отменить
          </Button>
          <Button
            onClick={() => setAddItem(false)}
            className="w-[calc(50%-0.5rem)]"
          >
            Добавить
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center">
      {isAdmin && (
        <Button
          variant="success"
          className="w-full"
          onClick={() => {
            if (!isAdmin) return;

            setAddItem(true);
          }}
        >
          <Plus />
        </Button>
      )}
    </main>
  );
}

export default memo(ListBrowser);
