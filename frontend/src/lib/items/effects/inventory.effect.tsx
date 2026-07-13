import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.component";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.component";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover.component";
import { CircleX, CircleQuestionMark, RefreshCcw } from "lucide-react";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import ItemHelper from "@/components/shared/item.helper";
import { effectInterface, Inventory, Item } from "@/types/items";
import type { ModalType } from "@/types/effect";
import ItemFramework from "../item.framework";
import { itemsApi } from "@/api/items.api";
import { userApi } from "@/api/user.api";

export const inventoryEffects: effectInterface[] = [
  ItemFramework.modal(
    "Картонная упаковка",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi.getInventory(String(ctx.user.id));

            return allItems.filter((item) => item.label === "Салфетка" || item.label === "Ручка");
          },
        });

        const [itemOne, setItemOne] = useState<Inventory | null>(null);
        const [itemTwo, setItemTwo] = useState<Inventory | null>(null);

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
              <span className="font-bold">Салфетка</span>
              <Select
                value={itemOne?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.find((i) => i.id === e);
                  if (item) setItemOne(item);
                }}
              >
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Предмет">{itemOne?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data
                      ?.filter((i) => i.label === "Салфетка")
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
              <span className="font-bold">Ручка</span>
              <Select
                value={itemTwo?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.find((i) => i.id === e);
                  if (item) setItemTwo(item);
                }}
              >
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Предмет">{itemTwo?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data
                      ?.filter((i) => i.label === "Ручка")
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
                  if (!itemOne || !itemTwo) return;

                  await itemsApi.addInventory(String(ctx.user.id), "fbf923a7d2f84cb");

                  await ctx.consume(`${ctx.user.username} начал смотреть КАЙДЖИ`);
                  ctx.close();
                }}
                disabled={!itemOne || !itemTwo}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Алтарь жертвоприношения",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi.getInventory(String(ctx.user.id));
            return allItems.filter((item) => item.label !== "Алтарь жертвоприношения");
          },
        });
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
              <span className="font-bold">Инвентарь</span>
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
                    {data?.map((item, index) => (
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
                  if (!selected) return;
                  await itemsApi.removeInventory(String(selected.id));
                  await ctx.consume(
                    `${ctx.user.username} потерял ${selected.label} из-за Алтаря Жертвоприношения`,
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

  ItemFramework.modal(
    "Крысиный алтарь",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi.getInventory(ctx.user.id);
            return allItems.filter((i) => i.label !== "Крысиный алтарь");
          },
        });

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
              <span className="font-bold">Предметы</span>
              <div className="flex flex-row gap-1">
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
                      {data?.map((item, index) => (
                        <SelectItem key={item.id} value={item.id!}>
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

                  await itemsApi.removeInventory(String(selected.id));

                  const ratId = "dswpfvayiqxul1b";

                  await itemsApi.addInventory(String(ctx.user.id), ratId);

                  await ctx.consume(`${ctx.user.username} принес в жертву ${selected.label}`);

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

  ItemFramework.modal(
    "Крысталлизатор",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi.getInventory(ctx.user.id);
            return allItems;
          },
        });

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
              <span className="font-bold">Предметы</span>
              <div className="flex flex-row gap-1">
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
                      {data?.map((item, index) => (
                        <SelectItem key={item.id} value={item.id!}>
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

                  //remove item
                  await itemsApi.removeInventory(String(selected.id));
                  //add rat
                  await itemsApi.addInventory(ctx.user.id, "a29c7tdphmwlrbc");

                  await ctx.consume(`${ctx.user.username} превратил ${selected.label} в крысу`);

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

  ItemFramework.modal(
    "Скальпель",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi.getInventory(ctx.user.id);
            return allItems.filter((i) => i.label !== "Скальпель");
          },
        });

        const [fromSelected, setFromSelected] = useState<Inventory | null>(null);
        const [toSelected, setToSelected] = useState<Inventory | null>(null);

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
              <span className="font-bold">Убрать заряд</span>
              <div className="flex flex-row gap-1">
                <Select
                  value={fromSelected?.id ?? ""}
                  onValueChange={(e) => {
                    if (!e) return;
                    const item = data?.find((i) => i.id === e);
                    if (item) setFromSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Предмет">{fromSelected?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data
                        ?.filter((i) => i.charge > 1)
                        .map((item, index) => (
                          <SelectItem key={item.id} value={item.id!}>
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
                    <ItemHelper item={fromSelected} />
                  </HoverCardContent>
                </HoverCard>
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-bold">Добавить заряд</span>
              <div className="flex flex-row gap-1">
                <Select
                  value={toSelected?.id ?? ""}
                  onValueChange={(e) => {
                    if (!e) return;
                    const item = data?.find((i) => i.id === e);
                    if (item) setToSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Предмет">{toSelected?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.map((item, index) => (
                        <SelectItem key={item.id} value={item.id!}>
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
                    <ItemHelper item={toSelected} />
                  </HoverCardContent>
                </HoverCard>
              </div>
            </label>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!fromSelected || !toSelected) return;

                  if (fromSelected.charge <= 1) return;

                  await itemsApi.chargeInventory(String(fromSelected.id), fromSelected.charge, -1);
                  await itemsApi.chargeInventory(String(toSelected.id), toSelected.charge, 1);

                  await ctx.consume(
                    `${ctx.user.username} убрал заряд у ${fromSelected.label} и добавил к ${toSelected.label}`,
                  );

                  ctx.close();
                }}
                disabled={!fromSelected || !toSelected}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Гремлинизатор",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi.getInventories();

            return allItems
              .filter((i) => i.owner === ctx.user.id)
              .filter((i) => i.label !== "Гремлинизатор");
          },
        });

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
              <span className="font-bold">Предмет</span>
              <div className="flex flex-row gap-1">
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
                        ?.sort((a, b) => (a.owner ?? "").localeCompare(b.owner ?? ""))
                        .map((item, index) => (
                          <SelectItem key={index} value={item.id}>
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

                  await itemsApi.removeInventory(String(selected.id));
                  await itemsApi.addInventory(String(ctx.user.id), "evexf52un87e8ju");

                  await ctx.consume(`${ctx.user.username} превратил ${selected.label} в Гремлина`);

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

  ItemFramework.modal(
    "Хорадрический куб",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: () => itemsApi.getInventory(String(ctx.user.id)),
        });
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
              <div className="flex flex-row gap-1 w-full">
                <Select
                  value={selected?.[0]?.id ?? ""}
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
                    <SelectValue placeholder="Предмет">{selected?.[0]?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data
                        ?.filter((i) => i.id !== selected?.[1]?.id)
                        .map((item, index) => {
                          if (selected?.[1] && item.label !== selected?.[1]?.label) return;
                          return (
                            <SelectItem key={item.id} value={item.id!}>
                              {`${index + 1}: `}
                              {item.label}
                            </SelectItem>
                          );
                        })}
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
                    <ItemHelper item={selected?.[0] ?? null} />
                  </HoverCardContent>
                </HoverCard>
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-bold">№2</span>
              <div className="flex flex-row gap-1 w-full">
                <Select
                  value={selected?.[1]?.id ?? ""}
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
                    <SelectValue placeholder="Предмет">{selected?.[1]?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data
                        ?.filter((i) => i.id !== selected?.[0]?.id)
                        .map((item, index) => {
                          if (selected?.[0] && item.label !== selected?.[0]?.label) return;
                          return (
                            <SelectItem key={item.id} value={item.id!}>
                              {`${index + 1}: `}
                              {item.label}
                            </SelectItem>
                          );
                        })}
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
                    <ItemHelper item={selected?.[1] ?? null} />
                  </HoverCardContent>
                </HoverCard>
              </div>
            </label>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button size="icon" variant="error" onClick={() => setSelected([])}>
                <RefreshCcw />
              </Button>
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!selected || selected.length < 2) return;
                  await itemsApi.removeInventory(String(selected[0].id));
                  await itemsApi.removeInventory(String(selected[1].id));
                  await ctx.consume(`${ctx.user.username} удалил два ${selected[0].label}`);
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

  ItemFramework.modal(
    "Ведьмин котел",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allUsers = await userApi.getAllUsers();
            const allItems = await itemsApi.getItems({
              excludeLabel: "Ведьмин котел",
            });
            const allInventories = await itemsApi.getInventories();
            return {
              items: allItems,
              inventories: allInventories.filter((i) => i.label !== "Ведьмин котел"),
              users: allUsers,
            };
          },
        });
        const [selected, setSelected] = useState<Inventory[] | null>(null);
        const [finalItem, setFinalItem] = useState<Item | null>(null);

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
              <span className="font-bold">Желаемый предмет</span>
              <div className="flex flex-row gap-1">
                <Select
                  value={finalItem?.id ?? ""}
                  onValueChange={(e) => {
                    if (!e) return;
                    const item = data?.items.find((i) => i.id === e);
                    if (item) setFinalItem(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Предмет">{finalItem?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.items.map((item, index) => (
                        <SelectItem key={item.id} value={item.id!}>
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
                    <ItemHelper item={finalItem} />
                  </HoverCardContent>
                </HoverCard>
              </div>
            </label>
            {Array.from({ length: 3 }).map((_, index) => (
              <label key={index} className="flex flex-col gap-1">
                <span className="font-bold">Предметы в котел</span>
                <div className="flex flex-row gap-1">
                  <Select
                    value={selected?.[index]?.id ?? ""}
                    onValueChange={(e) => {
                      if (!e) return;
                      const item = data?.inventories.find((i) => i.id === e);
                      if (item)
                        setSelected((prev) => {
                          const next = [...(prev ?? [])];
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
                        {data?.inventories.map((item) => {
                          if (selected?.includes(item)) return;
                          if (selected?.some((i) => i.owner === item.owner)) return;
                          return (
                            <SelectItem key={item.id} value={item.id}>
                              {`${index + 1}) ${data.users.find((u) => u.id === item.owner)?.username}: `}
                              {item.label}
                            </SelectItem>
                          );
                        })}
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
                  if (!selected || selected.length < 3 || !finalItem) return;
                  for (const item of selected) {
                    await itemsApi.removeInventory(String(item.id));
                  }
                  await itemsApi.addInventory(String(ctx.user.id), String(finalItem.id));
                  await ctx.consume(
                    `${ctx.user.username} уничтожил ${selected.map((i) => i.label).join(", ")} и получил ${finalItem.label}`,
                  );
                  ctx.close();
                }}
                disabled={!selected || selected?.length < 3 || !finalItem}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Радиоактивная Крыса",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading } = useQuery({
          queryKey: ["modalData", ctx.user.id, "radioactive"],
          queryFn: async () => {
            const inv = await itemsApi.getInventory(ctx.user.id);
            return inv.filter((i) => i.label !== "Радиоактивная Крыса");
          },
        });

        const [selected, setSelected] = useState<Inventory[]>([]);
        const [mutated, setMutated] = useState<{ old: string; new: string }[] | null>(null);
        const [applying, setApplying] = useState(false);

        if (isLoading) return <WindowLoader />;

        const toggleItem = (item: Inventory) => {
          setSelected((prev) =>
            prev.find((i) => i.id === item.id)
              ? prev.filter((i) => i.id !== item.id)
              : prev.length < 2
                ? [...prev, item]
                : prev,
          );
        };

        const mutate = async () => {
          if (selected.length !== 2) return;
          setApplying(true);
          const allItems = await itemsApi.getAllItems();
          const results: { old: string; new: string }[] = [];

          for (const item of selected) {
            const pool = allItems.filter((i) => i.label !== item.label);
            const replacement = pool[Math.floor(Math.random() * pool.length)];
            await itemsApi.removeInventory(item.id);
            if (replacement) {
              await itemsApi.addInventory(String(ctx.user.id), String(replacement.id));
              results.push({ old: item.label, new: replacement.label });
            }
          }

          setMutated(results);
          setApplying(false);
        };

        const confirm = async () => {
          await ctx.consume(
            `${ctx.user.username} подставил ${mutated?.map((m) => m.old).join(" и ")} под радиацию → получил ${mutated?.map((m) => m.new).join(" и ")}`,
          );
          ctx.close();
        };

        if (mutated) {
          return (
            <main className="flex flex-col gap-2 p-2">
              <span className="text-lg font-bold text-center text-green-400">⚡ РАДИАЦИЯ ⚡</span>
              {mutated.map((m, i) => (
                <div
                  key={i}
                  className="flex flex-row items-center justify-between border border-highlight-medium rounded p-2"
                >
                  <span className="line-through text-text/60">{m.old}</span>
                  <span className="text-green-400">→</span>
                  <span className="font-bold text-green-400">{m.new}</span>
                </div>
              ))}
              <Button variant="success" onClick={confirm}>
                Забрать мутантов
              </Button>
            </main>
          );
        }

        return (
          <main className="flex flex-col gap-2 p-2">
            <span className="text-sm text-text/60">Выберите 2 предмета для мутации</span>
            <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
              {data?.map((item) => {
                const isSelected = selected.some((s) => s.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`flex items-center gap-2 rounded border px-2 py-1 text-left text-sm ${
                      isSelected
                        ? "border-green-500 bg-green-500/10"
                        : "border-highlight-medium hover:bg-highlight-low"
                    }`}
                  >
                    <span
                      className={`size-3 rounded-full ${isSelected ? "bg-green-500" : "bg-highlight-medium"}`}
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
            {selected.length === 2 && (
              <Button variant="success" onClick={mutate} loading={applying}>
                Мутировать
              </Button>
            )}
          </main>
        );
      },
  ),
];


