import { useCallback, useMemo, useRef, useState } from "react";
import type { ItemLabel } from "@/types/items";
import type { ModalType } from "@/types/effect";
import ItemFramework from "@/lib/items/item.framework";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/index.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { Battery, Calendar, ChevronDown, Hash, NetworkIcon, Section } from "lucide-react";
import { Input } from "@/components/ui/input.component";
import { useUserStore } from "@/store/user.store";
import { Inventory, Item } from "@/types/items";
import ItemsApi from "@/api/items.api";
import UserApi from "@/api/user.api";

import { Button } from "@/components/ui/button.component";
import { User } from "@/types/user";
import { otherEffect } from "@/lib/items/other.items";
import { CreateModal } from "@/components/shared/items.modal";
import { itemEffect } from "@/lib/items/item.items";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover.component";
import { SortDirection, SortMethod, sortMethodLabels, compareItems } from "@/lib/sorting.utils";
import StatusInventory from "../components/inventory/status.inventory";
import ItemInventory from "../components/inventory/item.inventory";
import ActionInventory from "../components/inventory/action.inventory";

const itemsApi = new ItemsApi();
const userApi = new UserApi();

type InventoryTabData = {
  inventory: Inventory[];
  users: User[];
  statuses: Item[];
};

export type ItemLoadingType = "use" | "delete" | "sell" | "send";

