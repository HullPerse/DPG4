import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, startTransition, useCallback, useEffect, useState } from "react";
import UserApi from "@/api/user.api";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { EyeIcon, EyeOffIcon, NetworkIcon, Plus, Send } from "lucide-react";
import Wheel from "@/components/shared/wheel.component";
import { Button } from "@/components/ui/button.component";
import ImageComponent from "@/components/shared/image.component";
import { useUserStore } from "@/store/user.store";
import { User } from "@/types/user";
import ItemsApi from "@/api/items.api";
import { Inventory } from "@/types/items";
import { image } from "@/api/client.api";

const itemApi = new ItemsApi();
const userApi = new UserApi();

function UserItems({
  selected,
  values,
  setValues,
}: {
  selected: number;
  values: string[];
  setValues: (values: string[]) => void;
}) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [result, setResult] = useState<Inventory | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["UserItemsWheel", selected],
    queryFn: async (): Promise<{ items: Inventory[]; users: User[] }> => {
      const users = await userApi.getAllUsers();

      setValues(["ВСЕ", ...users.map((u) => u.username)]);

      return { items: await itemApi.getAllInventories(), users };
    },
  });

  useEffect(() => {
    if (data && selected === 0 && values.length === 0) {
      setValues(["ВСЕ", ...data.users.map((u) => u.username)]);
    }
  }, [selected, values.length, data?.users]);

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["UserItemsWheel", selected],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("inventory", "*", invalidateQuery);
  useSubscription("users", "*", invalidateQuery);

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

  const handleAddItem = async (id: string) => {
    const item = data?.items.find((Item) => Item.id === id);
    if (!item) return;

    return await itemApi.sendInventory(String(item.id), String(user?.id));
  };

  const visibleItems =
    data?.items.filter((item) => !hiddenItems.includes(String(item.id))) ?? [];
  return (
    <main className="flex flex-col gap-2 w-full h-full">
      {/* WHEEL */}
      <section className="flex flex-col w-full gap-2 p-2 items-center justify-center">
        <Wheel
          key={`wheel-${selected}-${hiddenItems.join(",")}`}
          list={visibleItems
            .filter((item) =>
              selected === 0
                ? item
                : data?.users.find((u) => u.id === item.owner)?.username ===
                  values[selected],
            )

            .map((item) => ({
              id: String(item.id),
              label: item.label,
              image: `${image?.inventory}${item.id}/${item.image}`,
              type: "image",
            }))}
          onResult={(it) => {
            return setResult(
              data?.items.find(
                (item) => String(item.id) === String(it?.id),
              ) as Inventory,
            );
          }}
        />

        {result && (
          <section
            key={result.id}
            className="relative p-2 flex flex-row max-w-full w-xl min-h-fit h-22 border-2 border-highlight-high items-center"
          >
            <ImageComponent
              src={`${image?.inventory}${result.id}/${result.image}`}
              alt={result.label}
              className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background "
              type="contain"
            />
            <div className="flex flex-col ml-2">
              <span className="font-bold text-xl">{result.label}</span>
              <span className="text-text/80">{result.description}</span>
            </div>
            <div className="ml-auto flex flex-row gap-1">
              <Button
                variant="success"
                size="icon"
                title="Добавить предмет в инвентарь"
                onClick={() => handleAddItem(String(result.id))}
              >
                <Plus />
              </Button>
            </div>
          </section>
        )}
      </section>
      {/* LIST */}
      <section className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center border-t-2 border-highlight-high">
        {data?.items
          .filter((item) =>
            selected === 0
              ? item
              : data?.users.find((u) => u.id === item.owner)?.username ===
                values[selected],
          )
          .map((item) => (
            <section
              key={item.id}
              className="relative p-2 flex flex-row w-full min-h-fit h-22 border-2 border-highlight-high items-center"
              style={{
                opacity:
                  hiddenItems.find((h) => h === String(item.id)) && "50%",
              }}
            >
              <ImageComponent
                src={`${image?.inventory}${item.id}/${item.image}`}
                alt={item.label}
                className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background "
                type="contain"
              />

              <div className="flex flex-col ml-2">
                <span className="font-bold text-xl">{item.label}</span>
              </div>
              <div className="ml-auto flex flex-row gap-1">
                <Button
                  size="icon"
                  onClick={() => {
                    const existingGame =
                      hiddenItems.filter((h) => h === String(item.id)).length >
                      0;

                    if (!existingGame)
                      return setHiddenItems([...hiddenItems, String(item.id)]);

                    return setHiddenItems(
                      hiddenItems.filter((h) => h !== String(item.id)),
                    );
                  }}
                >
                  {hiddenItems.find((h) => h === String(item.id)) ? (
                    <EyeIcon size={20} />
                  ) : (
                    <EyeOffIcon size={20} />
                  )}
                </Button>
                {item.owner !== user?.id && (
                  <Button
                    title="Добавить в библиотеку"
                    variant="info"
                    size="icon"
                    onClick={() => handleAddItem(String(item.id))}
                  >
                    <Send />
                  </Button>
                )}
              </div>
            </section>
          ))}
      </section>
    </main>
  );
}

export default memo(UserItems);
