import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.component";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.component";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover.component";
import { CircleX, CircleQuestionMark } from "lucide-react";
import { openWindow, translateItemType } from "../../index.utils";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import ItemHelper from "@/components/shared/item.helper";
import { getFileUrl } from "@/api/client.api";
import WheelComponent from "@/components/shared/wheel.component";
import ImageComponent from "@/components/shared/image.component";
import { effectInterface, Inventory, Item } from "@/types/items";
import type { ModalType } from "@/types/effect";
import { WheelItem } from "@/types/wheel";
import ItemFramework from "../item.framework";
import { itemsApi } from "@/api/items.api";
import { userApi } from "@/api/user.api";
import { ratIds } from "../item.categories";

export const wheelEffects: effectInterface[] = [
  ItemFramework.modal(
    "Платная педалька",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: () => itemsApi.getItems(),
        });
        const [result, setResult] = useState<Item | null>(null);
        const [selected, setSelected] = useState<Item[]>([]);

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
            <section className="flex flex-col gap-2 p-2 items-center justify-center w-140">
              <WheelComponent
                key={selected?.join(",")}
                list={
                  selected.length === 5
                    ? (selected.map((item) => ({
                        id: String(item.id),
                        label: item.label,
                        image: getFileUrl(item)!,
                        type: "image",
                      })) as WheelItem[])
                    : []
                }
                onResult={(it) => setResult(data?.find((item) => item.id === it?.id) as Item)}
              />
              {result && (
                <section
                  key={result.id}
                  className="relative p-2 flex flex-row max-w-full min-h-fit h-22 border-2 border-highlight-high items-center"
                >
                  <div className="flex flex-col gap-1">
                    <span className="w-20 h-6 bg-card text-primary font-bold border border-highlight-high text-center text-[14px]">
                      {translateItemType(result.type)}
                    </span>
                    <ImageComponent
                      src={getFileUrl(result)!}
                      alt={result.label}
                      className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background hover:cursor-pointer"
                      onClick={() =>
                        openWindow(String(result.id), getFileUrl(result)!, "Изображение")
                      }
                    />
                  </div>
                  <div className="flex flex-col ml-2">
                    <span className="font-bold text-xl">{result.label}</span>
                    <span className="text-text/80">{result.description}</span>
                  </div>
                </section>
              )}
            </section>
            {Array.from({ length: 5 }).map((_, index) => (
              <label key={index} className="flex flex-col gap-1">
                <span className="font-bold">{index + 1}</span>
                <div className="flex flex-row gap-1 w-full">
                  <Select
                    value={selected?.[index]?.id ?? ""}
                    onValueChange={(e) => {
                      if (!e) return;
                      const item = data?.find((i) => i.id === e);
                      if (item)
                        setSelected((prev) => {
                          const next = [...prev];
                          next[index] = item;
                          return next;
                        });
                    }}
                  >
                    <SelectTrigger className="w-full py-5">
                      <SelectValue placeholder="Предмет">{selected?.[index]?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {data?.map((item, selectIndex) => (
                          <SelectItem key={item.id} value={item.id!}>
                            {`${selectIndex + 1}: `}
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <HoverCard>
                    <HoverCardTrigger delay={0} className="z-1000">
                      <Button
                        variant="default"
                        size="icon"
                        className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 flex gap-0 h-10 w-10 p-5"
                      >
                        <CircleQuestionMark />
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      className="z-9999 flex flex-col gap-1 shadow-sharp-sm border-2 border-highlight-high h-42 max-h-42 mi-h-42 w-md"
                      side="top"
                    >
                      <ItemHelper item={selected?.[index] ?? null} />
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </label>
            ))}
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!result) return;
                  await itemsApi.addInventory(String(ctx.user.id), String(result.id));
                  await ctx.consume(`${ctx.user.username} случайно выбил ${result.label}`);
                  ctx.close();
                }}
                disabled={!result}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Крысиный лутбокс",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi
              .getAllItems()
              .then((res) => res.filter((i) => ratIds.has(i.label)));

            return allItems;
          },
        });

        const [result, setResult] = useState<Item | null>(null);

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
            <section className="flex flex-col gap-2 p-2 items-center justify-center w-140">
              <WheelComponent
                key={data?.join(",")}
                list={
                  data?.map((item) => ({
                    id: String(item.id),
                    label: item.label,
                    image: getFileUrl(item)!,
                    type: "image",
                  })) as WheelItem[]
                }
                onResult={(it) => setResult(data?.find((item) => item.id === it?.id) as Item)}
              />
              {result && (
                <section
                  key={result.id}
                  className="relative p-2 flex flex-row max-w-full min-h-fit h-22 border-2 border-highlight-high items-center"
                >
                  <div className="flex flex-col gap-1">
                    <span className="w-20 h-6 bg-card text-primary font-bold border border-highlight-high text-center text-[14px]">
                      {translateItemType(result.type)}
                    </span>
                    <ImageComponent
                      src={getFileUrl(result)!}
                      alt={result.label}
                      className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background hover:cursor-pointer"
                      onClick={() =>
                        openWindow(String(result.id), getFileUrl(result)!, "Изображение")
                      }
                    />
                  </div>
                  <div className="flex flex-col ml-2">
                    <span className="font-bold text-xl">{result.label}</span>
                    <span className="text-text/80">{result.description}</span>
                  </div>
                </section>
              )}
            </section>

            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!result) return;

                  await itemsApi.addInventory(String(ctx.user.id), String(result.id));

                  await ctx.consume(`${ctx.user.username} выбил ${result.label}`);
                  ctx.close();
                }}
                disabled={!result}
              >
                Добавить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "СпецСвин",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi
              .getInventory(ctx.user.id)
              .then((res) => res.filter((i) => i.type === "roll"));
            const allRolls = await itemsApi
              .getAllItems()
              .then((res) => res.filter((i) => i.type === "roll"));

            return {
              items: allItems,
              rolls: allRolls,
            };
          },
        });

        const [selected, setSelected] = useState<Inventory | null>(null);
        const [result, setResult] = useState<Item | null>(null);

        if (isLoading || isRefetching) return <WindowLoader />;
        if (isError)
          return (
            <WindowError
              error={new Error("Произошла ошибка при соединении с сервером")}
              icon={<CircleX className="size-28 animate-pulse text-red-500" />}
            />
          );

        if (!data || !data.items || data.items.length === 0)
          return (
            <main className="flex flex-col gap-2">
              <section className="flex flex-col gap-2 p-2 items-center justify-center w-140">
                <WheelComponent
                  key={data?.rolls.join(",")}
                  list={
                    data?.rolls.map((item) => ({
                      id: String(item.id),
                      label: item.label,
                      image: getFileUrl(item)!,
                      type: "image",
                    })) as WheelItem[]
                  }
                  onResult={(it) =>
                    setResult(data?.rolls.find((item) => item.id === it?.id) as Item)
                  }
                />
                {result && (
                  <section
                    key={result.id}
                    className="relative p-2 flex flex-row max-w-full min-h-fit h-22 border-2 border-highlight-high items-center"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="w-20 h-6 bg-card text-primary font-bold border border-highlight-high text-center text-[14px]">
                        {translateItemType(result.type)}
                      </span>
                      <ImageComponent
                        src={getFileUrl(result)!}
                        alt={result.label}
                        className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background hover:cursor-pointer"
                        onClick={() =>
                          openWindow(String(result.id), getFileUrl(result)!, "Изображение")
                        }
                      />
                    </div>
                    <div className="flex flex-col ml-2">
                      <span className="font-bold text-xl">{result.label}</span>
                      <span className="text-text/80">{result.description}</span>
                    </div>
                  </section>
                )}
              </section>

              <section className="flex flex-row items-center justify-between gap-2 p-1">
                <Button
                  className="flex flex-1"
                  variant="success"
                  onClick={async () => {
                    if (!result) return;

                    const allUsers = await userApi
                      .getAllUsers()
                      .then((res) => res.filter((u) => u.id !== ctx.user.id));
                    const finalUser = allUsers[Math.floor(Math.random() * allUsers.length)];

                    if (!finalUser) return;

                    await itemsApi.addInventory(String(finalUser.id), String(result.id));

                    await ctx.consume(
                      `${ctx.user.username} передал ${result.label} ${finalUser.username}`,
                    );

                    ctx.close();
                  }}
                  disabled={!result}
                >
                  Применить
                </Button>
              </section>
            </main>
          );

        return (
          <main className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-bold">Предмет</span>
              <div className="flex flex-row gap-1">
                <Select
                  value={selected?.id ?? ""}
                  onValueChange={(e) => {
                    if (!e) return;
                    const item = data?.items.find((i) => i.id === e);
                    if (item) setSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Предмет">{selected?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.items.map((item, index) => (
                        <SelectItem key={item.id} value={item}>
                          {`${index + 1}: `}
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <HoverCard>
                  <HoverCardTrigger delay={0} className="z-1000">
                    <Button
                      variant="default"
                      size="icon"
                      className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 flex gap-0 h-10 w-10 p-5"
                    >
                      <CircleQuestionMark />
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent
                    className="z-9999 flex flex-col gap-1 shadow-sharp-sm border-2 border-highlight-high h-42 max-h-42 mi-h-42 w-md"
                    side="top"
                  >
                    <ItemHelper item={selected} />
                  </HoverCardContent>
                </HoverCard>
              </div>
            </label>

            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!selected) return;

                  const allUsers = await userApi
                    .getAllUsers()
                    .then((res) => res.filter((u) => u.id !== ctx.user.id));
                  const finalUser = allUsers[Math.floor(Math.random() * allUsers.length)];

                  if (!finalUser) return;

                  await itemsApi.sendInventory(String(selected.id), String(finalUser.id));

                  await ctx.consume(
                    `${ctx.user.username} передал ${selected.label} ${finalUser.username}`,
                  );

                  ctx.close();
                }}
                disabled={!selected}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),
];


