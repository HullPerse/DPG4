import { image } from "@/api/client.api";
import ItemsApi, { NON_WHEEL_ITEMS } from "@/api/items.api";
import { WindowError } from "@/components/shared/error.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { useUserStore } from "@/store/user.store";
import { Item } from "@/types/items";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeIcon, EyeOffIcon, NetworkIcon, Plus } from "lucide-react";
import { memo, startTransition, useCallback, useState } from "react";
import Wheel from "@/components/shared/wheel.component";
import ImageComponent from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { highlightText, openWindow } from "@/lib/utils";

const itemsApi = new ItemsApi();

function ItemsTab({ searchTerms }: { searchTerms: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [result, setResult] = useState<Item | null>(null);

  const [loading, setLoading] = useState<boolean>(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["itemsWheel"],
    queryFn: async (): Promise<Item[]> => {
      const res = await itemsApi.getAllItems();
      return res.filter((i) => !NON_WHEEL_ITEMS.includes(i.id ?? ""));
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["itemsWheel"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("items", "*", invalidateQuery);
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
    const item = data?.find((Item) => Item.id === id);
    if (!item) return;

    setLoading(true);

    return await itemsApi
      .addInventory(
        String(user?.id),
        String(item.id),
        `${image?.items}${item.id}/${item.image}`,
      )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["libraryGames"] });
        queryClient.invalidateQueries({ queryKey: ["inventoryTab", user?.id] });
        setLoading(false);
        setResult(null);
      });
  };

  const visibleItems =
    data?.filter((item) => !hiddenItems.includes(String(item.id))) ?? [];

  return (
    <main className="flex flex-col gap-2 w-full h-full">
      {/* WHEEL */}
      <section className="flex flex-col w-full gap-2 p-2 items-center justify-center">
        <Wheel
          key={hiddenItems.join(",")}
          list={visibleItems.map((item) => ({
            id: String(item.id),
            label: item.label,
            image: `${image?.items}${item.id}/${item.image}`,
            type: "image",
          }))}
          onResult={(it) => {
            return setResult(
              data?.find((item) => String(item.id) === String(it?.id)) as Item,
            );
          }}
          free={false}
        />

        {result && (
          <section
            key={result.id}
            className="relative p-2 flex flex-row max-w-full w-xl min-h-fit h-22 border-2 border-highlight-high items-center"
          >
            <ImageComponent
              src={`${image?.items}${result.id}/${result.image}`}
              alt={result.label}
              className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background hover:cursor-pointer"
              onClick={() => {
                openWindow(
                  String(result.id),
                  `${image?.items}${result.id}/${result.image}`,
                  "Изображение",
                );
              }}
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
                {loading ? <SmallLoader /> : <Plus />}
              </Button>
            </div>
          </section>
        )}
      </section>
      {/* LIST */}
      <section className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center border-t-2 border-highlight-high">
        {data
          ?.filter(
            (item) =>
              item.label.toUpperCase().includes(searchTerms.toUpperCase()) ||
              item.description
                .toUpperCase()
                .includes(searchTerms.toUpperCase()),
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
                src={`${image?.items}${item.id}/${item.image}`}
                alt={item.label}
                className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background hover:cursor-pointer"
                onClick={() => {
                  openWindow(
                    String(item.id),
                    `${image?.items}${item.id}/${item.image}`,
                    "Изображение",
                  );
                }}
              />
              <div className="flex flex-col ml-2">
                <span className="font-bold text-xl">
                  {highlightText(item.label, searchTerms)}
                </span>
                <span className="text-text/80">
                  {highlightText(item.description, searchTerms)}
                </span>
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
                <Button
                  variant="success"
                  size="icon"
                  title="Добавить предмет в инвентарь"
                  onClick={() => handleAddItem(String(item.id))}
                >
                  {loading ? <SmallLoader /> : <Plus />}
                </Button>
              </div>
            </section>
          ))}
      </section>
    </main>
  );
}

export default memo(ItemsTab);
