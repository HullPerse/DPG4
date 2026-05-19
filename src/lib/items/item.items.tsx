import ItemsApi from "@/api/items.api";
import ActivityApi from "@/api/activity.api";
import UserApi from "@/api/user.api";
import GameApi from "@/api/games.api";

import { effectInterface, Inventory } from "@/types/items";
import { useUserStore } from "@/store/user.store";
import { Activity } from "@/types/activity";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { CircleQuestionMark, CircleX, MousePointerClick } from "lucide-react";
import { openWindow } from "../utils";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useQuery } from "@tanstack/react-query";
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
import { Game } from "@/types/games";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover.component";
import ItemHelper from "@/components/shared/item.helper";

const itemsApi = new ItemsApi();
const activityApi = new ActivityApi();
const userApi = new UserApi();
const gameApi = new GameApi();

export const itemEffect: effectInterface[] = [
  {
    label: "Свиток реролла",
    type: "effect",
    effect: async () => {
      const user = useUserStore.getState().user;

      if (!user) return;

      const finalGame = await gameApi.getLastGame([String(user.id)]).then((res) => res[0]);

      await gameApi.changeStatus(
        String(finalGame.id),
        finalGame,
        "REROLLED",
        Number(finalGame.data.time ?? 0),
        Number(finalGame.score ?? 0),
      );

      const currentItem = await itemsApi
        .getInventory(String(user.id))
        .then((res) => res.find((item) => item.label === "Свиток реролла"));

      if (!currentItem) return;

      await itemsApi.chargeInventory(String(currentItem.id), currentItem.charge, -1);

      const activityData = {
        author: user?.id,
        image: user?.avatar,
        text: `${user?.username} использовал свиток реролла на игре ${finalGame.data.name}`,
      } as Activity;

      return await activityApi.createActivity(activityData);
    },
  },
  {
    label: "Я не тупой",
    type: "modal",
    body: (close) => {
      const user = useUserStore((state) => state.user);

      const [answers, setAnswers] = useState<string | null>(null);

      const handleApply = async () => {
        if (!user) return;

        const number = Number(answers);

        if (isNaN(number)) return;

        await userApi.scoreUser(String(user.id), number);

        const currentItem = await itemsApi
          .getInventory(String(user.id))
          .then((res) => res.find((item) => item.label === "Я не тупой"));

        if (!currentItem) return;

        await itemsApi.chargeInventory(String(currentItem.id), currentItem.charge, -1);

        const activityData = {
          author: user?.id,
          image: user?.avatar,
          text: `${user?.username} очень умный! Он ответил на ${answers ? answers : 0} вопросов`,
        } as Activity;

        await activityApi.createActivity(activityData);

        return close();
      };

      return (
        <main className="flex flex-col gap-2">
          <Button
            variant="link"
            className="flex flex-row self-start"
            onContextMenu={(e) => {
              e.preventDefault();
              openUrl("https://randstuff.ru/question/");
            }}
            onClick={() => {
              openWindow("Янетупой", "https://randstuff.ru/question/", "Я не тупой");
            }}>
            Открыть сайт <MousePointerClick />
          </Button>

          {/* Input */}
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
          {/* Buttons */}
          <section className="flex flex-row items-center justify-between gap-2 p-1">
            <Button className="flex flex-1" variant="success" onClick={handleApply}>
              Применить
            </Button>
          </section>
        </main>
      );
    },
  },
  {
    label: "Алтарь жертвоприношения",
    type: "modal",
    body: (close) => {
      const user = useUserStore((state) => state.user);

      const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: ["modalData"],
        queryFn: async () => {
          const allItems = await itemsApi.getInventory(String(user?.id));
          return allItems.filter((item) => item.label !== "Алтарь жертвоприношения");
        },
        enabled: !!user,
      });

      useEffect(() => {
        refetch();
      }, []);

      const [selected, setSelected] = useState<Inventory | null>(null);

      const handleApply = async () => {
        if (!user || !selected) return;

        const currentItem = await itemsApi
          .getInventory(String(user.id))
          .then((res) => res.find((i) => i.label === "Алтарь жертвоприношения"));

        if (currentItem) {
          await itemsApi.chargeInventory(String(currentItem.id), currentItem.charge, -1);
        }
        await itemsApi.removeInventory(String(selected.id));

        const activityData = {
          author: user?.id,
          image: user?.avatar,
          text: `${user?.username} потерял ${selected.label} из-за Алтаря Жертвоприношения`,
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
            <span className="font-bold">Инвентарь</span>
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

          {/* Buttons */}
          <section className="flex flex-row items-center justify-between gap-2 p-1">
            <Button
              className="flex flex-1"
              variant="success"
              onClick={handleApply}
              disabled={!selected}>
              Применить
            </Button>
          </section>
        </main>
      );
    },
  },
  {
    label: "Гем Монтесумы",
    type: "effect",
    effect: async () => {
      const user = useUserStore.getState().user;

      if (!user) return;

      const currentItem = await itemsApi
        .getInventory(String(user.id))
        .then((res) => res.find((item) => item.label === "Гем Монтесумы"));

      if (!currentItem) return;

      await itemsApi.chargeInventory(String(currentItem.id), currentItem.charge, -1);

      const activityData = {
        author: user?.id,
        image: user?.avatar,
        text: `${user?.username} использовал Гем Монтесумы`,
      } as Activity;

      return await activityApi.createActivity(activityData);
    },
  },
  {
    label: "Кредит",
    type: "effect",
    effect: async () => {
      const user = useUserStore.getState().user;

      if (!user) return;

      const userMoney = await userApi.getUserScore(String(user.id));

      if (userMoney < 15) return;
      else await userApi.scoreUser(String(user.id), -15);

      const finalGame = await gameApi.getLastGame([String(user.id)]).then((res) => res[0]);

      if (finalGame.status !== "PLAYING") return;

      await gameApi.changeStatus(
        String(finalGame.id),
        finalGame,
        "DROPPED",
        Number(finalGame.data.time ?? 0),
        Number(finalGame.score ?? 0),
      );

      await userApi.changeUserAction(String(user.id), "GAMEADD");

      const currentItem = await itemsApi
        .getInventory(String(user.id))
        .then((res) => res.find((item) => item.label === "Кредит"));

      if (!currentItem) return;

      await itemsApi.chargeInventory(String(currentItem.id), currentItem.charge, -1);

      const activityData = {
        author: user?.id,
        image: user?.avatar,
        text: `${user?.username} использовал Кредит на ${finalGame.data.name}`,
      } as Activity;

      return await activityApi.createActivity(activityData);
    },
  },
  {
    label: "Подброшенная свинья",
    type: "modal",
    body: (close) => {
      const user = useUserStore((state) => state.user);

      const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: ["modalData"],
        queryFn: async () => {
          const allGames = await gameApi.getAllUserGames(String(user?.id));
          return allGames.filter((g) => g.status === "COMPLETED");
        },
        enabled: !!user,
      });

      useEffect(() => {
        refetch();
      }, []);

      const [selected, setSelected] = useState<Game | null>(null);

      const handleApply = async () => {
        if (!user || !selected) return;

        const allUsers = await userApi
          .getAllUsers()
          .then((res) => res.filter((u) => u.id !== user.id));

        const randomIndex = Math.floor(Math.random() * allUsers.length);
        const randomUser = allUsers[randomIndex];

        const gameData = {
          user: {
            id: randomUser.id,
            username: randomUser.username,
          },
          data: selected.data,
          playtime: {
            hltb: selected.playtime.hltb ?? 0,
          },
          status: "PLAYING",
          created: new Date().toISOString(),
        } as Game;

        await gameApi.addGame(gameData);

        const currentItem = await itemsApi
          .getInventory(String(user.id))
          .then((res) => res.find((i) => i.label === "Подброшенная свинья"));

        if (currentItem) {
          await itemsApi.chargeInventory(String(currentItem.id), currentItem.charge, -1);
        }

        const activityData = {
          author: user?.id,
          image: user?.avatar,
          text: `${user?.username} отправил ${selected.data.name} игроку ${randomUser.username}`,
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
            <span className="font-bold">Игры</span>
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
                <SelectValue placeholder="Игра">{selected?.data.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {data?.map((item, index) => (
                    <SelectItem key={item.id} value={item.id!}>
                      {`${index + 1}: `}
                      {item.data.name}
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
              Отправить
            </Button>
          </section>
        </main>
      );
    },
  },
  {
    label: "Шляпа",
    type: "modal",
    body: (close) => {
      const user = useUserStore((state) => state.user);

      const { data, isLoading, isError, refetch, isRefetching } = useQuery({
        queryKey: ["modalData"],
        queryFn: async () => {
          const allItems = await itemsApi.getAllInventories();
          const allUsers = await userApi.getAllUsers();
          return { inventory: allItems.filter((i) => i.owner !== user?.id), users: allUsers };
        },
        enabled: !!user,
      });

      useEffect(() => {
        refetch();
      }, []);

      const [selected, setSelected] = useState<Inventory | null>(null);

      const handleApply = async () => {
        if (!user || !selected) return;

        await itemsApi.sendInventory(String(selected.id), String(user.id));

        const currentItem = await itemsApi
          .getInventory(String(user.id))
          .then((res) => res.find((i) => i.label === "Шляпа"));

        if (currentItem) {
          await itemsApi.chargeInventory(String(currentItem.id), currentItem.charge, -1);
        }

        const activityData = {
          author: user?.id,
          image: user?.avatar,
          text: `${user?.username} украл ${selected.label} у ${data?.users.find((u) => u.id === selected.owner)?.username}`,
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
            <span className="font-bold">Предметы</span>
            <div className="flex flex-row gap-1 w-full">
              <Select
                value={selected?.id ?? ""}
                onValueChange={(e) => {
                  if (!e) return;
                  const item = data?.inventory.find((i) => i.id === e);
                  if (item) {
                    setSelected(item);
                  }
                }}>
                <SelectTrigger className="w-full py-5">
                  <SelectValue placeholder="Предмет">{selected?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {data?.inventory
                      ?.sort((a, b) => a.owner.localeCompare(b.owner))
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
                    className="text-text hover:bg-text/20 disabled:bg-text/20 disabled:text-primary disabled:opacity-85 flex gap-0 h-10 w-10 p-5">
                    <CircleQuestionMark />
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent
                  className="z-9999 flex flex-col gap-1 shadow-sharp-sm border-2 border-highlight-high h-42 max-h-42 mi-h-42 w-md"
                  side={"top"}>
                  <ItemHelper item={selected} type="inventory" />
                </HoverCardContent>
              </HoverCard>
            </div>
          </label>

          {/* Buttons */}
          <section className="flex flex-row items-center justify-between gap-2 p-1">
            <Button
              className="flex flex-1"
              variant="success"
              onClick={handleApply}
              disabled={!selected}>
              Отправить
            </Button>
          </section>
        </main>
      );
    },
  },
];
