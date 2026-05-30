import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import {
  CircleX,
  CircleQuestionMark,
  MousePointerClick,
  RefreshCcw,
  Plus,
  Minus,
} from "lucide-react";
import { openWindow, translateItemType } from "../utils";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover.component";
import ItemHelper from "@/components/shared/item.helper";
import { getFileUrl } from "@/api/client.api";
import WheelComponent from "@/components/shared/wheel.component";
import ImageComponent from "@/components/shared/image.component";
import { effectInterface, Inventory, Item } from "@/types/items";
import type { ModalType } from "@/types/effect";
import { Game } from "@/types/games";
import { WheelItem } from "@/types/wheel";
import { User } from "@/types/user";

import ItemFramework from "./item.framework";
import ItemsApi from "@/api/items.api";
import UserApi from "@/api/user.api";
import GameApi from "@/api/games.api";
import { Switch } from "@/components/ui/switch.component";

const userApi = new UserApi();
const gameApi = new GameApi();
const itemsApi = new ItemsApi();

const ratIds: string[] = [
  "Восьмибитная Крыса",
  "Добрая крыса",
  "Запаянный Крысиный Сундук",
  "Крыса",
  "Крыса Изгой",
  "Крыса гой",
  "Крыса наркоманка",
  "Крысиное колесо",
  "Крысиный алтарь",
  "Крысиный отец",
  "Крысиный тапок",
  "Крысталлизатор",
  "Мечтательная крыса",
  "Крысиный лутбокс",
  "Крысавчик",
  "Крысубль",
  "Крысиная грамота",
  "Крысиная раздача",
  "Кредитка КрысПоинтБанка",
  "Зелье Крысогеддона",
  "Волшебный Крысиный Дождь",
  "Белорусская Крыса",
  "Крысенштекс",
  "Помойная Крыса",
  "Крысинариум",
  "Проклятие Крысиного Короля",
  "Благословление Крысиного Короля",
  "Крысиная шкатулка",
];

const pigIds = [
  "Подброшенная свинья",
  "Хрюкающая свинья",
  "Ебануто живучая свинья",
  "Свин или не свин?",
  "Свинарник",
  "Страшная свиная история",
  "Свинья",
  "Свинопитек",
  "Свиная шляпа",
  "СпецСвин",
  "Свинство",
  "Свинский Сектор Приз",
];

const gremlinIds = ["Гремлин", "Гремлинизатор", "Гремлинская залупа"];

