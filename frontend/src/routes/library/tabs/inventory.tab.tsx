import { useCallback, useMemo, useRef, useState } from "react";
import type { ItemLabel } from "@/types/items";
import type { ModalType } from "@/types/effect";
import ItemFramework from "@/lib/items/item.framework";
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
import { Inventory, Item } from "@/types/items";
import ItemsApi from "@/api/items.api";
import UserApi from "@/api/user.api";
import ImageComponent from "@/components/shared/image.component";
import { getFileUrl } from "@/api/client.api";
import { highlightText, translateItemType } from "@/lib/utils";
import { Button } from "@/components/ui/button.component";
import { Combobox } from "@/components/ui/combobox.component";
import { User } from "@/types/user";
import { otherEffect } from "@/lib/items/other.items";
import { CreateModal } from "@/components/shared/items.modal";
import { itemEffect } from "@/lib/items/item.items";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover.component";
import { Dialog, DialogContent } from "@/components/ui/dialog.component";

const itemsApi = new ItemsApi();
const userApi = new UserApi();

type InventoryTabData = {
  inventory: Inventory[];
  users: User[];
  statuses: Item[];
};

type ItemLoadingType = "use" | "delete" | "sell" | "send";

function InventoryTab({ id }: { id?: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const currentId = id ? id : String(user?.id);

  const initialLoadRef = useRef(false);

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
    itemId: string | null;
    type: ItemLoadingType | null;
  }>({
    itemId: null,
    type: null,
  });

  const isItemLoading = useCallback(
    (itemId: string, type: ItemLoadingType) =>
      loading.itemId === itemId && loading.type === type,
    [loading.itemId, loading.type],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["inventoryTab", currentId],
    queryFn: async (): Promise<InventoryTabData> => {
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
    staleTime: 30_000,
  });

  const patchInventoryFor = useCallback(
    async (userId: string) => {
      const inventory = await itemsApi.getInventory(userId);
      const hadCache = queryClient.getQueryData(["inventoryTab", userId]) != null;

      queryClient.setQueryData<InventoryTabData>(
        ["inventoryTab", userId],
        (prev) => (prev ? { ...prev, inventory } : prev),
      );

      if (!hadCache) {
        queryClient.invalidateQueries({
          queryKey: ["inventoryTab", userId],
          refetchType: "active",
        });
      }
    },
    [queryClient],
  );

  const refreshInventory = useCallback(
    () => patchInventoryFor(currentId),
    [patchInventoryFor, currentId],
  );

  const refreshStatuses = useCallback(async () => {
    const users = await userApi.getAllUsers();
    const allStatuses = users.find((u) => u.id === currentId)?.status;

    let finalStatuses: Item[] = [];
    if (allStatuses?.length) {
      const allItems = await itemsApi.getAllItems();
      for (const status of allStatuses) {
        const item = allItems.find((i) => i.label === status);
        if (item) finalStatuses.push(item);
      }
    }

    queryClient.setQueryData<InventoryTabData>(
      ["inventoryTab", currentId],
      (prev) =>
        prev
          ? {
              ...prev,
              users: users.filter((item) => item.id !== currentId),
              statuses: finalStatuses,
            }
          : prev,
    );
  }, [queryClient, currentId]);

  const inventoryRefreshRef = useRef<Promise<void> | null>(null);
  const refreshInventoryCoalesced = useCallback(async () => {
    if (inventoryRefreshRef.current) return inventoryRefreshRef.current;

    inventoryRefreshRef.current = refreshInventory().finally(() => {
      inventoryRefreshRef.current = null;
    });

    return inventoryRefreshRef.current;
  }, [refreshInventory]);

  useSubscription("inventory", "*", refreshInventoryCoalesced);
  useSubscription("users", "*", refreshStatuses);

  const modalItem = useMemo(() => {
    if (!modal) return null;
    return (
      [...otherEffect, ...itemEffect].find((e) => e.label === modal) ?? null
    );
  }, [modal]);

  const modalConsume = useMemo((): ModalType["consume"] | undefined => {
    if (!modal) return undefined;
    return new ItemFramework(modal as ItemLabel).consume;
  }, [modal]);

  if (!initialLoadRef.current && isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  initialLoadRef.current = true;

  const handleUse = async (_index: number, item: Inventory) => {
    const itemId = String(item.id);
    setLoading({ itemId, type: "use" });

    try {
      const result = await itemsApi.useInventory(itemId);

      if (!result.ok) {
        setActive(null);
        window.alert(result.error ?? "Не удалось использовать предмет");
        return;
      }

      if (result.mode === "modal") {
        setModal(result.label);
        setActive(null);
        return;
      }

      setActive(null);
      await refreshInventoryCoalesced();
    } finally {
      setLoading({ itemId: null, type: null });
    }
  };

  const handleDelete = async (_index: number, inventoryId: string) => {
    setLoading({ itemId: inventoryId, type: "delete" });

    try {
      await itemsApi.removeInventory(inventoryId);
      setActive(null);
      await refreshInventoryCoalesced();
    } finally {
      setLoading({ itemId: null, type: null });
    }
  };

  const handleSend = async (
    _index: number,
    inventoryId: string,
    userId: string,
  ) => {
    setLoading({ itemId: inventoryId, type: "send" });

    try {
      await itemsApi.sendInventory(inventoryId, userId);
      setActive(null);
      await Promise.all([
        refreshInventoryCoalesced(),
        patchInventoryFor(userId),
      ]);
    } finally {
      setLoading({ itemId: null, type: null });
    }
  };

  const handleSell = async (
    _index: number,
    inventoryId: string,
    owner: string,
  ) => {
    if (!price) return;

    setLoading({ itemId: inventoryId, type: "sell" });

    try {
      await itemsApi.sellInventory(inventoryId, owner, Number(price));
      setActive(null);
      await refreshInventoryCoalesced();
      queryClient.invalidateQueries({
        queryKey: ["marketTab"],
        refetchType: "active",
      });
    } finally {
      setLoading({ itemId: null, type: null });
    }
  };

  const handleCharge = async (
    _index: number,
    inventoryId: string,
    oldCharge: number,
    newCharge: number,
  ) => {
    setLoading({ itemId: inventoryId, type: "send" });

    try {
      await itemsApi.chargeInventory(inventoryId, oldCharge, newCharge);
      await refreshInventoryCoalesced();
    } finally {
      setLoading({ itemId: null, type: null });
    }
  };

  return (
    <main className="p-2 flex flex-col w-full h-full gap-2">
      {user && modalItem?.Modal && modalConsume ? (
        <CreateModal
          label={modalItem.label}
          Modal={modalItem.Modal}
          user={user}
          consume={modalConsume}
          open={Boolean(modal && modalItem.Modal)}
          setOpen={(open) => {
            if (!open) setModal(null);
          }}
        />
      ) : null}

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
                  src={`${getFileUrl(status)}`}
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
                {isItemLoading(String(item.id), "use") && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                    <SmallLoader size={28} />
                  </div>
                )}
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
                        isItemLoading(String(item.id), "send")
                      }
                    />
                    <Button
                      disabled={
                        isItemLoading(String(item.id), "send") ||
                        !selectedUser
                      }
                      onClick={() => {
                        if (!selectedUser) return;

                        handleSend(index, String(item.id), selectedUser);
                      }}
                      className="my-1"
                      size="icon"
                    >
                      {isItemLoading(String(item.id), "send") ? (
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
                        isItemLoading(String(item.id), "sell") || !price
                      }
                    >
                      {isItemLoading(String(item.id), "sell") ? (
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
                      disabled={isItemLoading(String(item.id), "use")}
                    >
                      {isItemLoading(String(item.id), "use") ? (
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
                      disabled={isItemLoading(String(item.id), "delete")}
                    >
                      {isItemLoading(String(item.id), "delete") ? (
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
                className="relative flex flex-col min-w-64 min-h-64 w-64 h-64 overflow-hidden border-2 border-highlight-high shadow-sharp-sm bg-background hover:opacity-100 opacity-75 hover:cursor-pointer items-center p-2"
                onClick={() => {
                  if (loading.itemId) return;
                  setPrice("");
                  setActive(index);
                }}
              >
                {loading.itemId === String(item.id) && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
                    <SmallLoader size={28} />
                  </div>
                )}
                <span className="font-bold text-md line-clamp-1">
                  {highlightText(item.label, searchTerms)}
                </span>

                <div className="flex flex-col items-center justify-center">
                  <span className="w-full h-6 items-center justify-center my-1 bg-card text-primary font-bold border border-highlight-high text-center text-[14px]">
                    {translateItemType(item.type)}
                  </span>
                  <ImageComponent
                    src={`${getFileUrl(item)}`}
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
