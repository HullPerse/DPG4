import ItemFramework from "./item.framework";
import ItemsApi from "@/api/items.api";
import UserApi from "@/api/user.api";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.component";
import { CircleX } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { image } from "@/api/client.api";
import { effectInterface, Inventory } from "@/types/items";

const itemsApi = new ItemsApi();
const userApi = new UserApi();

export const otherEffect: effectInterface[] = [
  //EFFECTS

  ItemFramework.effect("Таинственный предмет", async (ctx) => {
    await userApi.changeUserStatus(
      String(ctx.user.id),
      "Таинственный предмет",
      "add",
    );
    await ctx.consume(`${ctx.user.username} нашел легендарный предмет`);
  }),

  ItemFramework.effect("Светлое нефильтрованное", async (ctx) => {
    await userApi.scoreUser(String(ctx.user.id), 20);
    await ctx.consume(`${ctx.user.username} выпил пивка`);
  }),

  //MODALS

  ItemFramework.modal("Дырявый сапог", (ctx) => {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
      queryKey: ["modalData"],
      queryFn: async () => {
        const allItems = await itemsApi.getInventory(String(ctx.user.id));
        return allItems.filter((item) => item.label === "Дырявый сапог");
      },
    });
    useEffect(() => {
      refetch();
    }, []);
    const [selected, setSelected] = useState<Inventory[]>([]);

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
        <label className="flex flex-col gap-1">
          <span className="font-bold">№1</span>
          <Select
            value={selected[0]?.id ?? ""}
            onValueChange={(e) => {
              if (!e) return;
              const item = data?.find((i) => i.id === e);
              if (item)
                setSelected((prev) => {
                  const next = [...prev];
                  next[0] = item;
                  return next;
                });
            }}
          >
            <SelectTrigger className="w-full py-5">
              <SelectValue placeholder="Предмет">
                {selected[0]?.label}
              </SelectValue>
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
              if (item)
                setSelected((prev) => {
                  const next = [...prev];
                  next[1] = item;
                  return next;
                });
            }}
          >
            <SelectTrigger className="w-full py-5">
              <SelectValue placeholder="Предмет">
                {selected[1]?.label}
              </SelectValue>
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
        <section className="flex flex-row items-center justify-between gap-2 p-1">
          <Button
            className="flex flex-1"
            variant="success"
            onClick={async () => {
              if (!data || selected.length !== 2) return;
              const itemId = "2hn5xus3bg0i6mg";
              await itemsApi.addInventory(
                String(ctx.user.id),
                itemId,
                `${image.items}${itemId}/100x100_214_wmbb9r0tf3_1b0q85hrha.png`,
                "item",
              );
              for (const item of selected) {
                await itemsApi.chargeInventory(
                  String(item.id),
                  item.charge,
                  -1,
                );
              }
              ctx.close();
            }}
            disabled={selected.length !== 2}
          >
            Объединить
          </Button>
        </section>
      </main>
    );
  }),

  ItemFramework.modal("Пустой пакет", (ctx) => {
    const { data, isLoading, isError, refetch, isRefetching } = useQuery({
      queryKey: ["modalData"],
      queryFn: async () => {
        const allItems = await itemsApi.getInventory(String(ctx.user.id));
        return allItems.filter(
          (item) =>
            item.label === "Конфетка" ||
            item.label === "Лимонная конфетка" ||
            item.label === "Пустой пакет",
        );
      },
    });
    useEffect(() => {
      refetch();
    }, []);
    const [selected, setSelected] = useState<Inventory | null>(null);

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
        <label className="flex flex-col gap-1">
          <span className="font-bold">Конфетка</span>
          <Select
            value={selected?.id ?? ""}
            onValueChange={(e) => {
              if (!e) return;
              const item = data?.find((i) => i.id === e);
              if (item) setSelected(item);
            }}
          >
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
        <section className="flex flex-row items-center justify-between gap-2 p-1">
          <Button
            className="flex flex-1"
            variant="success"
            onClick={async () => {
              if (!data || !selected) return;
              const itemId =
                selected.label === "Конфетка"
                  ? "w8ajf5mhh121nb0"
                  : "olvbzslxz9xbtr9";
              const itemImage =
                selected.label === "Конфетка"
                  ? "100x100_product_preview_my02369_1_k10elro9to_412wxiqd89.png"
                  : "2okrjiphui9_e2wfst86n4.png";
              await itemsApi.addInventory(
                String(ctx.user.id),
                itemId,
                `${image.items}${itemId}/${itemImage}`,
                "item",
              );
              await itemsApi.chargeInventory(
                String(selected.id),
                selected.charge,
                -1,
              );
              const bagItem = data.find(
                (item) => item.label === "Пустой пакет",
              );
              if (bagItem)
                await itemsApi.chargeInventory(
                  String(bagItem.id),
                  bagItem.charge,
                  -1,
                );
              ctx.close();
            }}
            disabled={!selected}
          >
            Объединить
          </Button>
        </section>
      </main>
    );
  }),
];
