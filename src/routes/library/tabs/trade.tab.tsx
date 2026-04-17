import ItemsApi from "@/api/items.api";
import UsersApi from "@/api/user.api";
import { WindowError } from "@/components/shared/error.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { useUserStore } from "@/store/user.store";
import { Inventory, Trade } from "@/types/items";
import { User } from "@/types/user";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, NetworkIcon } from "lucide-react";
import { memo, startTransition, useCallback, useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { Input } from "@/components/ui/input.component";
import ImageComponent from "@/components/shared/image.component";
import { image } from "@/api/client.api";
import { Button } from "@/components/ui/button.component";

const itemsApi = new ItemsApi();
const userApi = new UsersApi();

function TradeTab({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [loading, setLoading] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string>(
    String(user?.username),
  );
  const [selectedItems, setSelectedItems] = useState<{
    money: { owner: string; amount: number }[];
    items: { owner: string; items: string[] }[];
  } | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tradeTab", id],
    queryFn: async (): Promise<{
      user: User;
      currentInventory: Inventory[];
      inventory: Inventory[];
    }> => {
      return {
        user: await userApi.getUserById(id),
        currentInventory: await itemsApi.getInventory(String(user?.id)),
        inventory: await itemsApi.getInventory(id),
      };
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

  const handleTrade = async () => {
    if (!data) return;
    setLoading(true);

    const currentUser = {
      id: user?.id,
      money:
        selectedItems?.money?.find((m) => m.owner === user?.username)?.amount ??
        0,
      items:
        selectedItems?.items?.find((i) => i.owner === user?.username)?.items ??
        [],
    } as Trade;

    const otherUser = {
      id: data.user.id,
      money:
        selectedItems?.money?.find((m) => m.owner === data.user.username)
          ?.amount ?? 0,
      items:
        selectedItems?.items?.find((i) => i.owner === data.user.username)
          ?.items ?? [],
    } as Trade;

    await itemsApi.tradeInventory(currentUser, otherUser);

    setSelectedItems(null);
    setLoading(false);
  };

  const itemComponent = (item: Inventory) => {
    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        className="relative flex flex-col min-w-64 min-h-64 w-64 h-64 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background hover:opacity-100 opacity-75 hover:cursor-pointer items-center p-2"
        onClick={() => {
          if (!item) return;

          const itemsOwner = (selectedItems?.items || []).find(
            (i) => i.owner === currentUser,
          );

          const existingItem = itemsOwner?.items.find((i) => i === item.id);

          if (existingItem) {
            const filteredOwners = (selectedItems?.items || []).flatMap(
              (ownerGroup) => {
                const filteredItems = ownerGroup.items.filter(
                  (it) => it !== item.id,
                );
                return filteredItems.length > 0
                  ? [{ ...ownerGroup, items: filteredItems }]
                  : [];
              },
            );
            const newValues = {
              ...selectedItems,
              items: filteredOwners,
            };
            return setSelectedItems(newValues as keyof typeof selectedItems);
          }

          const newValues = {
            ...selectedItems,
            items: [
              ...(selectedItems?.items || []).filter(
                (i) => i.owner !== currentUser,
              ),
              {
                owner: currentUser,
                items: [...(itemsOwner?.items || []), item.id],
              },
            ],
          };

          return setSelectedItems(newValues as keyof typeof selectedItems);
        }}
      >
        <div className="absolute top-1 right-1 w-6 h-6 border border-highlight-high">
          {selectedItems?.items
            ?.find((i) => i.owner === currentUser)
            ?.items?.some((i) => i === item.id) && <Check />}
        </div>
        <span className="font-bold text-md line-clamp-2">{item.label}</span>
        <ImageComponent
          src={`${image.inventory}${item.id}/${item.image}`}
          alt={item.label}
          className="min-w-24 w-24 min-h-24 h-24 border border-highlight-high"
          type="contain"
        />

        <span className="w-24 h-6 bg-card text-primary font-bold border border-highlight-high text-center my-1">
          {item.charge}
        </span>

        <span className="line-clamp-4 text-xs leading-tight">
          {item.description}
        </span>
      </div>
    );
  };

  return (
    <main className="p-2 flex flex-col w-full h-full gap-2">
      <Select
        value={currentUser}
        onValueChange={(e) => setCurrentUser(e as string)}
      >
        <SelectTrigger className="w-full py-5">
          <SelectValue placeholder="Инвентарь" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {[user, data?.user].map((user) => (
              <SelectItem
                key={user?.id}
                value={user?.username}
                style={{ color: user?.color }}
              >
                Инвентарь {user?.username}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* MONEY */}
      <section
        className="flex flex-row w-full"
        hidden={
          currentUser === user?.username
            ? user?.money <= 0
            : (data?.user.money as number) <= 0
        }
      >
        <Input
          type="text"
          arrows
          min={0}
          max={user?.username === currentUser ? user.money : data?.user.money}
          placeholder="Чубрики"
          value={
            selectedItems?.money?.find((m) => m.owner === currentUser)
              ?.amount ?? ""
          }
          onChange={(e) => {
            const newValues = {
              ...selectedItems,
              money: [
                ...(selectedItems?.money || []).filter(
                  (m) => m.owner !== currentUser,
                ),
                { owner: currentUser, amount: Number(e.target.value) },
              ],
            };
            setSelectedItems(newValues as keyof typeof selectedItems);
          }}
        />
      </section>
      <Button
        variant="success"
        className="w-full"
        onClick={handleTrade}
        disabled={loading}
      >
        {loading ? <SmallLoader /> : "Отправить"}
      </Button>

      {/* ITEMS */}
      <section className="flex flex-wrap justify-start gap-2 overflow-y-auto w-full pb-15">
        {currentUser === user?.username
          ? data?.currentInventory?.map((item) => itemComponent(item))
          : data?.inventory?.map((item) => itemComponent(item))}
      </section>
    </main>
  );
}
export default memo(TradeTab);
