import { startTransition, useCallback, useMemo, useState } from "react";
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
import { effectInterface, Inventory, Item, ItemType } from "@/types/items";
import ItemsApi from "@/api/items.api";
import UserApi from "@/api/user.api";
import ImageComponent from "@/components/shared/image.component";
import { image } from "@/api/client.api";
import { highlightText, translateItemType } from "@/lib/utils";
import { Button } from "@/components/ui/button.component";
import { Combobox } from "@/components/ui/combobox.component";
import { User } from "@/types/user";
import { otherEffect } from "@/lib/items/other.items";
import { CreateModal } from "@/components/shared/items.modal";
import { itemEffect } from "@/lib/items/item.items";
import { Activity } from "@/types/activity";
import ActivityApi from "@/api/activity.api";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover.component";
import { Dialog, DialogContent } from "@/components/ui/dialog.component";

const itemsApi = new ItemsApi();
const userApi = new UserApi();
const activityApi = new ActivityApi();

function InventoryTab({ id }: { id?: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const currentId = id ? id : String(user?.id);

  let initialLoad = false;

  const [modal, setModal] = useState<string | null>(null);

  const [searchTerms, setSearchTerms] = useState<string>("");
  const [active, setActive] = useState<number | null>(null);
  const [price, setPrice] = useState<string>("");
  const [removeStatus, setRemoveStatus] = useState<boolean>(false);
  const [activeStatus, setActiveStatus] = useState<string>("");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
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
    queryFn: async (): Promise<{
      inventory: Inventory[];
      users: User[];
      statuses: Item[];
    }> => {
      const inventory = await itemsApi.getInventory(currentId);
      const users = await userApi.getAllUsers();

      //statuses
      let finalStatuses: Item[] = [];

      const allStatuses = users.find((u) => u.id === currentId)?.status;

      if (!allStatuses) finalStatuses = [];
      else {
        const allItems = await itemsApi.getAllItems();

        for (const status of allStatuses) {
          const item = allItems.find((i) => i.label === status);
          if (!item) continue;

          finalStatuses.push(item);
        }
      }

      return {
        inventory: inventory,
        users: users.filter((item) => item.id !== currentId),
        statuses: finalStatuses,
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
  useSubscription("users", "*", invalidateQuery);

  const modalItem = useMemo(() => {
    if (!modal) return null;
    return (
      [...otherEffect, ...itemEffect].find((e) => e.label === modal) ?? null
    );
  }, [modal, otherEffect]);

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

  const handleUse = async (index: number, item: Inventory) => {
    setLoading({
      item: index,
      type: "use",
    });

    const lookup: Record<ItemType, effectInterface[]> = {
      item: itemEffect,
      other: otherEffect,
      roll: [],
      effect: [],
    };

    if (item.type === "effect") {
      await userApi.changeUserStatus(String(user?.id), item.label, "add");

      await itemsApi.chargeInventory(String(item.id), item.charge, -1);

      setLoading({ item: -1, type: null });
      return setActive(null);
    }

    const existing = lookup[item.type]?.find((e) => e.label === item.label);

    if (!existing) {
      const activityData = {
        author: user?.id,
        image: user?.avatar,
        type: "emoji",
        text: `${user?.username} использовал предмет ${item.label}`,
      } as Activity;

      await activityApi.createActivity(activityData);

      await itemsApi.chargeInventory(String(item.id), item.charge, -1);

      setLoading({ item: -1, type: null });
      return setActive(null);
    }

    if (existing.type === "effect") {
      existing.effect?.();
      setLoading({ item: -1, type: null });
      return setActive(null);
    } else {
      setModal(existing.label);
      setLoading({ item: -1, type: null });
      return setActive(null);
    }
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
      {modalItem && (
        <CreateModal
          label={modalItem.label}
          body={modalItem.body}
          open={!!modal}
          setOpen={(open) => {
            if (!open) setModal(null);
          }}
        />
      )}

      <Input
        autoFocus
        type="text"
        placeholder="Поиск пользователя"
        value={searchTerms}
        onChange={(e) => setSearchTerms(e.target.value)}
      />
      {data?.statuses && data?.statuses.length > 0 && (
        <section className="flex flex-wrap justify-start w-full min-h-32 max-h-32 h-32 pb-4 gap-2 border-b-2 border-highlight-high overflow-y-scroll">
          <Dialog
            open={removeStatus}
            onOpenChange={(value) => setRemoveStatus(value)}
          >
            <DialogContent
              showCloseButton={false}
              className="p-0 border-0 min-w-xl max-w-full"
            >
              <main
                style={{
                  zIndex: 999,
                  boxShadow: "4px 4px 0 transparent",
                  border: "2px solid var(--color-highlight-high)",
                  display: "grid",
                  gridTemplateRows: "auto 1fr",
                }}
                className="overflow-hidden bg-card text-text transition-none"
              >
                {/* Head */}
                <section className="flex h-10 w-full flex-row items-center justify-between bg-background px-1 select-none border-b-2 border-highlight-high">
                  <span className=" flex item-center text-md font-bold line-clamp-1">
                    Удалить статус {activeStatus} ?
                  </span>

                  <Button
                    variant="ghost"
                    title="Закрыть"
                    onClick={() => setRemoveStatus(false)}
                  >
                    <X />
                  </Button>
                </section>

                {/* Body */}
                <section className="flex w-full min-h-0 h-full flex-col p-1">
                  <Button
                    variant="error"
                    onClick={async () => {
                      if (currentId !== user?.id) return;
                      setIsDeleting(true);

                      await userApi.changeUserStatus(
                        user?.id,
                        activeStatus,
                        "remove",
                      );

                      setActiveStatus("");
                      setRemoveStatus(false);
                      setIsDeleting(false);
                    }}
                  >
                    {isDeleting ? <SmallLoader /> : "УДАЛИТЬ"}
                  </Button>
                </section>
              </main>
            </DialogContent>
          </Dialog>

          {data?.statuses?.map((status, index) => (
            <HoverCard key={index}>
              <HoverCardTrigger
                delay={300}
                className="relative flex flex-col min-w-28 min-h-28 w-28 h-28 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background items-center p-2"
                style={{
                  cursor: user?.id === currentId ? "pointer" : "default",
                }}
                onClick={() => {
                  if (currentId === user?.id) {
                    setActiveStatus(status.label);
                    setRemoveStatus(true);
                  }
                }}
              >
                <span className="text-xs font-bold line-clamp-2 text-center h-10">
                  {status.label}
                </span>

                <ImageComponent
                  src={`${image.items}${status.id}/${status.image}`}
                  alt={status.label}
                  className="min-w-14 w-14 min-h-14 h-14 border border-highlight-high"
                  type="contain"
                />
              </HoverCardTrigger>
              <HoverCardContent
                className="z-9999 flex flex-col gap-1 shadow-sharp-sm border-2 border-highlight-high h-30 max-h-30 mi-h-30 min-w-full w-sm"
                side="top"
              >
                <span>{status.description}</span>
              </HoverCardContent>
            </HoverCard>
          ))}
        </section>
      )}
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

                <div className="flex flex-col items-center justify-center">
                  <span className="w-full h-6 items-center justify-center my-1 bg-card text-primary font-bold border border-highlight-high text-center text-[14px]">
                    {translateItemType(item.type)}
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
                      rendered={currentId === user?.id}
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
                      rendered={currentId === user?.id}
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
                </div>

                <span className="line-clamp-3 hover:line-clamp-none hover:overflow-y-auto text-xs leading-tight h-16 max-h-16">
                  {highlightText(item.description, searchTerms)}
                </span>
              </div>
            ),
          )}
      </section>
    </main>
  );
}
export default InventoryTab;
