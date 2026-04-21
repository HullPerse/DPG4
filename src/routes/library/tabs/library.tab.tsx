import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Home, NetworkIcon, Plus } from "lucide-react";
import { memo, startTransition, useCallback, useMemo, useState } from "react";

import GameApi from "@/api/games.api";
import { Input } from "@/components/ui/input.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { Button } from "@/components/ui/button.component";
import NewGameLibrary from "../components/library/newGame.library";
import GameLibrary from "../components/library/game.library";
import HomeLibrary from "../components/library/home.library";
import { useUserStore } from "@/store/user.store";
import { getStatusColor } from "@/lib/utils";

const gameApi = new GameApi();

function LibraryTab() {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentGame, setCurrentGame] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["libraryGames"],
    queryFn: async () => {
      return await gameApi.getGames(String(user?.id));
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["libraryGames"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("games", "*", invalidateQuery);
  useSubscription("users", "*", invalidateQuery);

  const getNextGame = () => {
    if (!data) return "newGame";

    const currentIndex = data.findIndex((game) => game.id === currentGame);

    return data[currentIndex - 1]?.id;
  };

  const getComponent = useMemo(() => {
    if (!currentGame)
      return (
        <HomeLibrary
          games={data ?? []}
          setCurrentGame={setCurrentGame as (gameId: string) => void}
        />
      );

    if (currentGame === "newGame")
      return (
        <NewGameLibrary
          setCurrentGame={setCurrentGame as (gameId: string | boolean) => void}
          currentType="library"
        />
      );

    return (
      <GameLibrary
        id={currentGame}
        switchGame={() => setCurrentGame(getNextGame() as string)}
      />
    );
  }, [currentGame, data]);

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

  return (
    <main className="flex h-full w-full flex-row">
      <section className="relative flex w-64 min-w-64 flex-col gap-1 overflow-y-auto border-r border-highlight-medium bg-highlight-low p-2">
        <Input
          type="text"
          placeholder="Поиск игр"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10"
        />

        <div className="flex flex-row gap-1 w-full">
          <Button
            variant="link"
            size="icon"
            className="border border-text text-text active:translate-x-0 active:translate-y-0"
            onClick={() => setCurrentGame(null)}
            disabled={currentGame === null}
          >
            <Home />
          </Button>
          <Button
            variant="link"
            className="border border-text text-text active:translate-x-0 active:translate-y-0 flex-1"
            onClick={() => setCurrentGame("newGame")}
            disabled={currentGame === "newGame"}
          >
            <Plus />
          </Button>
        </div>
        <div className="flex h-full flex-col gap-1 overflow-y-auto">
          {data?.length && data?.length > 0
            ? data
                ?.filter((game) =>
                  game.data.name
                    .toUpperCase()
                    .includes(searchTerm.toUpperCase()),
                )
                .sort((a, b) => (a.created > b.created ? 1 : -1))
                .map((game) => (
                  <Button
                    key={game.id}
                    variant="link"
                    className="relative border border-text text-text disabled:opacity-45 active:translate-x-0 active:translate-y-0 w-full"
                    disabled={currentGame === game.id}
                    onClick={() => setCurrentGame(game.id as string)}
                  >
                    <span
                      className="absolute top-1/2 left-2 ml-3 flex h-2 w-2 -translate-y-1/2 items-center justify-center rounded-full"
                      style={{ backgroundColor: getStatusColor(game.status) }}
                    >
                      {currentGame === game.id && (
                        <ChevronRight className="mr-8" />
                      )}
                    </span>

                    <span className="overflow-hidden text-ellipsis whitespace-nowrap ml-4">
                      {game.data.name}
                    </span>
                  </Button>
                ))
            : null}
        </div>
      </section>
      <section className="flex w-full">
        {currentGame === "newGame"
          ? getComponent
          : data?.length && data?.length > 0
            ? getComponent
            : null}
      </section>
    </main>
  );
}

export default memo(LibraryTab);
