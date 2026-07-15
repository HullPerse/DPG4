import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.component";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.component";
import { CircleX } from "lucide-react";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { effectInterface } from "@/types/items";
import type { ModalType } from "@/types/effect";
import { Game } from "@/types/games";
import { User } from "@/types/user";
import ItemFramework from "../item.framework";
import { itemsApi } from "@/api/items.api";
import { userApi } from "@/api/user.api";
import { gameApi } from "@/api/games.api";

export const userSelectEffects: effectInterface[] = [
  ItemFramework.modal(
    "Квакающая Крыса",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allUsers = await userApi.getAllUsers();

            return allUsers.filter((u) => u.id !== ctx.user.id);
          },
        });

        const [selected, setSelected] = useState<User | null>(null);

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
              <span className="font-bold">Игрок</span>
              <Select
                value={selected?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.find((i) => i.id === e);
                  if (item) setSelected(item);
                }}
              >
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Игрок">{selected?.username}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data?.map((item, index) => (
                      <SelectItem key={item.id} value={item.id!}>
                        {`${index + 1}: `}
                        {item.username}
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

                  const allItems = await itemsApi
                    .getInventory(ctx.user.id)
                    .then((res) => res.filter((i) => i.label !== "Квакающая крыса"));
                  const finalItem = allItems[Math.floor(Math.random() * allItems.length)];

                  if (!finalItem) return ctx.close();

                  await itemsApi.sendInventory(finalItem.id, selected.id);
                  await userApi.moveUser(ctx.user.id, ctx.user.position + 4);

                  await ctx.consume(
                    `${ctx.user.username} отдал ${finalItem.label} ${selected.username}`,
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
    "Кайджи",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            return userApi.getUsers({ excludeUserId: ctx.user.id });
          },
        });

        const [selected, setSelected] = useState<User | null>(null);

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
              <span className="font-bold">Игрок</span>
              <Select
                value={selected?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.find((i) => i.id === e);
                  if (item) setSelected(item);
                }}
              >
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Игрок">{selected?.username}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data?.map((item, index) => (
                      <SelectItem
                        key={item.id}
                        value={item.id!}
                        style={{
                          color: item.color,
                        }}
                      >
                        {`${index + 1}: `}
                        {item.username}
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

                  const usersArray = [ctx.user, selected];

                  const winner: User = usersArray[Math.floor(Math.random() * usersArray.length)];

                  await userApi.scoreUser(String(winner.id), 50);

                  await ctx.consume(
                    `${winner.username} выиграл ${usersArray.find((u) => u !== winner).username} и получил 50 чубриков`,
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
    "Подмена за кулисами",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            return userApi.getUsers({ excludeUserId: ctx.user.id });
          },
        });
        const [selected, setSelected] = useState<User | null>(null);

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
              <span className="font-bold">Игроки</span>
              <Select
                value={selected?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.find((i) => i.id === e);
                  if (item) setSelected(item);
                }}
              >
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Игрок">{selected?.username}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data?.map((item, index) => (
                      <SelectItem key={item.id} value={item.id!}>
                        {`${index + 1}: `}
                        {item.username}
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
                  const currentGame = await gameApi.getLastGame([
                    String(ctx.user.id),
                    String(selected.id),
                  ]);
                  const currentUser = currentGame.find((g) => g.user.id === ctx.user.id);
                  const targetUser = currentGame.find((g) => g.user.id === selected.id);
                  if (!currentUser || !targetUser) return;

                  await gameApi.changeStatus(
                    String(currentUser.id),
                    currentUser,
                    "REROLLED",
                    Number(currentUser.data.time ?? 0),
                    Number(currentUser.score ?? 0),
                  );
                  await gameApi.changeStatus(
                    String(targetUser.id),
                    targetUser,
                    "REROLLED",
                    Number(targetUser.data.time ?? 0),
                    Number(targetUser.score ?? 0),
                  );

                  await gameApi.addGame({
                    user: {
                      id: targetUser.user.id,
                      username: targetUser.user.username,
                    },
                    data: currentUser.data,
                    playtime: { hltb: currentUser.playtime.hltb ?? 0 },
                    status: "PLAYING",
                    created: new Date().toISOString(),
                  } as Game);
                  await gameApi.addGame({
                    user: {
                      id: currentUser.user.id,
                      username: currentUser.user.username,
                    },
                    data: targetUser.data,
                    playtime: { hltb: targetUser.playtime.hltb ?? 0 },
                    status: "PLAYING",
                    created: new Date().toISOString(),
                  } as Game);

                  await ctx.consume(
                    `${ctx.user.username} и ${selected.username} поменялись играми`,
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
    "Крысиный отец",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            return userApi.getUsers({ excludeUserId: ctx.user.id });
          },
        });

        const [selected, setSelected] = useState<User | null>(null);

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
              <span className="font-bold">Игроки</span>
              <Select
                value={selected?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.find((i) => i.id === e);
                  if (item) setSelected(item);
                }}
              >
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Игрок">{selected?.username}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data?.map((item, index) => (
                      <SelectItem key={item.id} value={item.id!}>
                        {`${index + 1}: `}
                        {item.username}
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

                  await userApi.changeUserStatus(String(selected.id), "Крысиный отец", "add");

                  await ctx.consume(
                    `${ctx.user.username} подкинул Крысиного отца ${selected.username}`,
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
    "Мечтательная крыса",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            return userApi.getUsers({ excludeUserId: ctx.user.id });
          },
        });

        const [selected, setSelected] = useState<User | null>(null);

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
              <span className="font-bold">Игроки</span>
              <Select
                value={selected?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.find((i) => i.id === e);
                  if (item) setSelected(item);
                }}
              >
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Игрок">{selected?.username}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data?.map((item, index) => (
                      <SelectItem key={item.id} value={item.id!}>
                        {`${index + 1}: `}
                        {item.username}
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

                  const allItems = await itemsApi.getInventory(String(selected.id));

                  if (!allItems) return;

                  const finalItem = allItems[Math.floor(Math.random() * allItems.length)];

                  if (!finalItem) return;

                  const ratId = await itemsApi
                    .getInventory(ctx.user.id)
                    .then((res) => res.find((i) => i.label === "Мечтательная крыса"));

                  if (!ratId) return;

                  await itemsApi.sendInventory(String(finalItem.id), ctx.user.id);
                  await itemsApi.sendInventory(String(ratId), finalItem.owner);

                  await ctx.consume(
                    `${ctx.user.username} подкинул Мечтательную крысу ${selected.username}, и украл ${finalItem.label}`,
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
    "Белорусская Крыса",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            return userApi.getUsers({
              excludeUserId: ctx.user.id,
              hasStatus: "Картошка",
            });
          },
        });

        const [selected, setSelected] = useState<User | null>(null);

        if (isLoading || isRefetching) return <WindowLoader />;
        if (isError)
          return (
            <WindowError
              error={new Error("Произошла ошибка при соединении с сервером")}
              icon={<CircleX className="size-28 animate-pulse text-red-500" />}
            />
          );

        if (!data || data.length === 0) return <main>Не нашлось картошки</main>;

        return (
          <main className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-bold">Игроки</span>
              <Select
                value={selected?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.find((i) => i.id === e);
                  if (item) setSelected(item);
                }}
              >
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Игрок">{selected?.username}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data?.map((item, index) => (
                      <SelectItem key={item.id} value={item.id!}>
                        {`${index + 1}: `}
                        {item.username}
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

                  await userApi.changeUserStatus(String(selected.id), "Картошка", "remove");

                  await ctx.consume(`${ctx.user.username} украл Картошку у ${selected.username}`);

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


