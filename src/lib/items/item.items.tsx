import ItemFramework from "./item.framework";
import ItemsApi from "@/api/items.api";
import ActivityApi from "@/api/activity.api";
import UserApi from "@/api/user.api";
import GameApi from "@/api/games.api";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import {
  CircleX,
  CircleQuestionMark,
  MousePointerClick,
  RefreshCcw,
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
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover.component";
import ItemHelper from "@/components/shared/item.helper";
import { image } from "@/api/client.api";
import WheelComponent from "@/components/shared/wheel.component";
import ImageComponent from "@/components/shared/image.component";
import {
  getFirstCellInNextRow,
  getGridPosition,
  getLastCellInRow,
} from "../cell.utils";
import { effectInterface, Inventory, Item } from "@/types/items";
import { Game } from "@/types/games";
import { WheelItem } from "@/types/wheel";
import { User } from "@/types/user";
import { Activity } from "@/types/activity";

const itemsApi = new ItemsApi();
const activityApi = new ActivityApi();
const userApi = new UserApi();
const gameApi = new GameApi();

export const itemEffect: effectInterface[] = [
  ItemFramework.effect("Свиток реролла", async (ctx) => {
    const finalGame = await gameApi
      .getLastGame([String(ctx.user.id)])
      .then((r) => r[0]);
    await gameApi.changeStatus(
      String(finalGame.id),
      finalGame,
      "REROLLED",
      Number(finalGame.data.time ?? 0),
      Number(finalGame.score ?? 0),
    );
    await ctx.consume(
      `${ctx.user.username} использовал свиток реролла на игре ${finalGame.data.name}`,
    );
  }),

  ItemFramework.modal("Я не тупой", (ctx) => {
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
          placeholder="Введите время"
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
  }),

  ItemFramework.modal("Алтарь жертвоприношения", (ctx) => {
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
  }),

  ItemFramework.effect("Гем Монтесумы", async (ctx) => {
    await ctx.consume(`${ctx.user.username} использовал Гем Монтесумы`);
  }),

  ItemFramework.effect("Кредит", async (ctx) => {
    const userMoney = await userApi.getUserScore(String(ctx.user.id));
    if (userMoney < 15) return;
    await userApi.scoreUser(String(ctx.user.id), -15);

    const finalGame = await gameApi
      .getLastGame([String(ctx.user.id)])
      .then((r) => r[0]);
    if (finalGame.status !== "PLAYING") return;

    await gameApi.changeStatus(
      String(finalGame.id),
      finalGame,
      "DROPPED",
      Number(finalGame.data.time ?? 0),
      Number(finalGame.score ?? 0),
    );
    await userApi.changeUserAction(String(ctx.user.id), "GAMEADD");

    await ctx.consume(
      `${ctx.user.username} использовал Кредит на ${finalGame.data.name}`,
    );
  }),

  ItemFramework.modal("Подброшенная свинья", (ctx) => {
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
  }),

  ItemFramework.modal("Шляпа", (ctx) => {
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
                    ?.sort((a, b) => a.owner.localeCompare(b.owner))
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
                <ItemHelper item={selected} type="inventory" />
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
  }),

  ItemFramework.modal("Кредитный чип Сбербанка", (ctx) => {
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
                <ItemHelper item={selected} type="item" />
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
                `${image?.items}${selected.id}/${selected.image}`,
                selected.type,
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
  }),

  ItemFramework.effect("Erection - NPC", async (ctx) => {
    let itemAmount = 0;
    const allUsers = await userApi.getAllUsers();
    const firstPosition = allUsers.reduce((max, u) =>
      u.position > max.position ? u : max,
    );
    const targetInventory = await itemsApi.getInventory(
      String(firstPosition.id),
    );
    if (targetInventory.length === 0) return;

    if (targetInventory.length >= 2) {
      await itemsApi.removeInventory(
        String(
          targetInventory[Math.floor(Math.random() * targetInventory.length)]
            .id,
        ),
      );
      itemAmount += 1;
    }
    await itemsApi.removeInventory(
      String(
        targetInventory[Math.floor(Math.random() * targetInventory.length)].id,
      ),
    );
    itemAmount += 1;

    const currentItem = await itemsApi
      .getInventory(String(ctx.user.id))
      .then((r) => r.find((i) => i.label === "Erection - NPC"));
    if (!currentItem) return;
    await itemsApi.chargeInventory(
      String(currentItem.id),
      currentItem.charge,
      -1,
    );

    await activityApi.createActivity({
      author: ctx.user.id,
      image: firstPosition.avatar,
      type: "emoji",
      text: `У ${firstPosition.username} пропало ${itemAmount} предмета из-за странной магии...`,
    } as Activity);
  }),

  ItemFramework.modal("Танец Хомяка: Эпический Расколбас Восприятия", (ctx) => {
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
                    .sort((a, b) => a.owner.localeCompare(b.owner))
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
                <ItemHelper item={selected} type="inventory" />
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
  }),

  ItemFramework.modal("Хорадрический куб", (ctx) => {
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
                      if (selected?.[1] && item.label !== selected?.[1]?.label)
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
                <ItemHelper item={selected?.[0] ?? null} type="inventory" />
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
                      if (selected?.[0] && item.label !== selected?.[0]?.label)
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
                <ItemHelper item={selected?.[1] ?? null} type="inventory" />
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
  }),

  ItemFramework.modal("Платная педалька", (ctx) => {
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
                    image: `${image?.items}${item.id}/${item.image}`,
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
                  src={`${image?.items}${result.id}/${result.image}`}
                  alt={result.label}
                  className="min-w-20 min-h-20 w-20 h-20 flex items-center justify-center border-2 border-highlight-high bg-background hover:cursor-pointer"
                  onClick={() =>
                    openWindow(
                      String(result.id),
                      `${image?.items}${result.id}/${result.image}`,
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
                  <ItemHelper item={selected?.[index] ?? null} type="item" />
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
                `${image?.items}${result.id}/${result.image}`,
                "item",
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
  }),

  ItemFramework.modal("Подмена за кулисами", (ctx) => {
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
  }),

  ItemFramework.modal("Карта Джокер", (ctx) => {
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
              <SelectValue placeholder="Игрок">{selected?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {data?.items
                  .sort((a, b) => a.owner.localeCompare(b.owner))
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
  }),

  ItemFramework.effect("Арбуз", async (ctx) => {
    const currentRow = getGridPosition(ctx.user.position).row;
    await userApi.moveUser(String(ctx.user.id), getLastCellInRow(currentRow));
    await userApi.changeUserAction(
      String(ctx.user.id),
      ctx.user.currentAction === "GAMEADD" ? "GAMEFINISH" : "GAMEADD",
    );
    await ctx.consume(
      `${ctx.user.username} переместился на клетку ${getLastCellInRow(currentRow)}`,
    );
  }),

  ItemFramework.effect("Арбус", async (ctx) => {
    const currentRow = getGridPosition(ctx.user.position).row;
    await userApi.moveUser(
      String(ctx.user.id),
      getFirstCellInNextRow(currentRow),
    );
    await userApi.changeUserAction(
      String(ctx.user.id),
      ctx.user.currentAction === "GAMEADD" ? "GAMEFINISH" : "GAMEADD",
    );
    await ctx.consume(
      `${ctx.user.username} переместился на клетку ${getFirstCellInNextRow(currentRow)}`,
    );
  }),

  ItemFramework.modal("Ведьмин котел", (ctx) => {
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
                <ItemHelper item={finalItem} type="item" />
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
                  <ItemHelper
                    item={selected?.[index] ?? null}
                    type="inventory"
                  />
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
                `${image?.items}${finalItem.id}/${finalItem.image}`,
                finalItem.type,
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
  }),
];
