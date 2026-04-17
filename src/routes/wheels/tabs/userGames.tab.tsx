import { useQuery, useQueryClient } from "@tanstack/react-query";
import { memo, startTransition, useCallback, useEffect, useState } from "react";
import UserApi from "@/api/user.api";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { EyeIcon, EyeOffIcon, NetworkIcon, Plus } from "lucide-react";
import Wheel from "@/components/shared/wheel.component";
import { Button } from "@/components/ui/button.component";
import { Game } from "@/types/games";
import GameApi from "@/api/games.api";
import ImageComponent from "@/components/shared/image.component";
import { useUserStore } from "@/store/user.store";
import { User } from "@/types/user";

const userApi = new UserApi();
const gameApi = new GameApi();

const STATUSES = [
  {
    name: "PLAYING",
    label: "В ПРОЦЕССЕ",
  },
  {
    name: "COMPLETED",
    label: "ПРОЙДЕНО",
  },
  {
    name: "DROPPED",
    label: "ДРОПНУТО",
  },
  {
    name: "REROLLED",
    label: "РЕРОЛЬНУТО",
  },
];

function UserGames({
  selected,
  values,
  setValues,
  setFilters,
  filters,
  selectedFilter,
}: {
  selected: number;
  values: string[];
  setValues: (values: string[]) => void;
  setFilters: (filters: string[]) => void;
  filters: string[];
  selectedFilter: number;
}) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [result, setResult] = useState<Game | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["UserGamesWheel"],
    queryFn: async (): Promise<{ games: Game[]; users: User[] }> => {
      const users = await userApi.getAllUsers();

      setValues(["ВСЕ", ...users.map((u) => u.username)]);
      setFilters(["ВСЕ", ...STATUSES.map((s) => s.label)]);

      if (selected !== 0) {
        const user = users.find((u) => u.username === values[selected]);

        return {
          games: await gameApi.getAllUserGames(String(user?.id)),
          users,
        };
      }

      return { games: await gameApi.getAllGames(), users };
    },
  });

  useEffect(() => {
    if (data && selected === 0 && values.length === 0) {
      setValues(["ВСЕ", ...data.users.map((u) => u.username)]);
      setFilters(["ВСЕ", ...STATUSES.map((s) => s.label)]);
    }
  }, [selected, values.length, data?.users]);

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["UserGamesWheel"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("games", "*", invalidateQuery);
  useSubscription("users", "*", invalidateQuery);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  const handleAddGame = async (id: string) => {
    const game = data?.games.find((game) => game.id === id);

    if (!game) return;

    const gameData = {
      user: {
        id: user?.id,
        username: user?.username,
      },
      data: game.data,
      playtime: {
        hltb: game.playtime.hltb,
      },
      status: "PLAYING",

      created: new Date().toISOString(),
    } as Game;

    return await gameApi.addGame(gameData).then(() => {
      queryClient.invalidateQueries({ queryKey: ["libraryGames"] });
    });
  };

  const visibleItems =
    data?.games.filter((item) => !hiddenItems.includes(String(item.id))) ?? [];

  return (
    <main className="flex flex-col gap-2 w-full h-full">
      {/* WHEEL */}
      <section className="flex flex-col w-full gap-2 p-2 items-center justify-center">
        <Wheel
          key={`wheel-${selected}-${selectedFilter}-${hiddenItems.join(",")}`}
          list={visibleItems
            .filter((item) =>
              selected === 0 ? item : item.user.username === values[selected],
            )
            .filter((item) =>
              selectedFilter === 0
                ? item
                : item.status ===
                  STATUSES.find((s) => s.label === filters[selectedFilter])
                    ?.name,
            )
            .map((item) => ({
              id: String(item.id),
              label: item.data.name,
              image: item.data.capsuleImage,
              type: "image",
            }))}
          onResult={(item) => {
            return setResult(
              data?.games.find(
                (game) => String(game.id) === String(item?.id),
              ) as Game,
            );
          }}
        />

        {result && (
          <div
            key={result.id}
            className="flex flex-row w-3xl min-h-24 h-24 border-2 border-highlight-high p-2 items-center justify-between bg-card shadow-sharp-sm"
          >
            {/* LABEL */}
            <section className="flex flex-row w-full h-full items-center gap-2">
              <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden">
                <ImageComponent
                  src={result.data.capsuleImage ?? "https://placehold.co/16x10"}
                  alt={result.data.name}
                />
              </div>
              <span className="font-bold truncate line-clamp-1">
                {`${result.data.name} [${result.data.time ?? 1} ч.]`}
              </span>
            </section>

            {/* BUTTONS */}
            <section className="flex flex-row items-center gap-1">
              <Button
                title="Добавить в библиотеку"
                variant="success"
                size="icon"
                onClick={() =>
                  handleAddGame(String(result.id)).then(() => setResult(null))
                }
              >
                <Plus />
              </Button>
            </section>
          </div>
        )}
      </section>
      {/* LIST */}
      <section className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2 items-center border-t-2 border-highlight-high">
        {data?.games
          .filter((item) =>
            selected === 0 ? item : item.user.username === values[selected],
          )
          .filter((item) =>
            selectedFilter === 0
              ? item
              : item.status ===
                STATUSES.find((s) => s.label === filters[selectedFilter])?.name,
          )
          .map((item) => (
            <section
              key={item.id}
              className="relative p-2 flex flex-row w-full min-h-fit h-22 border-2 border-highlight-high items-center"
              style={{
                opacity:
                  hiddenItems.find((h) => h === String(item.id)) && "50%",
              }}
            >
              <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden">
                <ImageComponent
                  src={item.data.capsuleImage ?? "https://placehold.co/16x10"}
                  alt={item.data.name}
                />
              </div>

              <div className="flex flex-col ml-2">
                <span className="font-bold text-xl">{item.data.name}</span>
              </div>
              <div className="ml-auto flex flex-row gap-1">
                <Button
                  size="icon"
                  onClick={() => {
                    const existingGame =
                      hiddenItems.filter((h) => h === String(item.id)).length >
                      0;

                    if (!existingGame)
                      return setHiddenItems([...hiddenItems, String(item.id)]);

                    return setHiddenItems(
                      hiddenItems.filter((h) => h !== String(item.id)),
                    );
                  }}
                >
                  {hiddenItems.find((h) => h === String(item.id)) ? (
                    <EyeIcon size={20} />
                  ) : (
                    <EyeOffIcon size={20} />
                  )}
                </Button>
                <Button
                  title="Добавить в библиотеку"
                  variant="success"
                  size="icon"
                  onClick={() => handleAddGame(String(item.id))}
                >
                  <Plus />
                </Button>
              </div>
            </section>
          ))}
      </section>
    </main>
  );
}

export default memo(UserGames);
