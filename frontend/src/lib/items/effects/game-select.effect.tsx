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
import ItemFramework from "../item.framework";
import { userApi } from "@/api/user.api";
import { gameApi } from "@/api/games.api";

export const gameSelectEffects: effectInterface[] = [
  ItemFramework.modal(
    "Подброшенная свинья",
    () =>
      function (ctx: ModalType) {
        const { data, isLoading, isError, isRefetching } = useQuery({
          queryKey: ["modalData", ctx.user.id],
          queryFn: async () => {
            const allGames = await gameApi.getAllUserGames(String(ctx.user.id));
            return allGames.filter((g) => g.status === "COMPLETED");
          },
        });
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
                  <SelectValue placeholder="Игра">{selected?.data?.name}</SelectValue>
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
                  const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
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
];


