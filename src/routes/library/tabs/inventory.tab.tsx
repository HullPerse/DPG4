import { memo, startTransition, useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/subscription.hook";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import {
  Minus,
  NetworkIcon,
  Plus,
  Send,
  ShoppingCart,
  Trash,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input.component";
import { useUserStore } from "@/store/user.store";
import { Inventory } from "@/types/items";
import ItemsApi from "@/api/items.api";
import UserApi from "@/api/user.api";
import ImageComponent from "@/components/shared/image.component";
import { image } from "@/api/client.api";
import { highlightText } from "@/lib/utils";
import { Button } from "@/components/ui/button.component";
import { Combobox } from "@/components/ui/combobox.component";
import { User } from "@/types/user";
import { usableItems } from "@/lib/items";

const itemsApi = new ItemsApi();
const userApi = new UserApi();

function InventoryTab({ id }: { id?: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const currentId = id ? id : String(user?.id);

  let initialLoad = false;

  const [searchTerms, setSearchTerms] = useState<string>("");
  const [active, setActive] = useState<number | null>(null);
  const [price, setPrice] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState<{
    item: number;
    type: "use" | "delete" | "sell" | "send" | null;
  }>({
    item: -1,
    type: "use",
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inventoryTab", currentId],
    queryFn: async (): Promise<{ inventory: Inventory[]; users: User[] }> => {
      const inventory = await itemsApi.getInventory(currentId);
      const users = await userApi.getAllUsers();

      return {
        inventory: inventory,
        users: users.filter((item) => item.id !== currentId),
      };
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["inventoryTab", currentId],
        refetchType: "all",
      });
    });
  }, [queryClient, currentId]);

  useSubscription("inventory", "*", invalidateQuery);
  useSubscription("market", "*", invalidateQuery);

  if (!initialLoad && isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  initialLoad = true;

  const handleUse = (index: number, item: Inventory) => {
    setLoading({
      item: index,
      type: "use",
    });

    usableItems(item);

    setActive(null);
    setLoading({
      item: -1,
      type: null,
    });
  };

  const handleDelete = async (index: number, inventoryId: string) => {
    setLoading({
      item: index,
      type: "delete",
    });

    await itemsApi.removeInventory(inventoryId).then(() => {
      setActive(null);
      setLoading({
        item: -1,
        type: null,
      });

      invalidateQuery();
    });
  };

  const handleSend = async (
    index: number,
    inventoryId: string,
    userId: string,
  ) => {
    setLoading({
      item: index,
      type: "send",
    });

    await itemsApi.sendInventory(inventoryId, userId).then(() => {
      setActive(null);
      setLoading({
        item: -1,
        type: null,
      });

      invalidateQuery();
      queryClient.invalidateQueries({
        queryKey: ["inventoryTab", userId],
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: ["inventoryTab", user?.id],
        refetchType: "all",
      });
    });
  };

  const handleSell = async (
    index: number,
    inventoryId: string,
    owner: string,
  ) => {
    if (!price) return;

    setLoading({
      item: index,
      type: "send",
    });

    await itemsApi.sellInventory(inventoryId, owner, Number(price)).then(() => {
      setActive(null);
      setLoading({
        item: -1,
        type: null,
      });
    });

    invalidateQuery();

    queryClient.invalidateQueries({
      queryKey: ["marketTab"],
      refetchType: "all",
    });
  };

  const handleCharge = async (
    index: number,
    inventoryId: string,
    oldCharge: number,
    newCharge: number,
  ) => {
    setLoading({
      item: index,
      type: "send",
    });

    await itemsApi
      .chargeInventory(inventoryId, oldCharge, newCharge)
      .then(() => {
        setActive(null);
        setLoading({
          item: -1,
          type: null,
        });
      });

    invalidateQuery();
  };

  return (
    <main className="p-2 flex flex-col w-full h-full gap-2">
      <Input
        autoFocus
        type="text"
        placeholder="Поиск пользователя"
        value={searchTerms}
        onChange={(e) => setSearchTerms(e.target.value)}
      />
      <section className="flex flex-wrap justify-start gap-2 overflow-y-auto w-full pb-5">
        {data?.inventory
          .filter(
            (item) =>
              item.label.toUpperCase().includes(searchTerms.toUpperCase()) ||
              item.description
                .toUpperCase()
                .includes(searchTerms.toUpperCase()),
          )
          .map((item, index) =>
            active === index ? (
              <div
                key={item.id}
                className="relative flex flex-col min-w-64 min-h-64 w-64 h-64 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background items-center p-2"
              >
                <Button
                  size="icon"
                  variant="error"
                  className="absolute top-1 right-1"
                  onClick={() => {
                    setPrice("");
                    setActive(null);
                  }}
                >
                  <X />
                </Button>
                <section className="flex flex-col w-full mt-auto gap-1">
                  <div className="flex flex-row gap-2 w-full items-center">
                    <Combobox
                      options={data?.users.map((u) => {
                        return {
                          label: u.username,
                          value: String(u.id),
                          style: { color: u.color },
                        };
                      })}
                      value={selectedUser}
                      onChange={setSelectedUser}
                      placeholder={selectedUser || "Пользователь"}
                      className="w-64"
                      loading={
                        loading.type === "send" && loading.item === index
                      }
                    />
                    <Button
                      disabled={
                        (loading.type === "send" && loading.item === index) ||
                        !selectedUser
                      }
                      onClick={() => {
                        if (!selectedUser) return;

                        handleSend(index, String(item.id), selectedUser);
                      }}
                      className="my-1"
                      size="icon"
                    >
                      {loading.type === "send" && loading.item === index ? (
                        <SmallLoader />
                      ) : (
                        <Send />
                      )}
                    </Button>
                  </div>
                  <div
                    className="flex flex-row gap-2 w-full items-center"
                    hidden={currentId !== user?.id}
                  >
                    <Input
                      type="number"
                      placeholder="Продажа"
                      className="h-9"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      arrows
                      arrowsGap="0px"
                      min={0}
                      max={9999}
                    />
                    <Button
                      size="icon"
                      variant="info"
                      onClick={() =>
                        handleSell(index, String(item.id), item.owner)
                      }
                      disabled={
                        (loading.type === "sell" && loading.item === index) ||
                        !price
                      }
                    >
                      {loading.type === "sell" && loading.item === index ? (
                        <SmallLoader />
                      ) : (
                        <ShoppingCart />
                      )}
                    </Button>
                  </div>
                  <div className="flex flex-row gap-2 w-full items-center">
                    <Button
                      variant="success"
                      className="flex-1"
                      onClick={() => handleUse(index, item)}
                      hidden={currentId !== user?.id}
                      disabled={
                        loading.type === "use" && loading.item === index
                      }
                    >
                      {loading.type === "use" && loading.item === index ? (
                        <SmallLoader />
                      ) : (
                        "Использовать"
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="error"
                      style={{
                        width: currentId !== user?.id ? "100%" : undefined,
                      }}
                      onClick={() => handleDelete(index, String(item.id))}
                      disabled={
                        loading.type === "delete" && loading.item === index
                      }
                    >
                      {loading.type === "delete" && loading.item === index ? (
                        <SmallLoader />
                      ) : (
                        <Trash />
                      )}
                    </Button>
                  </div>
                </section>
              </div>
            ) : (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className="flex flex-col min-w-64 min-h-64 w-64 h-64 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background hover:opacity-100 opacity-75 hover:cursor-pointer items-center p-2"
                onClick={() => {
                  setPrice("");
                  setActive(index);
                }}
              >
                <span className="font-bold text-md line-clamp-2">
                  {highlightText(item.label, searchTerms)}
                </span>
                <ImageComponent
                  src={`${image.inventory}${item.id}/${item.image}`}
                  alt={item.label}
                  className="min-w-24 w-24 min-h-24 h-24 border border-highlight-high"
                  type="contain"
                />

                <div className="flex flex-row gap-0.5 w-full h-6 items-center justify-center my-1">
                  <Button
                    variant="error"
                    size="icon"
                    className="w-6 h-6"
                    onClick={(e) => {
                      e.stopPropagation();

                      handleCharge(index, String(item.id), item.charge, -1);
                    }}
                  >
                    <Minus />
                  </Button>
                  <span className="w-24 h-6 bg-card text-primary font-bold border border-highlight-high text-center">
                    {item.charge}
                  </span>
                  <Button
                    variant="success"
                    size="icon"
                    className="w-6 h-6"
                    onClick={(e) => {
                      e.stopPropagation();

                      handleCharge(index, String(item.id), item.charge, 1);
                    }}
                  >
                    <Plus />
                  </Button>
                </div>

                <span className="line-clamp-4 text-xs leading-tight">
                  {highlightText(item.description, searchTerms)}
                </span>
              </div>
            ),
          )}
      </section>
    </main>
  );
}
export default memo(InventoryTab);
