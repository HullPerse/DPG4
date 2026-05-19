import { Button } from "@/components/ui/button.component";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useUserStore } from "@/store/user.store";
import { image } from "@/api/client.api";
import { effectInterface, Inventory } from "@/types/items";
import { WindowLoader } from "@/components/shared/loader.component";
import { Activity } from "@/types/activity";
import { CircleX } from "lucide-react";
import { WindowError } from "@/components/shared/error.component";

import ItemsApi from "@/api/items.api";
import ActivityApi from "@/api/activity.api";
import UserApi from "@/api/user.api";

const itemsApi = new ItemsApi();
const activityApi = new ActivityApi();
const userApi = new UserApi();

export const otherEffect: effectInterface[] = [
  {
    label: "Дырявый сапог",
    type: "modal",
    body: (close) => {
      const user = useUserStore((state) => state.user);

      const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: ["modalData"],
        queryFn: async () => {
          const allItems = await itemsApi.getInventory(String(user?.id));
          return allItems.filter((item) => item.label === "Дырявый сапог");
        },
        enabled: !!user,
      });

      useEffect(() => {
        refetch();
      }, []);

      const [selected, setSelected] = useState<Inventory[]>([]);

      const handleApply = async () => {
        if (!data || selected.length !== 2) return;

        const itemId = "2hn5xus3bg0i6mg";

        //Добавить сундук
        await itemsApi.addInventory(
          String(user?.id),
          itemId,
          `${image.items}${itemId}/100x100_214_wmbb9r0tf3_1b0q85hrha.png`,
          "item",
        );

        //Удалить оба сапога
        for (const item of selected) {
          await itemsApi.chargeInventory(String(item.id), item.charge, -1);
        }

        const activityData = {
          author: user?.id,
          image: user?.avatar,
          text: `${user?.username} объединил два дырявых сапога и получил Крысиный сундук`,
        } as Activity;

        await activityApi.createActivity(activityData);

        return close();
      };

      if (isLoading || isRefetching) return <WindowLoader />;
      if (isError)
        return (
          <WindowError
            error={new Error("Произошла ошибка при соединении с сервером")}
            icon={<CircleX className="size-28 animate-pulse text-red-500" />}
          />
        );

      return (
        <main className="flex flex-col gap-2">
          {/* Input */}
          <label className="flex flex-col gap-1">
            <span className="font-bold">№1</span>
            <Select
              value={selected[0]?.id ?? ""}
              onValueChange={(e) => {
                if (!e) return;
                const item = data?.find((i) => i.id === e);
                if (item) {
                  setSelected((prev) => {
                    const next = [...prev];
                    next[0] = item;
                    return next;
                  });
                }
              }}>
              <SelectTrigger className="w-full py-5">
                <SelectValue placeholder="Предмет">{selected[0]?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {data
                    ?.filter((item) => !selected.some((s) => s.id === item.id))
                    .map((item, index) => (
                      <SelectItem key={item.id} value={item.id!}>
                        {`${index + 1}: `}
                        {item.label}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-bold">№2</span>
            <Select
              value={selected[1]?.id ?? ""}
              onValueChange={(e) => {
                if (!e) return;
                const item = data?.find((i) => i.id === e);
                if (item) {
                  setSelected((prev) => {
                    const next = [...prev];
                    next[1] = item;
                    return next;
                  });
                }
              }}>
              <SelectTrigger className="w-full py-5">
                <SelectValue placeholder="Предмет">{selected[1]?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {data
                    ?.filter((item) => !selected.some((s) => s.id === item.id))
                    .map((item, index) => (
                      <SelectItem key={item.id} value={item.id!}>
                        {`${index + 1}: `} {item.label}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          {/* Buttons */}
          <section className="flex flex-row items-center justify-between gap-2 p-1">
            <Button
              className="flex flex-1"
              variant="success"
              onClick={handleApply}
              disabled={selected.length !== 2}>
              Объединить
            </Button>
          </section>
        </main>
      );
    },
  },
  {
    label: "Пустой пакет",
    type: "modal",
    body: (close) => {
      const user = useUserStore((state) => state.user);

      const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: ["modalData"],
        queryFn: async () => {
          const allItems = await itemsApi.getInventory(String(user?.id));
          return allItems.filter(
            (item) =>
              item.label === "Конфетка" ||
              item.label === "Лимонная конфетка" ||
              item.label === "Пустой пакет",
          );
        },
        enabled: !!user,
      });

      useEffect(() => {
        refetch();
      }, []);

      const [selected, setSelected] = useState<Inventory | null>(null);

      const handleApply = async () => {
        if (!data || !selected) return;

        const itemId = selected.label === "Конфетка" ? "w8ajf5mhh121nb0" : "olvbzslxz9xbtr9";
        const itemImage =
          selected.label === "Конфетка"
            ? "100x100_product_preview_my02369_1_k10elro9to_412wxiqd89.png"
            : "2okrjiphui9_e2wfst86n4.png";

        //Добавить пакет с конфетами
        await itemsApi.addInventory(
          String(user?.id),
          itemId,
          `${image.items}${itemId}/${itemImage}`,
          "item",
        );

        //Удалить оба предмета
        await itemsApi.chargeInventory(String(selected.id), selected.charge, -1);
        await itemsApi.chargeInventory(
          String(data.find((item) => item.label === "Пустой пакет")?.id),
          Number(data.find((item) => item.label === "Пустой пакет")?.charge),
          -1,
        );

        const activityData = {
          author: user?.id,
          image: user?.avatar,
          text: `${user?.username} закинул все свои конфеты в пакет`,
        } as Activity;

        await activityApi.createActivity(activityData);

        return close();
      };

      if (isLoading || isRefetching) return <WindowLoader />;
      if (isError)
        return (
          <WindowError
            error={new Error("Произошла ошибка при соединении с сервером")}
            icon={<CircleX className="size-28 animate-pulse text-red-500" />}
          />
        );

      return (
        <main className="flex flex-col gap-2">
          {/* Input */}
          <label className="flex flex-col gap-1">
            <span className="font-bold">Конфетка</span>
            <Select
              value={selected?.id ?? ""}
              onValueChange={(e) => {
                if (!e) return;
                const item = data?.find((i) => i.id === e);
                if (item) {
                  setSelected(item);
                }
              }}>
              <SelectTrigger className="w-full py-5">
                <SelectValue placeholder="Предмет">{selected?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {data
                    ?.filter((item) => item.label !== "Пустой пакет")
                    .map((item, index) => (
                      <SelectItem key={item.id} value={item.id!}>
                        {`${index + 1}: `}
                        {item.label}
                      </SelectItem>
                    ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>

          {/* Buttons */}
          <section className="flex flex-row items-center justify-between gap-2 p-1">
            <Button
              className="flex flex-1"
              variant="success"
              onClick={handleApply}
              disabled={!selected}>
              Объединить
            </Button>
          </section>
        </main>
      );
    },
  },
  {
    label: "Таинственный предмет",
    type: "effect",
    effect: async () => {
      const user = useUserStore.getState().user;

      if (!user) return;

      const currentItem = await itemsApi
        .getInventory(String(user.id))
        .then((res) => res.find((item) => item.label === "Таинственный предмет"));

      if (!currentItem) return;

      await userApi.changeUserStatus(String(user.id), "Таинственный предмет", "add");

      await itemsApi.chargeInventory(String(currentItem.id), currentItem.charge, -1);

      const activityData = {
        author: user?.id,
        image: user?.avatar,
        text: `${user?.username} нашел легендарный предмет`,
      } as Activity;

      return await activityApi.createActivity(activityData);
    },
  },
  {
    label: "Светлое нефильтрованное",
    type: "effect",
    effect: async () => {
      const user = useUserStore.getState().user;

      if (!user) return;

      const currentItem = await itemsApi
        .getInventory(String(user.id))
        .then((res) => res.find((item) => item.label === "Светлое нефильтрованное"));

      if (!currentItem) return;

      await userApi.scoreUser(String(user.id), 20);

      await itemsApi.chargeInventory(String(currentItem.id), currentItem.charge, -1);

      const activityData = {
        author: user?.id,
        image: user?.avatar,
        text: `${user?.username} выпил пивка`,
      } as Activity;

      return await activityApi.createActivity(activityData);
    },
  },
];