function InventoryTab({ id }: { id?: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const currentId = id ? id : String(user?.id);

  const initialLoadRef = useRef(false);
  const inventoryRefreshRef = useRef<Promise<void> | null>(null);

  const [modal, setModal] = useState<string | null>(null);

  const [searchTerms, setSearchTerms] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [sortMethod, setSortMethod] = useState<SortMethod>("date");
  const [active, setActive] = useState<number | null>(null);
  const [price, setPrice] = useState<string>("");
  const [removeStatus, setRemoveStatus] = useState<boolean>(false);
  const [activeStatus, setActiveStatus] = useState<string>("");

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
        finalStatuses = await itemsApi.getItemsByLabels(allStatuses);
      }

      return {
        inventory: inventory,
        users: users.filter((item) => item.id !== currentId),
        statuses: finalStatuses,
      };
    },
    staleTime: 30_000,
  });

  const itemMutation = useMutation({
    mutationFn: async ({
      type,
      itemId,
      userId,
      owner,
      price: sellPrice,
      oldCharge,
      newCharge,
    }: {
      type: ItemLoadingType | "charge";
      itemId: string;
      userId?: string;
      owner?: string;
      price?: number;
      oldCharge?: number;
      newCharge?: number;
    }) => {
      if (type === "use") return await itemsApi.useInventory(itemId);
      if (type === "delete") await itemsApi.removeInventory(itemId);
      if (type === "send") await itemsApi.sendInventory(itemId, userId!);
      if (type === "sell") await itemsApi.sellInventory(itemId, owner!, sellPrice!);
      if (type === "charge") await itemsApi.chargeInventory(itemId, oldCharge!, newCharge!);
    },
    onSuccess: (_data, vars) => {
      setActive(null);

      switch (vars.type) {
        case "use": {
          const result = _data as {
            ok: boolean;
            mode?: string;
            label?: string;
            error?: string;
          };
          if (!result.ok) {
            window.alert(result.error ?? "Не удалось использовать предмет");
            return;
          }
          if (result.mode === "modal" && result.label) setModal(result.label);
          if (result.ok && result.mode !== "modal") refreshInventoryCoalesced();
          break;
        }
        case "delete":
          refreshInventoryCoalesced();
          break;
        case "send":
          Promise.all([refreshInventoryCoalesced(), patchInventoryFor(vars.userId!)]);
          break;
        case "sell":
          refreshInventoryCoalesced();
          queryClient.invalidateQueries({
            queryKey: ["marketTab"],
            refetchType: "active",
          });
          break;
        case "charge":
          refreshInventoryCoalesced();
          break;
      }
    },
  });

  const patchInventoryFor = useCallback(
    async (userId: string) => {
      const inventory = await itemsApi.getInventory(userId);
      const hadCache = queryClient.getQueryData(["inventoryTab", userId]) != null;

      queryClient.setQueryData<InventoryTabData>(["inventoryTab", userId], (prev) =>
        prev ? { ...prev, inventory } : prev,
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

    const finalStatuses: Item[] = allStatuses?.length
      ? await itemsApi.getItemsByLabels(allStatuses)
      : [];

    queryClient.setQueryData<InventoryTabData>(["inventoryTab", currentId], (prev) =>
      prev
        ? {
            ...prev,
            users: users.filter((item) => item.id !== currentId),
            statuses: finalStatuses,
          }
        : prev,
    );
  }, [queryClient, currentId]);

  const refreshInventoryCoalesced = useCallback(async () => {
    if (inventoryRefreshRef.current) return inventoryRefreshRef.current;

    inventoryRefreshRef.current = refreshInventory().finally(() => {
      inventoryRefreshRef.current = null;
    });

    return inventoryRefreshRef.current;
  }, [refreshInventory]);

  useSubscription("inventory", refreshInventoryCoalesced);
  useSubscription("users", refreshStatuses);

  const modalItem = useMemo(() => {
    if (!modal) return null;
    return [...otherEffect, ...itemEffect].find((e) => e.label === modal) ?? null;
  }, [modal]);

  const modalConsume = useMemo((): ModalType["consume"] | undefined => {
    if (!modal) return undefined;
    return new ItemFramework(modal as ItemLabel).consume;
  }, [modal]);

  const itemLoading = (itemId: string, type?: ItemLoadingType | "charge") =>
    itemMutation.isPending &&
    itemMutation.variables?.itemId === itemId &&
    (type === undefined || itemMutation.variables?.type === type);

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (currentId !== user?.id) throw new Error("Not authorized");
      await userApi.changeUserStatus(user?.id ?? "", status, "remove");
    },
    onSuccess: () => {
      setActiveStatus("");
      setRemoveStatus(false);
    },
  });
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

  const sortMethodIcons = {
    name: Hash,
    date: Calendar,
    charges: Battery,
    type: Section,
  };

  const SortMethodIcon = sortMethodIcons[sortMethod];

  return (
    <main className="p-2 flex flex-col w-full h-full gap-2">
      {user && modalItem?.Modal && modalConsume && (
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
      )}

      <section className="flex flex-row gap-1 items-center w-full">
        <Input
          autoFocus
          type="text"
          placeholder="Поиск пользователя"
          value={searchTerms}
          onChange={(e) => setSearchTerms(e.target.value)}
        />

        <HoverCard>
          <HoverCardTrigger delay={0}>
            <Button
              variant="default"
              size="icon"
              className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 flex gap-0 h-10 w-10 p-5"
            >
              <SortMethodIcon className="h-4 w-4" />
              <ChevronDown className="size-3" />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="z-10000 flex flex-col gap-1">
            {Object.entries(sortMethodLabels).map(([method, label]) => (
              <Button
                key={method}
                variant={sortMethod === method ? "default" : "link"}
                className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
                onClick={() => {
                  if (sortMethod === method) {
                    setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
                  } else {
                    setSortMethod(method as SortMethod);
                    setSortDirection("asc");
                  }
                }}
              >
                {label}
                {sortMethod === method && (
                  <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                )}
              </Button>
            ))}
          </HoverCardContent>
        </HoverCard>
      </section>

      {data?.statuses && data?.statuses.length > 0 && (
        <StatusInventory
          removeStatus={removeStatus}
          setRemoveStatus={setRemoveStatus}
          activeStatus={activeStatus}
          setActiveStatus={setActiveStatus}
          statusMutation={statusMutation}
          currentId={currentId}
          statuses={data.statuses}
        />
      )}

      <section className="flex flex-wrap justify-start gap-2 overflow-y-auto w-full pb-5">
        {data?.inventory
          .sort((a, b) => compareItems(a, b, sortMethod, sortDirection))
          .filter(
            (item) =>
              item.label.toUpperCase().includes(searchTerms.toUpperCase()) ||
              item.description.toUpperCase().includes(searchTerms.toUpperCase()),
          )
          .map((item, index) =>
            active === index ? (
              <ActionInventory
                key={item.id}
                item={item}
                itemMutation={itemMutation}
                itemLoading={itemLoading}
                price={price}
                setPrice={setPrice}
                setActive={setActive}
                users={data.users}
                currentId={currentId}
              />
            ) : (
              <ItemInventory
                key={item.id}
                item={item}
                searchTerms={searchTerms}
                itemMutation={itemMutation}
                itemLoading={itemLoading}
                currentId={currentId}
                index={index}
                setPrice={setPrice}
                setActive={setActive}
              />
            ),
          )}
      </section>
    </main>
  );
}

export default InventoryTab;
