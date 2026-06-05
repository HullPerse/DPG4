import { getFileUrl } from "@/api/client.api";
import ItemsApi from "@/api/items.api";
import { WindowError } from "@/components/shared/error.component";
import {
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
import { highlightText, translateItemType } from "@/lib/utils";
import ImageViewer from "@/components/shared/viewer.component";
import { CreateModal } from "@/components/shared/items.modal";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { User } from "@/types/user";
import UserApi from "@/api/user.api";
import { Input } from "@/components/ui/input.component";
import { Activity } from "@/types/activity";
import ActivityApi from "@/api/activity.api";

const itemsApi = new ItemsApi();
const userApi = new UserApi();
const activityApi = new ActivityApi();

function ItemsTab({ searchTerms }: { searchTerms: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [result, setResult] = useState<Item | null>(null);
  const [itemData, setItemData] = useState<Item | null>(null);
  const [selected, setSelected] = useState<User | null>(user ? user : null);
  const [input, setInput] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["itemsWheel", searchTerms],
    queryFn: async (): Promise<{ items: Item[]; users: User[] }> => {
      const items = await itemsApi.getItems({
        rollable: true,
        search: searchTerms || undefined,
      });
      const users = await userApi.getAllUsers();

      return {
        items,
        users,
      };
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

  const visibleItems =
    data?.items.filter((item) => !hiddenItems.includes(String(item.id))) ?? [];

  return (
    <main className="flex flex-col gap-2 w-full h-full">
      {itemData && (
        <CreateModal
          label={itemData.label}
          body={() => (
            <main className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-bold">Игроки</span>
                <Select
                  value={selected?.id ?? ""}
                  onValueChange={(e) => {
                    if (!e) return;
                    const item = data?.users?.find((i) => i.id === e);
                    if (item) setSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue
                      placeholder="Игрок"
                      style={{ color: selected?.color }}
                    >
                      {selected?.username}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.users?.map((item, index) => (
                        <SelectItem
                          key={item.id}
                          value={item.id!}
                          style={{ color: item.color }}
                        >
                          {`${index + 1}: `}
                          {item.username}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </label>

              <label>
                <span className="font-bold">Примечание</span>
                <Input
                  placeholder="Примечание"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
              </label>

              <section className="flex flex-row items-center justify-between gap-2 p-1">
                <Button
                  className="flex flex-1"
                  variant="success"
                  onClick={async () => {
                    if (!selected || !itemData) return;

                    await itemsApi.addInventory(
                      String(selected?.id),
                      String(itemData.id),
                    );

                    queryClient.invalidateQueries({
                      queryKey: ["inventoryTab", selected.id],
                      refetchType: "active",
                    });

                    if (selected.id !== user?.id) {
                      const activityData = {
                        author: user?.id,
                        image: user?.avatar,
                        text: `${user?.username} добавил ${itemData.label} игроку ${selected.username}`,
                      } as Activity;

                      await activityApi.createActivity(activityData);
                    }

                    setSelected(null);
                    setInput("");
                    return setItemData(null);
                  }}
                  disabled={!selected}
                >
                  Применить
                </Button>
              </section>
            </main>
          )}
          open={!!itemData}
          setOpen={(open) => {
            if (!open) setItemData(null);
          }}
        />
      )}

      {/* WHEEL */}
      <section className="flex flex-col w-full gap-2 p-2 items-center justify-center">
        <Wheel
          key={hiddenItems.join(",")}
          list={visibleItems.map((item) => ({
            id: String(item.id),
            label: item.label,
            image: `${getFileUrl(item)}`,
            type: "image",
          }))}
          onResult={(it) => {
            return setResult(
              data?.items.find(
                (item) => String(item.id) === String(it?.id),
              ) as Item,
            );
          }}
          free={false}
        />

        {result && (
          <section
            key={result.id}
            className="relative p-2 flex flex-row max-w-full w-xl h-fit min-h-22 max-h-50 border-2 border-highlight-high items-center"
          >
            <div className="flex flex-col gap-1">
              <span className="w-20 h-6 bg-card text-primary font-bold border border-highlight-high text-center text-[14px]">
                {translateItemType(result.type)}
              </span>
              <ImageViewer
                src={[`${getFileUrl(result)}`]}
                zoomable
                draggable
                trigger={
                  <ImageComponent
                    src={`${getFileUrl(result)}`}
                    alt={result.label}
                    className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background hover:cursor-pointer"
                  />
                }
              />
            </div>

            <div className="flex flex-col ml-2">
              <span className="font-bold text-xl">{result.label}</span>
              <div className="overflow-y-auto max-h-40 p-1 mr-1">
                <span className="text-text/80 ">{result.description}</span>
              </div>
            </div>
            <div className="ml-auto flex flex-row gap-1">
              <Button
                variant="success"
                size="icon"
                title="Добавить предмет в инвентарь"
                loading={loading}
                onClick={() => {
                  setLoading(true);
                  setItemData(result);
                  setLoading(false);
                }}
              >
                <Plus />
              </Button>
            </div>
          </section>
        )}
      </section>
      {/* LIST */}
      <section className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center border-t-2 border-highlight-high">
        {data?.items.map((item) => (
          <section
            key={item.id}
            className="relative p-2 flex flex-row w-full min-h-fit h-22 border-2 border-highlight-high items-center"
            style={{
              opacity: hiddenItems.find((h) => h === String(item.id)) && "50%",
            }}
          >
            <div className="flex flex-col gap-1">
              <span className="w-20 h-6 bg-card text-primary font-bold border border-highlight-high text-center text-[14px]">
                {translateItemType(item.type)}
              </span>
              <ImageViewer
                src={[`${getFileUrl(item)}`]}
                zoomable
                draggable
                trigger={
                  <ImageComponent
                    src={`${getFileUrl(item)}`}
                    alt={item.label}
                    className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background hover:cursor-pointer"
                  />
                }
              />
            </div>
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
                    hiddenItems.filter((h) => h === String(item.id)).length > 0;

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
                loading={loading}
                onClick={() => {
                  setLoading(true);

                  setItemData(item);

                  setLoading(false);
                }}
              >
                <Plus />
              </Button>
            </div>
          </section>
        ))}
      </section>
    </main>
  );
}

export default memo(ItemsTab);
