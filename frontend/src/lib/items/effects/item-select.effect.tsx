import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.component";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.component";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover.component";
import { CircleX, CircleQuestionMark } from "lucide-react";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import ItemHelper from "@/components/shared/item.helper";
import { effectInterface, Inventory } from "@/types/items";
import type { ModalType } from "@/types/effect";
import ItemFramework from "../item.framework";
import { itemsApi } from "@/api/items.api";
import { userApi } from "@/api/user.api";
import { ratIds, pigIds, gremlinIds } from "../item.categories";

export const itemSelectEffects: effectInterface[] = [
  ItemFramework.modal(
    "Мышь",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const [items, users] = await Promise.all([
              itemsApi.getInventories({ excludeOwner: ctx.user.id }),
              userApi.getAllUsers(),
            ]);
            return { items, users };
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
                    const item = data?.items.find((i) => i.id === e);
                    if (item) setSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Предмет">{selected?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.items
                        .sort((a, b) => (a.owner ?? "").localeCompare(b.owner ?? ""))
                        .map((item, index) => (
                          <SelectItem key={item.id} value={item.id!}>
                            {`${index + 1}) ${data.users.find((u) => u.id === item.owner)?.username}: `}
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

                  await itemsApi.sellInventory(
                    String(selected.id),
                    ctx.user.id,
                    Math.floor(Math.random() * 8) + 1,
                  );

                  await ctx.consume(
                    `${ctx.user.username} заставил ${data?.users.find((u) => u.id === selected.owner)?.username} продать ${selected.label}`,
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
    "Шляпа",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const [inventory, users] = await Promise.all([
              itemsApi.getInventories({ excludeOwner: ctx.user.id }),
              userApi.getAllUsers(),
            ]);
            return { inventory, users };
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
              <div className="flex flex-row gap-1 w-full">
                <Select
                  value={selected?.id ?? ""}
                  onValueChange={(e) => {
                    if (!e) return;
                    const item = data?.inventory.find((i) => i.id === e);
                    if (item) setSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Предмет">{selected?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.inventory
                        ?.sort((a, b) => (a.owner ?? "").localeCompare(b.owner ?? ""))
                        .map((item, index) => (
                          <SelectItem key={item.id} value={item.id!}>
                            {`${index + 1}) ${data.users.find((u) => u.id === item.owner)?.username}: `}
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
                  await itemsApi.sendInventory(String(selected.id), String(ctx.user.id));
                  await ctx.consume(
                    `${ctx.user.username} украл ${selected.label} у ${data?.users.find((u) => u.id === selected.owner)?.username}`,
                  );
                  ctx.close();
                }}
                disabled={!selected}
              >
                Отправить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Крыса",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const [items, users] = await Promise.all([
              itemsApi.getInventories({ excludeOwner: ctx.user.id }),
              userApi.getAllUsers(),
            ]);
            return { items, users };
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
                    const item = data?.items.find((i) => i.id === e);
                    if (item) setSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Предмет">{selected?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.items
                        .sort((a, b) => (a.owner ?? "").localeCompare(b.owner ?? ""))
                        .map((item, index) => (
                          <SelectItem key={item.id} value={item.id!}>
                            {`${index + 1}) ${data.users.find((u) => u.id === item.owner)?.username}: `}
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

                  await itemsApi.sendInventory(String(selected.id), ctx.user.id);

                  await ctx.consume(
                    `${ctx.user.username} украл ${selected.label} у ${data?.users.find((u) => u.id === selected.owner)?.username}`,
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
    "3д крыса",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const [items, users] = await Promise.all([
              itemsApi.getInventories({ excludeOwner: ctx.user.id }),
              userApi.getAllUsers(),
            ]);
            return { items, users };
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
                    const item = data?.items.find((i) => i.id === e);
                    if (item) setSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Предмет">{selected?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.items
                        .sort((a, b) => (a.owner ?? "").localeCompare(b.owner ?? ""))
                        .map((item, index) => (
                          <SelectItem key={item.id} value={item.id!}>
                            {`${index + 1}) ${data.users.find((u) => u.id === item.owner)?.username}: `}
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

                  await itemsApi.sendInventory(String(selected.id), ctx.user.id);

                  await ctx.consume(
                    `${ctx.user.username} украл ${selected.label} у ${data?.users.find((u) => u.id === selected.owner)?.username}`,
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
    "Волшебный Крысиный Дождь",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi.getInventories();
            const allUsers = await userApi.getAllUsers();

            return {
              items: allItems
                .filter((i) => i.label !== "Волшебный Крысиный Дождь")
                .filter(
                  (i) => ratIds.has(i.label) || pigIds.has(i.label) || gremlinIds.has(i.label),
                ),
              users: allUsers,
            };
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

        if (!data || data.items.length === 0) return <main>Не нашлось предметов</main>;

        return (
          <main className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-bold">Предметы</span>
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
                      {data?.items
                        .sort((a, b) => (a.owner ?? "").localeCompare(b.owner ?? ""))
                        .map((item, index) => (
                          <SelectItem key={item.id} value={item.id!}>
                            {`${index + 1}) ${data.users.find((u) => u.id === item.owner)?.username}: `}
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

                  await itemsApi.sendInventory(String(selected.id), ctx.user.id);

                  await ctx.consume(
                    `${ctx.user.username} украл ${selected.label} у ${data.users.find((u) => u.id === selected.owner)?.username}`,
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
    "Восьмибитная Крыса",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi.getInventories();
            const allUsers = await userApi.getAllUsers();
            return {
              users: allUsers,
              items: allItems.filter((u) => u.id !== ctx.user.id),
            };
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
                    const item = data?.items.find((i) => i.id === e);
                    if (item) setSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Игрок">{selected?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.items
                        .filter((i) => i.label.replace(/\s/g, "").length <= 8)
                        .map((item, index) => (
                          <SelectItem key={item.id} value={item.id!}>
                            {`${index + 1}) ${data?.users.find((u) => u.id === item.owner)?.username}: `}
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

                  if (selected.label.replace(/\s/g, "").length > 8) return;

                  await itemsApi.sendInventory(String(selected.id), ctx.user.id);

                  await ctx.consume(`▓${ctx.user.username}▓▓ укр▓▓ал ${selected.label}▓`);

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
    "Карта Джокер",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi.getInventories();
            const allUsers = await userApi.getAllUsers();
            return {
              items: allItems.filter((i) => i.label.toUpperCase().includes("КАРТА")),
              users: allUsers,
            };
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
              <Select
                value={selected?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.items.find((i) => i.id === e);
                  if (item) setSelected(item);
                }}
              >
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Игрок">{selected?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data?.items
                      .sort((a, b) => (a.owner ?? "").localeCompare(b.owner ?? ""))
                      .map((item, index) => (
                        <SelectItem key={item.id} value={item.id!}>
                          {`${index + 1}) ${data.users.find((u) => u.id === item.owner)?.username}: `}
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
                  await ctx.consume(`${ctx.user.username} уничтожил ${selected.label}`);
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
    "Гремлин",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const [users, items] = await Promise.all([
              userApi.getAllUsers(),
              itemsApi.getInventories(),
            ]);

            return {
              items,
              users,
            };
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
                    const item = data?.items?.find((i) => i.id === e);
                    if (item) setSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Предмет">{selected?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.items
                        .sort((a, b) => (a.owner ?? "").localeCompare(b.owner ?? ""))
                        .map((item, index) => (
                          <SelectItem key={index} value={item.id}>
                            {`${index + 1}) ${data?.users.find((u) => u.id === item.owner)?.username}: `}
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

                  await userApi.scoreUser(String(ctx.user.id), -1);

                  await ctx.consume(
                    `${ctx.user.username} уничтожил ${data?.users.find((u) => u.id === selected.owner)?.username}: ${selected.label}`,
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


