import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, startTransition, useCallback, useState } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon, Plus } from "lucide-react";
import ItemsApi from "@/api/items.api";
import { Item } from "@/types/items";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import Image from "@/components/shared/image.component";
import { image as clientImage } from "@/api/client.api";
import { highlightText, translateItemType } from "@/lib/utils";
import type { SortMethod, SortDirection } from "../browser.root";
import AddItem from "./add.tab";
import { User } from "@/types/user";
import UserApi from "@/api/user.api";
import { CreateModal } from "@/components/shared/items.modal";
import { Input } from "@/components/ui/input.component";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { Activity } from "@/types/activity";
import ActivityApi from "@/api/activity.api";

const itemsApi = new ItemsApi();
const usersApi = new UserApi();
const activityApi = new ActivityApi();

interface ListBrowserProps {
  searchTerms: string;
  sortMethod: SortMethod;
  sortDirection: SortDirection;
  setSortMethod: (method: SortMethod) => void;
  setSortDirection: (direction: SortDirection) => void;
}

function ListBrowser({
  searchTerms,
  sortMethod,
  sortDirection,
}: ListBrowserProps) {
  const queryClient = useQueryClient();
  const isAdmin = useUserStore((state) => state.isAdmin);
  const user = useUserStore((state) => state.user);

  const [addItem, setAddItem] = useState<boolean>(false);
  const [itemData, setItemData] = useState<Item | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selected, setSelected] = useState<User | null>(user ? user : null);
  const [input, setInput] = useState<string>("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["listTab"],
    queryFn: async (): Promise<{ items: Item[]; users: User[] }> => {
      return {
        items: await itemsApi.getAllItems(),
        users: await usersApi.getAllUsers(),
      };
    },
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

  if (addItem) return <AddItem setAddItem={setAddItem} />;

  return (
    <main className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center">
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
                      refetchType: "all",
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

      {isAdmin && (
        <section className="flex flex-row gap-1 w-full">
          <span className="flex flex-row gap-1 w-20 text-center items-center justify-center text-md font-bold p-1 h-9 border-2 border-highlight-high">
            {data?.items.filter(
              (item) =>
                item.label.toUpperCase().includes(searchTerms.toUpperCase()) ||
                item.description
                  .toUpperCase()
                  .includes(searchTerms.toUpperCase()),
            ).length ?? 0}
          </span>
          <Button
            variant="success"
            className="flex-1"
            onClick={() => {
              if (!isAdmin) return;

              setAddItem(true);
            }}
          >
            <Plus />
          </Button>
        </section>
      )}

      {data?.items
        ?.filter(
          (item) =>
            item.label.toUpperCase().includes(searchTerms.toUpperCase()) ||
            item.description.toUpperCase().includes(searchTerms.toUpperCase()),
        )
        .sort((a, b) => {
          let comparison = 0;
          switch (sortMethod) {
            case "name":
              comparison = a.label.localeCompare(b.label);
              break;
            case "date":
              comparison = String(a.created || "").localeCompare(
                String(b.created || ""),
              );
              break;
            case "charges":
              comparison = (a.charge || 0) - (b.charge || 0);
              break;
            case "type":
              comparison = String(a.type || "").localeCompare(
                String(b.type || ""),
              );
              break;
          }
          return sortDirection === "asc" ? comparison : -comparison;
        })
        .map((item) => (
          <section
            key={item.id}
            className="relative p-2 flex flex-row w-full min-h-fit h-22 border-2 border-highlight-high items-center"
          >
            <div className="flex flex-col gap-1">
              <span className="w-20 h-6 bg-card text-primary font-bold border border-highlight-high text-center text-[14px]">
                {translateItemType(item.type)}
              </span>
              <Image
                src={`${clientImage?.items}${item.id}/${item.image}`}
                alt={item.label}
                className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background "
              />
              <span className="w-20 h-6 bg-card text-primary font-bold border border-highlight-high text-center">
                {item.charge}
              </span>
            </div>
            <div className="flex flex-col ml-2">
              <span className="font-bold text-xl">
                {highlightText(item.label, searchTerms)}
              </span>
              <span className="text-text/80">
                {highlightText(item.description, searchTerms)}
              </span>
            </div>
            <div className="ml-auto mb-auto flex flex-row gap-1">
              <Button
                variant="success"
                size="icon"
                title="Добавить предмет в инвентарь"
                onClick={async () => {
                  if (!user) return;
                  setLoading(true);

                  setItemData(item);

                  setLoading(false);
                }}
              >
                {loading ? <SmallLoader /> : <Plus />}
              </Button>
            </div>
          </section>
        ))}
    </main>
  );
}

export default memo(ListBrowser);
