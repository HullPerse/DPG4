import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.component";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover.component";
import { CircleX, CircleQuestionMark } from "lucide-react";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import ItemHelper from "@/components/shared/item.helper";
import ImageComponent from "@/components/shared/image.component";
import { effectInterface, Inventory, Item } from "@/types/items";
import type { ModalType } from "@/types/effect";
import { User } from "@/types/user";
import ItemFramework from "../item.framework";
import { itemsApi } from "@/api/items.api";
import { userApi } from "@/api/user.api";
import { ratIds } from "../item.categories";

export const specialEffects: effectInterface[] = [
  ItemFramework.modal(
    "Кредитный чип Сбербанка",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: () => itemsApi.getItems(),
        });
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
                  await itemsApi.addInventory(String(ctx.user.id), String(selected.id));
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
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allItems = await itemsApi.getInventories();
            const allUsers = await userApi.getAllUsers();
            return { inventory: allItems, users: allUsers };
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
                        .filter(
                          (item) =>
                            item.label !== "Танец Хомяка: Эпический Расколбас Восприятия" &&
                            item.owner !== ctx.user.id,
                        )
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
                loading={loading}
                onClick={async () => {
                  const audio = new Audio("/audio/zawa.wav");
                  audio.volume = 0.1;
                  audio.play();

                  setLoading(true);
                  setTimeout(async () => {
                    await ctx.consume(`${ctx.user.username} встретил ебанутого деда`);
                    ctx.close();
                  }, 5000);
                }}
              >
                Дед ты че?
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
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            return await userApi.getAllUsers();
          },
        });

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

            <label className="flex flex-col gap-1">
              <span className="font-bold">Название предмета</span>
              <Input type="text" value={input} onChange={(e) => setInput(e.target.value)} />
            </label>
            <section className="flex flex-row items-center justify-between gap-2 p-1">
              <Button
                className="flex flex-1"
                variant="success"
                onClick={async () => {
                  if (!selected) return;

                  let finalMessage = "";

                  if (input === "Гидразинокарбонилметилбромфенилдигидробенздиазепин") {
                    await userApi.moveUserAnimated(String(selected.id), selected.position - 5);

                    finalMessage = `передвинул ${selected.username} на 5 клеток назад`;
                  } else {
                    await userApi.moveUserAnimated(String(ctx.user.id), ctx.user.position - 5);

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
    "Крыса-Гадалка",
    () =>
      function (ctx: ModalType) {
        type Fate =
          | { type: "money"; amount: number }
          | { type: "stealMoney"; amount: number }
          | { type: "ratItem"; label: string }
          | { type: "loseMoney"; amount: number }
          | { type: "stealItem"; label: string }
          | { type: "rareItem"; label: string };

        const emojis = ["🔮", "🌟", "🃏"];
        const [picked, setPicked] = useState<number | null>(null);
        const [fate, setFate] = useState<Fate | null>(null);
        const [loading, setLoading] = useState(false);

        const rollFate = async (): Promise<Fate> => {
          const roll = Math.random() * 100;
          if (roll < 40) {
            const amount = 3 + Math.floor(Math.random() * 6);
            return { type: "money", amount };
          }
          if (roll < 60) {
            const amount = 3 + Math.floor(Math.random() * 4);
            return { type: "stealMoney", amount };
          }
          if (roll < 75) {
            const allItems = await itemsApi.getAllItems();
            const ratPool = allItems.filter(
              (i) => ratIds.has(i.label) && i.label !== "Крыса-Гадалка",
            );
            const item = ratPool[Math.floor(Math.random() * ratPool.length)];
            return { type: "ratItem", label: item?.label ?? "Крыса" };
          }
          if (roll < 85) {
            const amount = 3 + Math.floor(Math.random() * 4);
            return { type: "loseMoney", amount };
          }
          if (roll < 95) {
            const others = await itemsApi
              .getInventory(ctx.user.id)
              .then((res) => res.filter((i) => i.label !== "Крыса-Гадалка"));
            const item =
              others.length > 0 ? others[Math.floor(Math.random() * others.length)] : null;
            return { type: "stealItem", label: item?.label ?? "ничего" };
          }
          return { type: "rareItem", label: "Крысиный Король" };
        };

        const pickCard = async (index: number) => {
          setPicked(index);
          setLoading(true);
          const result = await rollFate();
          setFate(result);
          setLoading(false);
        };

        const applyFate = async () => {
          if (!fate) return;
          switch (fate.type) {
            case "money":
              await userApi.scoreUser(String(ctx.user.id), fate.amount);
              break;
            case "stealMoney": {
              const allUsers = await userApi.getAllUsers();
              const others = allUsers.filter((u) => u.id !== ctx.user.id);
              if (others.length > 0) {
                const target = others[Math.floor(Math.random() * others.length)];
                await userApi.scoreUser(target.id!, -fate.amount);
                await userApi.scoreUser(String(ctx.user.id), fate.amount);
              }
              break;
            }
            case "ratItem": {
              const allItems = await itemsApi.getAllItems();
              const ratPool = allItems.filter(
                (i) => ratIds.has(i.label) && i.label !== "Крыса-Гадалка",
              );
              const item = ratPool[Math.floor(Math.random() * ratPool.length)];
              if (item) await itemsApi.addInventory(String(ctx.user.id), String(item.id));
              break;
            }
            case "loseMoney":
              await userApi.scoreUser(String(ctx.user.id), -fate.amount);
              break;
            case "stealItem": {
              const allUsers = await userApi.getAllUsers();
              const others = allUsers.filter((u) => u.id !== ctx.user.id);
              if (others.length > 0) {
                const target = others[Math.floor(Math.random() * others.length)];
                const [targetItem] = (await itemsApi.getInventory(target.id!)).filter(
                  (i) => i.label !== "Крыса-Гадалка",
                );
                if (targetItem) {
                  await itemsApi.sendInventory(targetItem.id, ctx.user.id);
                }
              }
              break;
            }
            case "rareItem": {
              const allItems = await itemsApi.getAllItems();
              const rare = allItems.find((i) => i.label === fate.label);
              if (rare) await itemsApi.addInventory(String(ctx.user.id), String(rare.id));
              break;
            }
          }
          await ctx.consume(
            `${ctx.user.username} заглянул в судьбу и получил ${fate.type === "money" ? `${fate.amount} чубриков` : fate.type === "stealMoney" ? `${fate.amount} украденных чубриков` : fate.type === "ratItem" ? "крысу" : fate.type === "loseMoney" ? "потерю" : fate.type === "stealItem" ? "чужой предмет" : "редкую награду"}`,
          );
          ctx.close();
        };

        const fateDescription = (f: Fate) => {
          switch (f.type) {
            case "money":
              return `💰 +${f.amount} чубриков`;
            case "stealMoney":
              return `😈 +${f.amount} украденных чубриков`;
            case "ratItem":
              return `🐀 +${f.label}`;
            case "loseMoney":
              return `💸 -${f.amount} чубриков`;
            case "stealItem":
              return `🕵️ +${f.label}`;
            case "rareItem":
              return `👑 +${f.label}`;
          }
        };

        return (
          <main className="flex flex-col gap-3 items-center p-2">
            <span className="text-lg font-bold">🔮 Выбери свою судьбу</span>
            <div className="flex flex-row gap-3">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  disabled={picked !== null || loading}
                  onClick={() => pickCard(i)}
                  className={`flex h-28 w-20 items-center justify-center rounded-lg border-2 text-3xl font-bold transition-all duration-500 ${
                    picked === null
                      ? "cursor-pointer border-highlight-medium bg-highlight-low hover:scale-105 hover:border-primary"
                      : picked === i
                        ? "scale-110 border-primary bg-highlight-low"
                        : "scale-90 opacity-40 border-highlight-low"
                  }`}
                >
                  {picked === i && fate ? fateDescription(fate) : loading ? "..." : emojis[i]}
                </button>
              ))}
            </div>
            {fate && (
              <Button variant="success" onClick={applyFate}>
                Получить
              </Button>
            )}
          </main>
        );
      },
  ),
  ItemFramework.modal(
    "Свинья",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const [me, users] = await Promise.all([
              userApi.getUserById(ctx.user.id),
              userApi.getUsers({ excludeUserId: ctx.user.id }),
            ]);
            return { effects: me?.status, users };
          },
        });

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
                    <SelectValue placeholder="Статус">{selected?.username}</SelectValue>
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
                    <SelectValue placeholder="Игрок">{selected?.username}</SelectValue>
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

                  await userApi.changeUserStatus(String(selected.id), effect, "add");
                  await userApi.changeUserStatus(String(ctx.user.id), effect, "remove");

                  await ctx.consume(`${ctx.user.username} передал ${effect} ${selected.username}`);

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