export const itemEffect: effectInterface[] = [
  //EFFECTS
  // Server effects via POST /inventory/:id/use
  //
  ItemFramework.modal(
    "Картонная упаковка",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getInventory(String(ctx.user.id));

            return allItems.filter(
              (item) => item.label === "Салфетка" || item.label === "Ручка",
            );
          },
        });

        useEffect(() => {
          refetch();
        }, []);

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
                  <SelectValue placeholder="Предмет">
                    {itemOne?.label}
                  </SelectValue>
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
                  <SelectValue placeholder="Предмет">
                    {itemTwo?.label}
                  </SelectValue>
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

                  await itemsApi.addInventory(
                    String(ctx.user.id),
                    "fbf923a7d2f84cb",
                  );

                  await ctx.consume(
                    `${ctx.user.username} начал смотреть КАЙДЖИ`,
                  );
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
    "Кайджи",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allUsers = await userApi.getAllUsers();

            return allUsers.filter((res) => res.id !== ctx.user.id);
          },
        });

        useEffect(() => {
          refetch();
        }, []);

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
                  <SelectValue placeholder="Игрок">
                    {selected?.username}
                  </SelectValue>
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

                  const winner: User =
                    usersArray[Math.floor(Math.random() * usersArray.length)];

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
    "Ебанутый дед",
    () =>
      function (ctx: ModalType) {
        const [loading, setLoading] = useState<boolean>(false);

        return (
          <main className="flex flex-col gap-2 p-2">
            <ImageComponent
              src="/zawa.gif"
              alt="Ебануый дед.gif"
              className="w-full h-100 border-2 border-iris"
            />
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  const audio = new Audio("/audio/zawa.wav");
                  audio.volume = 0.1;
                  audio.play();

                  setLoading(true);
                  setTimeout(async () => {
                    await ctx.consume(
                      `${ctx.user.username} встретил ебанутого деда`,
                    );
                    ctx.close();
                  }, 5000);
                }}
              >
                {loading ? <SmallLoader /> : "Дед ты че?"}
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Я не тупой",
    () =>
      function (ctx: ModalType) {
        const [answers, setAnswers] = useState<string | null>(null);

        return (
          <main className="flex flex-col gap-2">
            <Button
              variant="link"
              className="flex flex-row self-start"
              onContextMenu={(e) => {
                e.preventDefault();
                openUrl("https://randstuff.ru/question/");
              }}
              onClick={() =>
                openWindow(
                  "Янетупой",
                  "https://randstuff.ru/question/",
                  "Я не тупой",
                )
              }
            >
              Открыть сайт <MousePointerClick />
            </Button>
            <Input
              autoFocus
              type="text"
              min={0}
              max={10}
              arrows
              placeholder="Введите количество ответов"
              value={answers ?? ""}
              onChange={(e) => setAnswers(e.target.value)}
            />
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  const number = Number(answers);
                  if (isNaN(number)) return;
                  await userApi.scoreUser(String(ctx.user.id), number);
                  await ctx.consume(
                    `${ctx.user.username} очень умный! Он ответил на ${answers ?? 0} вопросов`,
                  );
                  ctx.close();
                }}
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
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getInventory(String(ctx.user.id));
            return allItems.filter(
              (item) => item.label !== "Алтарь жертвоприношения",
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
                  <SelectValue placeholder="Предмет">
                    {selected?.label}
                  </SelectValue>
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
    "Подброшенная свинья",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allGames = await gameApi.getAllUserGames(String(ctx.user.id));
            return allGames.filter((g) => g.status === "COMPLETED");
          },
        });
        useEffect(() => {
          refetch();
        }, []);
        const [selected, setSelected] = useState<Game | null>(null);

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
              <span className="font-bold">Игры</span>
              <Select
                value={selected?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.find((i) => i.id === e);
                  if (item) setSelected(item);
                }}
              >
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Игра">
                    {selected?.data?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data?.map((item, index) => (
                      <SelectItem key={item.id} value={item.id!}>
                        {`${index + 1}: `}
                        {item.data?.name}
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
                  const allUsers = await userApi
                    .getAllUsers()
                    .then((r) => r.filter((u) => u.id !== ctx.user.id));
                  const randomUser =
                    allUsers[Math.floor(Math.random() * allUsers.length)];
                  await gameApi.addGame({
                    user: { id: randomUser.id, username: randomUser.username },
                    data: selected.data,
                    playtime: { hltb: selected.playtime.hltb ?? 0 },
                    status: "PLAYING",
                    created: new Date().toISOString(),
                  } as Game);
                  await ctx.consume(
                    `${ctx.user.username} отправил ${selected.data.name} игроку ${randomUser.username}`,
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
    "Шляпа",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const inventory = await itemsApi.getAllInventories();
            const users = await userApi.getAllUsers();
            return {
              inventory: inventory.filter((i) => i.owner !== ctx.user.id),
              users,
            };
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
                    <SelectValue placeholder="Предмет">
                      {selected?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.inventory
                        ?.sort((a, b) =>
                          (a.owner ?? "").localeCompare(b.owner ?? ""),
                        )
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
                  await itemsApi.sendInventory(
                    String(selected.id),
                    String(ctx.user.id),
                  );
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
    "Кредитный чип Сбербанка",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: () => itemsApi.getAllItems(),
        });
        useEffect(() => {
          refetch();
        }, []);
        const [selected, setSelected] = useState<Item | null>(null);

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
                    const item = data?.find((i) => i.id === e);
                    if (item) setSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Предмет">
                      {selected?.label}
                    </SelectValue>
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
                  await itemsApi.addInventory(
                    String(ctx.user.id),
                    String(selected.id),
                  );
                  await ctx.consume(
                    `${ctx.user.username} обменял кредитный чип на ${selected.label}`,
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
    "Танец Хомяка: Эпический Расколбас Восприятия",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getAllInventories();
            const allUsers = await userApi.getAllUsers();
            return { inventory: allItems, users: allUsers };
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
                    <SelectValue placeholder="Предмет">
                      {selected?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.inventory
                        .filter(
                          (item) =>
                            item.label !==
                              "Танец Хомяка: Эпический Расколбас Восприятия" &&
                            item.owner !== ctx.user.id,
                        )
                        .sort((a, b) =>
                          (a.owner ?? "").localeCompare(b.owner ?? ""),
                        )
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
                  await itemsApi.removeInventory(String(selected.id));
                  await ctx.consume(
                    `${ctx.user.username} люто потанцевал с хомяком и удалил ${selected.label} у ${selected.owner}`,
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
    "Хорадрический куб",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: () => itemsApi.getInventory(String(ctx.user.id)),
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
                    <SelectValue placeholder="Предмет">
                      {selected?.[0]?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data
                        ?.filter((i) => i.id !== selected?.[1]?.id)
                        .map((item, index) => {
                          if (
                            selected?.[1] &&
                            item.label !== selected?.[1]?.label
                          )
                            return;
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
                    <SelectValue placeholder="Предмет">
                      {selected?.[1]?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data
                        ?.filter((i) => i.id !== selected?.[0]?.id)
                        .map((item, index) => {
                          if (
                            selected?.[0] &&
                            item.label !== selected?.[0]?.label
                          )
                            return;
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
              <Button
                size="icon"
                variant="error"
                onClick={() => setSelected([])}
              >
                <RefreshCcw />
              </Button>
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!selected || selected.length < 2) return;
                  await itemsApi.removeInventory(String(selected[0].id));
                  await itemsApi.removeInventory(String(selected[1].id));
                  await ctx.consume(
                    `${ctx.user.username} удалил два ${selected[0].label}`,
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
    "Платная педалька",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: () => itemsApi.getAllItems(),
        });
        useEffect(() => {
          refetch();
        }, []);
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
                onResult={(it) =>
                  setResult(data?.find((item) => item.id === it?.id) as Item)
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
                        openWindow(
                          String(result.id),
                          getFileUrl(result)!,
                          "Изображение",
                        )
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
                      <SelectValue placeholder="Предмет">
                        {selected?.[index]?.label}
                      </SelectValue>
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
                  await itemsApi.addInventory(
                    String(ctx.user.id),
                    String(result.id),
                  );
                  await ctx.consume(
                    `${ctx.user.username} случайно выбил ${result.label}`,
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
      },
  ),

  ItemFramework.modal(
    "Подмена за кулисами",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allUsers = await userApi.getAllUsers();
            return allUsers.filter((u) => u.id !== ctx.user.id);
          },
        });
        useEffect(() => {
          refetch();
        }, []);
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
                  <SelectValue placeholder="Игрок">
                    {selected?.username}
                  </SelectValue>
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
                  const currentUser = currentGame.find(
                    (g) => g.user.id === ctx.user.id,
                  );
                  const targetUser = currentGame.find(
                    (g) => g.user.id === selected.id,
                  );
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
    "Карта Джокер",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getAllInventories();
            const allUsers = await userApi.getAllUsers();
            return {
              items: allItems.filter((i) =>
                i.label.toUpperCase().includes("КАРТА"),
              ),
              users: allUsers,
            };
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
                  <SelectValue placeholder="Игрок">
                    {selected?.label}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data?.items
                      .sort((a, b) =>
                        (a.owner ?? "").localeCompare(b.owner ?? ""),
                      )
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
                  await ctx.consume(
                    `${ctx.user.username} уничтожил ${selected.label}`,
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
    "Ведьмин котел",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allUsers = await userApi.getAllUsers();
            const allItems = await itemsApi.getAllItems();
            const allInventories = await itemsApi.getAllInventories();
            return {
              items: allItems.filter((i) => i.label !== "Ведьмин котел"),
              inventories: allInventories.filter(
                (i) => i.label !== "Ведьмин котел",
              ),
              users: allUsers,
            };
          },
        });
        useEffect(() => {
          refetch();
        }, []);
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
                    <SelectValue placeholder="Предмет">
                      {finalItem?.label}
                    </SelectValue>
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
                      <SelectValue placeholder="Предмет">
                        {selected?.[index]?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {data?.inventories.map((item) => {
                          if (selected?.includes(item)) return;
                          if (selected?.some((i) => i.owner === item.owner))
                            return;
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
                  await itemsApi.addInventory(
                    String(ctx.user.id),
                    String(finalItem.id),
                  );
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
    "Скальпель",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getInventory(ctx.user.id);
            return allItems.filter((i) => i.label !== "Скальпель");
          },
        });

        useEffect(() => {
          refetch();
        }, []);

        const [fromSelected, setFromSelected] = useState<Inventory | null>(
          null,
        );
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
                    <SelectValue placeholder="Предмет">
                      {fromSelected?.label}
                    </SelectValue>
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
                    <SelectValue placeholder="Предмет">
                      {toSelected?.label}
                    </SelectValue>
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

                  await itemsApi.chargeInventory(
                    String(fromSelected.id),
                    fromSelected.charge,
                    -1,
                  );
                  await itemsApi.chargeInventory(
                    String(toSelected.id),
                    toSelected.charge,
                    1,
                  );

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
    "Гидразинокарбонилметилбромфенилдигидробенздиазепин",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            return await userApi.getAllUsers();
          },
        });

        useEffect(() => {
          refetch();
        }, []);

        const [selected, setSelected] = useState<User | null>(null);
        const [input, setInput] = useState<string>("");

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
                  <SelectValue placeholder="Игрок">
                    {selected?.username}
                  </SelectValue>
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

            <label className="flex flex-col gap-1">
              <span className="font-bold">Название предмета</span>
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </label>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!selected) return;

                  let finalMessage = "";

                  if (
                    input ===
                    "Гидразинокарбонилметилбромфенилдигидробенздиазепин"
                  ) {
                    await userApi.moveUserAnimated(
                      String(selected.id),
                      selected.position - 5,
                    );

                    finalMessage = `передвинул ${selected.username} на 5 клеток назад`;
                  } else {
                    await userApi.moveUserAnimated(
                      String(ctx.user.id),
                      ctx.user.position - 5,
                    );

                    finalMessage = `не смог передвинуть ${selected.username} на 5 клеток назад`;
                  }

                  await ctx.consume(`${ctx.user.username} ${finalMessage}`);

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
    "Астролог",
    () =>
      function (ctx: ModalType) {
        const [input, setInput] = useState<string[]>([]);

        return (
          <main className="flex flex-col gap-2">
            {Array.from({ length: 13 }).map((_, index) => (
              <label key={index} className="flex flex-col gap-1">
                <span className="font-bold">#{index + 1}</span>
                <Input
                  type="text"
                  value={input[index]}
                  onChange={(e) =>
                    setInput((prev) => {
                      const next = [...prev];
                      next[index] = e.target.value;
                      return next;
                    })
                  }
                />
              </label>
            ))}
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!input || input.length < 13) return;
                  const allSigns = [
                    "Овен",
                    "Телец",
                    "Близнецы",
                    "Рак",
                    "Лев",
                    "Дева",
                    "Весы",
                    "Скорпион",
                    "Змееносец",
                    "Стрелец",
                    "Козерог",
                    "Водолей",
                    "Рыбы",
                  ];
                  const zodiac12 = allSigns.filter((s) => s !== "Змееносец");
                  const normalizedInput = input.map((s) =>
                    s.trim().toLowerCase(),
                  );
                  const normalizedAll = allSigns.map((s) => s.toLowerCase());
                  const normalized12 = zodiac12.map((s) => s.toLowerCase());
                  const hasAll12 = normalized12.every((sign) =>
                    normalizedInput.includes(sign),
                  );
                  if (!hasAll12) {
                    await userApi.scoreUser(String(ctx.user.id), -3);
                    await ctx.consume(
                      `${ctx.user.username} попробовал вспомнить знаки зодиака и провалился`,
                    );
                    ctx.close();
                    return;
                  }
                  let score = 6;
                  const hasOphiuchus = normalizedInput.includes("змееносец");
                  const details = hasOphiuchus
                    ? "все 13 знаков зодиака"
                    : "все 12 знаков зодиака";
                  if (hasOphiuchus) {
                    score += 2;
                    const correctOrder = normalizedInput.every(
                      (sign, i) => sign === normalizedAll[i],
                    );
                    if (correctOrder) {
                      score += 2;
                    }
                  } else {
                    const correctOrder = normalizedInput
                      .slice(0, 12)
                      .every((sign, i) => sign === normalized12[i]);
                    if (correctOrder) {
                      score += 2;
                    }
                  }
                  await userApi.scoreUser(String(ctx.user.id), score);
                  await ctx.consume(
                    `${ctx.user.username} вспомнил ${details} и получил ${score} чубриков`,
                  );
                  ctx.close();
                }}
              >
                Применить
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
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getAllInventories();
            return {
              items: allItems.filter((i) => i.owner !== ctx.user.id),
              users: await userApi.getAllUsers(),
            };
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
                    <SelectValue placeholder="Предмет">
                      {selected?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.items
                        .sort((a, b) =>
                          (a.owner ?? "").localeCompare(b.owner ?? ""),
                        )
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

                  await itemsApi.sendInventory(
                    String(selected.id),
                    ctx.user.id,
                  );

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
    "Крысиный алтарь",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getInventory(ctx.user.id);
            return allItems.filter((i) => i.label !== "Крысиный алтарь");
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
                    <SelectValue placeholder="Предмет">
                      {selected?.label}
                    </SelectValue>
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

                  await ctx.consume(
                    `${ctx.user.username} принес в жертву ${selected.label}`,
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
    "Крысиный отец",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allUsers = await userApi.getAllUsers();
            return allUsers.filter((u) => u.id !== ctx.user.id);
          },
        });

        useEffect(() => {
          refetch();
        }, []);

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
                  <SelectValue placeholder="Игрок">
                    {selected?.username}
                  </SelectValue>
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

                  await userApi.changeUserStatus(
                    String(selected.id),
                    "Крысиный отец",
                    "add",
                  );

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
    "Восьмибитная Крыса",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getAllInventories();
            const allUsers = await userApi.getAllUsers();
            return {
              users: allUsers,
              items: allItems.filter((u) => u.id !== ctx.user.id),
            };
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
                    <SelectValue placeholder="Игрок">
                      {selected?.label}
                    </SelectValue>
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

                  await itemsApi.sendInventory(
                    String(selected.id),
                    ctx.user.id,
                  );

                  await ctx.consume(
                    `▓${ctx.user.username}▓▓ укр▓▓ал ${selected.label}▓`,
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
    "Яйцо",
    () =>
      function (ctx: ModalType) {
        const [value, setValue] = useState<number | null>(null);
        const [isRolling, setIsRolling] = useState<boolean>(false);

        const handleRoll = () => {
          if (isRolling) return;

          setIsRolling(true);

          setTimeout(() => {
            const result = Math.floor(Math.floor(Math.random() * 6) + 1);
            setValue(result);
            setIsRolling(false);
          }, 800);
        };

        const getDiceDisplay = () => {
          if (isRolling) {
            return (
              <div className="flex h-22 w-22 transform animate-spin items-center justify-center border border-primary bg-background font-bold rounded text-text shadow-sharp-sm transition-transform hover:scale-105">
                ?
              </div>
            );
          }

          return (
            <div className="flex h-22 w-22 transform items-center justify-center rounded border border-primary bg-background font-bold text-primary shadow-sharp-sm transition-transform hover:scale-105">
              {value}
            </div>
          );
        };

        const possibles = [
          "Ромашка",
          "5 чубриков",
          "Ведро",
          "Арбуз",
          "Легендарный Кал",
          "Доп. кубик на передвижение",
        ];

        return (
          <main className="flex flex-col gap-2">
            <section className="flex flex-col gap-1">
              {possibles.map((item, index) => (
                <span
                  key={item}
                  className="font-bold"
                  style={{ color: index + 1 === value ? "gold" : "white" }}
                >
                  {`${index + 1}: `} {item}
                </span>
              ))}
            </section>
            <button
              role="button"
              type="button"
              className="flex flex-col items-center space-y-1 cursor-pointer group"
              onClick={() => handleRoll()}
              disabled={isRolling}
            >
              {getDiceDisplay()}
            </button>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!value) return;

                  if (value === 1) {
                    const id = "az6vdp4mdxvquwr";

                    await itemsApi.addInventory(ctx.user.id, id);
                  } else if (value === 2) {
                    await userApi.scoreUser(ctx.user.id, 5);
                  } else if (value === 3) {
                    const id = "hytio29eocftliq";

                    await itemsApi.addInventory(ctx.user.id, id);
                  } else if (value === 4) {
                    const id = "rhqziscmz0pumwy";

                    await itemsApi.addInventory(ctx.user.id, id);
                  } else if (value === 5) {
                    const id = "szbxjr8hsdyfowg";

                    await itemsApi.addInventory(ctx.user.id, id);
                  }

                  await ctx.consume(
                    `${ctx.user.username} выбил ${possibles[value - 1]} из яйца`,
                  );

                  ctx.close();
                }}
                disabled={!value}
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
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getInventory(ctx.user.id);
            return allItems;
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
                    <SelectValue placeholder="Предмет">
                      {selected?.label}
                    </SelectValue>
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

                  await ctx.consume(
                    `${ctx.user.username} превратил ${selected.label} в крысу`,
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
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allUsers = await userApi.getAllUsers();
            return allUsers.filter((u) => u.id !== ctx.user.id);
          },
        });

        useEffect(() => {
          refetch();
        }, []);

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
                  <SelectValue placeholder="Игрок">
                    {selected?.username}
                  </SelectValue>
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

                  const allItems = await itemsApi.getInventory(
                    String(selected.id),
                  );

                  if (!allItems) return;

                  const finalItem =
                    allItems[Math.floor(Math.random() * allItems.length)];

                  if (!finalItem) return;

                  const ratId = await itemsApi
                    .getInventory(ctx.user.id)
                    .then((res) =>
                      res.find((i) => i.label === "Мечтательная крыса"),
                    );

                  if (!ratId) return;

                  await itemsApi.sendInventory(
                    String(finalItem.id),
                    ctx.user.id,
                  );
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
    "Крысиный лутбокс",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi
              .getAllItems()
              .then((res) =>
                res.filter((i) => ratIds.includes(String(i.label))),
              );

            return allItems;
          },
        });

        useEffect(() => {
          refetch();
        }, []);

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
                onResult={(it) =>
                  setResult(data?.find((item) => item.id === it?.id) as Item)
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
                        openWindow(
                          String(result.id),
                          getFileUrl(result)!,
                          "Изображение",
                        )
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

                  await itemsApi.addInventory(
                    String(ctx.user.id),
                    String(result.id),
                  );

                  await ctx.consume(
                    `${ctx.user.username} выбил ${result.label}`,
                  );
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
    "Белорусская Крыса",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allUsers = await userApi.getAllUsers();
            const filteredUsers = allUsers
              .filter((u) => u.id !== ctx.user.id)
              .filter(
                (u) =>
                  Array.isArray(u.status) &&
                  u.status.some((s) => s === "Картошка"),
              );

            return filteredUsers.length > 0 ? filteredUsers : [];
          },
        });

        useEffect(() => {
          refetch();
        }, []);

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
                  <SelectValue placeholder="Игрок">
                    {selected?.username}
                  </SelectValue>
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

                  await userApi.changeUserStatus(
                    String(selected.id),
                    "Картошка",
                    "remove",
                  );

                  await ctx.consume(
                    `${ctx.user.username} украл Картошку у ${selected.username}`,
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
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getAllInventories();
            const allUsers = await userApi.getAllUsers();

            return {
              items: allItems
                .filter((i) => i.label !== "Волшебный Крысиный Дождь")
                .filter(
                  (i) =>
                    ratIds.includes(i.label) ||
                    pigIds.includes(i.label) ||
                    gremlinIds.includes(i.label),
                ),
              users: allUsers,
            };
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

        if (!data || data.items.length === 0)
          return <main>Не нашлось предметов</main>;

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
                    <SelectValue placeholder="Предмет">
                      {selected?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.items
                        .sort((a, b) =>
                          (a.owner ?? "").localeCompare(b.owner ?? ""),
                        )
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

                  await itemsApi.sendInventory(
                    String(selected.id),
                    ctx.user.id,
                  );

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
    "Крысиная грамота",
    () =>
      function (ctx: ModalType) {
        const [input, setInput] = useState<string[]>([""]);

        return (
          <main className="flex flex-col gap-2">
            <span>
              Подсказка: крысиных предметов где-то между 0 и {ratIds.length}
            </span>

            {input.map((val, index) => (
              <label key={index} className="flex flex-col gap-1">
                <span className="font-bold">#{index + 1}</span>
                <div className="flex flex-row gap-2">
                  <Input
                    type="text"
                    value={val}
                    onChange={(e) =>
                      setInput((prev) => {
                        const next = [...prev];
                        next[index] = e.target.value;
                        return next;
                      })
                    }
                  />

                  {index === input.length - 1 ? (
                    <Button
                      size="icon"
                      variant="success"
                      className="h-11 w-11"
                      onClick={() => setInput((prev) => [...prev, ""])}
                      disabled={index !== input.length - 1}
                    >
                      <Plus />
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="error"
                      className="h-11 w-11"
                      onClick={() =>
                        setInput((prev) => prev.filter((_, i) => i !== index))
                      }
                      disabled={index === input.length - 1}
                    >
                      <Minus />
                    </Button>
                  )}
                </div>
              </label>
            ))}
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!input || input.length < 13) return;

                  const ratSuccess =
                    input.filter((v) => ratIds.includes(v)).length ?? 0;

                  await userApi.scoreUser(ctx.user.id, ratSuccess);

                  if (ratSuccess >= 3) {
                    await Promise.all(
                      Array.from({ length: 3 }, () =>
                        itemsApi.addInventory(
                          String(ctx.user.id),
                          "dswpfvayiqxul1b",
                        ),
                      ),
                    );
                  }

                  await ctx.consume(
                    `${ctx.user.username} вспомнил ${ratSuccess} крыс и получил ${ratSuccess} чубриков ${ratSuccess >= 3 ? "(+ 3 крысы)" : ""}`,
                  );
                  ctx.close();
                }}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Свинья",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allUsers = await userApi.getAllUsers();

            return {
              effects: allUsers.find((u) => u.id === ctx.user.id)?.status,
              users: allUsers.filter((u) => u.id !== ctx.user.id),
            };
          },
        });

        useEffect(() => {
          refetch();
        }, []);

        const [selected, setSelected] = useState<User | null>(null);
        const [effect, setEffect] = useState<string | null>(null);

        if (isLoading || isRefetching) return <WindowLoader />;
        if (isError)
          return (
            <WindowError
              error={new Error("Произошла ошибка при соединении с сервером")}
              icon={<CircleX className="size-28 animate-pulse text-red-500" />}
            />
          );

        if (!data || !data.effects || data.effects.length === 0)
          return <main>Не нашлось эффектов</main>;

        return (
          <main className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-bold">Статус</span>
              <div className="flex flex-row gap-1">
                <Select
                  value={effect ?? ""}
                  onValueChange={(e) => {
                    if (!e) return;
                    const item = data?.effects?.find((i) => i === e);
                    if (item) setEffect(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Статус">
                      {selected?.username}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.effects.map((item, index) => (
                        <SelectItem key={index} value={item}>
                          {`${index + 1}: `}
                          {item}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-bold">Кому</span>
              <div className="flex flex-row gap-1">
                <Select
                  value={selected?.id ?? ""}
                  onValueChange={(e) => {
                    if (!e) return;
                    const item = data?.users.find((i) => i.id === e);
                    if (item) setSelected(item);
                  }}
                >
                  <SelectTrigger className="w-full py-5">
                    <SelectValue placeholder="Игрок">
                      {selected?.username}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.users.map((item, index) => (
                        <SelectItem key={item.id} value={item.id!}>
                          {`${index + 1}: `}
                          {item.username}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </label>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!selected || !effect) return;

                  await userApi.changeUserStatus(
                    String(selected.id),
                    effect,
                    "add",
                  );
                  await userApi.changeUserStatus(
                    String(ctx.user.id),
                    effect,
                    "remove",
                  );

                  await ctx.consume(
                    `${ctx.user.username} передал ${effect} ${selected.username}`,
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
    "СпецСвин",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
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

        useEffect(() => {
          refetch();
        }, []);

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
                    setResult(
                      data?.rolls.find((item) => item.id === it?.id) as Item,
                    )
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
                          openWindow(
                            String(result.id),
                            getFileUrl(result)!,
                            "Изображение",
                          )
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
                    const finalUser =
                      allUsers[Math.floor(Math.random() * allUsers.length)];

                    if (!finalUser) return;

                    await itemsApi.addInventory(
                      String(finalUser.id),
                      String(result.id),
                    );

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
                    <SelectValue placeholder="Предмет">
                      {selected?.label}
                    </SelectValue>
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
                  const finalUser =
                    allUsers[Math.floor(Math.random() * allUsers.length)];

                  if (!finalUser) return;

                  await itemsApi.sendInventory(
                    String(selected.id),
                    String(finalUser.id),
                  );

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

  ItemFramework.modal(
    "Свин или не свин?",
    () =>
      function (ctx: ModalType) {
        const [ate, setAte] = useState<boolean>(false);
        const [food, setFood] = useState<boolean>(false);

        return (
          <main className="flex flex-col gap-2">
            <label className="flex flex-row gap-1">
              <span className="font-bold">Кушал?</span>
              <Switch checked={ate} onCheckedChange={setAte} />
            </label>
            <label className="flex flex-row gap-1">
              <span className="font-bold">Пирожок или огуречич?</span>
              <Switch checked={food} onCheckedChange={setFood} />
            </label>

            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!ate) return;

                  if (ate) await userApi.scoreUser(String(ctx.user.id), -5);
                  else await userApi.scoreUser(String(ctx.user.id), 5);

                  if (food) await userApi.scoreUser(String(ctx.user.id), 1);

                  const text = ate
                    ? "покушал и потерял 5 чубриков"
                    : "не поел, но зато получил 5 чубриков";
                  const textAdd = food
                    ? "ОН ПОЕЛ ОЧЕНЬ КРУТУЮ ЕДУ и получил чубрик"
                    : "";

                  await ctx.consume(
                    `${ctx.user.usernname} ${text}. ${textAdd}`,
                  );

                  ctx.close();
                }}
                disabled={!ate}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Страшная свиная история",
    () =>
      function (ctx: ModalType) {
        const [read, setRead] = useState<boolean>(false);
        const [music, setMusic] = useState<boolean>(false);
        const [pig, setPig] = useState<boolean>(false);

        const [error, setError] = useState<boolean>(false);

        return (
          <main className="flex flex-col gap-2">
            <section className=" overflow-y-auto h-70 min-h-70 max-h-70 border-2 border-iris p-1 text-xl leading-tight tracking-wide font-serif font-semilight">
              В далёкой деревне, затерянной среди лесов, жила старая свинья по
              кличке Мэгги. Её держал в загоне местный фермер, но никто из
              деревни не подходил близко к её хлеву. Говорили, что Мэгги была не
              совсем обычной свиньёй. Её глаза, тёмные и блестящие, словно
              угольки, казалось, следили за каждым, кто проходил мимо. А по
              ночам из хлева доносились странные звуки — не хрюканье, а что-то
              похожее на шёпот. Однажды мальчик из деревни, любопытный и глупый,
              решил подойти к хлеву. Он хотел посмотреть, что же там происходит.
              Когда он заглянул внутрь, Мэгги стояла в углу, неподвижно,
              уставившись на него. Её глаза светились в темноте, а изо рта
              капала густая чёрная жидкость. Мальчик хотел убежать, но ноги
              словно приросли к земле. Тогда Мэгги медленно подошла к нему, и её
              шёпот стал громче: "Ты тоже станешь частью стада..."На следующее
              утро мальчика нашли в хлеву. Он сидел в углу, неподвижно,
              уставившись в пустоту. Его глаза были тёмными и блестящими, словно
              угольки. А изо рта капала густая чёрная жидкость. С тех пор в
              деревне больше никто не подходил к хлеву. Но по ночам из него до
              сих пор доносится шёпот. И если вы окажетесь там, не смотрите в
              глаза свинье. Иначе вы станете частью стада.
            </section>

            <label className="flex flex-row gap-1">
              <span className="font-bold">Прочитал</span>
              <Switch
                checked={read}
                onCheckedChange={() => {
                  setError(false);

                  if (read) setRead(false);
                  else setRead(true);
                }}
              />
            </label>
            <label className="flex flex-row gap-1">
              <span className="font-bold">Атмосферная музыка</span>
              <Switch
                checked={music}
                onCheckedChange={() => {
                  setError(false);

                  if (music) setMusic(false);
                  else setMusic(true);
                }}
              />
            </label>
            <label className="flex flex-row gap-1">
              <span className="font-bold">Хрюкнул</span>
              <Switch
                checked={pig}
                onCheckedChange={() => {
                  setError(false);

                  if (pig) setPig(false);
                  else setPig(true);
                }}
              />
            </label>

            <label className="flex flex-row gap-1 mt-2">
              <span className="font-bold">Скипнул весь текст</span>
              <Switch
                checked={error}
                onCheckedChange={() => {
                  setRead(false);
                  setMusic(false);
                  setPig(false);

                  if (error) setError(false);
                  else setError(true);
                }}
              />
            </label>

            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (read ? !read : !error) return;
                  let finalScore: number = 0;

                  if (error) finalScore = -5;
                  else {
                    if (read) finalScore += 5;
                    if (music) finalScore += 2;
                    if (pig) finalScore += 2;
                  }

                  await userApi.scoreUser(String(ctx.user.id), finalScore);

                  await ctx.consume(
                    `${ctx.user.usernname} прочитал страшную свиную историю и изменил свои чубрики на ${finalScore}`,
                  );

                  ctx.close();
                }}
                disabled={read ? !read : !error}
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
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allUsers = await userApi.getAllUsers();
            const allItems = await itemsApi.getAllInventories();

            return {
              items: allItems,
              users: allUsers,
            };
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
                    <SelectValue placeholder="Предмет">
                      {selected?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data?.items
                        .sort((a, b) =>
                          (a.owner ?? "").localeCompare(b.owner ?? ""),
                        )
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

  ItemFramework.modal(
    "Гремлинизатор",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, refetch, isRefetching } = useQuery({
          queryKey: ["modalData"],
          queryFn: async () => {
            const allItems = await itemsApi.getAllInventories();

            return allItems
              .filter((i) => i.owner === ctx.user.id)
              .filter((i) => i.label !== "Гремлинизатор");
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
                    <SelectValue placeholder="Предмет">
                      {selected?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {data
                        ?.sort((a, b) =>
                          (a.owner ?? "").localeCompare(b.owner ?? ""),
                        )
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
                  await itemsApi.addInventory(
                    String(ctx.user.id),
                    "evexf52un87e8ju",
                  );

                  await ctx.consume(
                    `${ctx.user.username} превратил ${selected.label} в Гремлина`,
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
    "Колесная Фея",
    () =>
      function (ctx: ModalType) {
        const [value, setValue] = useState<number | null>(null);
        const [isRolling, setIsRolling] = useState<boolean>(false);

        const handleRoll = () => {
          if (isRolling) return;

          setIsRolling(true);

          setTimeout(() => {
            const result = Math.floor(Math.floor(Math.random() * 4) + 1);
            setValue(result);
            setIsRolling(false);
          }, 800);
        };

        const getDiceDisplay = () => {
          if (isRolling) {
            return (
              <div className="flex h-22 w-22 transform animate-spin items-center justify-center border border-primary bg-background font-bold rounded text-text shadow-sharp-sm transition-transform hover:scale-105">
                ?
              </div>
            );
          }

          return (
            <div className="flex h-22 w-22 transform items-center justify-center rounded border border-primary bg-background font-bold text-primary shadow-sharp-sm transition-transform hover:scale-105">
              {value}
            </div>
          );
        };

        return (
          <main className="flex flex-col gap-2">
            <button
              role="button"
              type="button"
              className="flex flex-col items-center space-y-1 cursor-pointer group"
              onClick={() => handleRoll()}
              disabled={isRolling}
            >
              {getDiceDisplay()}
            </button>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!value) return;

                  await ctx.consume(
                    `${ctx.user.username} выбил ${value} бесплатных Колес Приколов для ВСЕХ УЧАСТНИКОВ!!!!!!`,
                  );

                  ctx.close();
                }}
                disabled={!value}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),

  ItemFramework.modal(
    "Лещ",
    () =>
      function (ctx: ModalType) {
        const [value, setValue] = useState<number | null>(null);
        const [isRolling, setIsRolling] = useState<boolean>(false);

        const handleRoll = () => {
          if (isRolling) return;

          setIsRolling(true);

          setTimeout(() => {
            const result = Math.floor(Math.floor(Math.random() * 4) + 1);
            setValue(result);
            setIsRolling(false);
          }, 800);
        };

        const getDiceDisplay = () => {
          if (isRolling) {
            return (
              <div className="flex h-22 w-22 transform animate-spin items-center justify-center border border-primary bg-background font-bold rounded text-text shadow-sharp-sm transition-transform hover:scale-105">
                ?
              </div>
            );
          }

          return (
            <div className="flex h-22 w-22 transform items-center justify-center rounded border border-primary bg-background font-bold text-primary shadow-sharp-sm transition-transform hover:scale-105">
              {value}
            </div>
          );
        };

        const possibles = [
          "Колесо Приколов",
          "3 чубрика",
          "Шаг вперед по карте",
          "2 шага назад по карте",
        ];

        return (
          <main className="flex flex-col gap-2">
            <section className="flex flex-col gap-1">
              {possibles.map((item, index) => (
                <span
                  key={item}
                  className="font-bold"
                  style={{ color: index + 1 === value ? "gold" : "white" }}
                >
                  {`${index + 1}: `} {item}
                </span>
              ))}
            </section>
            <button
              role="button"
              type="button"
              className="flex flex-col items-center space-y-1 cursor-pointer group"
              onClick={() => handleRoll()}
              disabled={isRolling}
            >
              {getDiceDisplay()}
            </button>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!value) return;

                  if (value === 2) {
                    await userApi.scoreUser(String(ctx.user.id), 3);
                  } else if (value === 3) {
                    await userApi.moveUser(
                      String(ctx.user.id),
                      ctx.user.position + 1,
                    );
                  } else if (value === 4) {
                    await userApi.moveUser(
                      String(ctx.user.id),
                      ctx.user.position - 2,
                    );
                  }

                  await ctx.consume(
                    `${ctx.user.username} выбил ${possibles[value - 1]} из леща`,
                  );

                  ctx.close();
                }}
                disabled={!value}
              >
                Применить
              </Button>
            </section>
          </main>
        );
      },
  ),
];
