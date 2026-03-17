import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, NetworkIcon, Plus } from "lucide-react";
import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import GameApi from "@/api/games.api";
import { Input } from "@/components/ui/input.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { Button } from "@/components/ui/button.component";
import NewGameLibrary from "../components/newGame.library";
import GameLibrary from "../components/game.library";
import { useUserStore } from "@/store/user.store";
import { getStatusColor } from "@/lib/utils";

const gameApi = new GameApi();

function LibraryTab() {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentGame, setCurrentGame] = useState<string>("");

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

  useEffect(() => {
    if (data) {
      return setCurrentGame(data[data.length - 1]?.id as string);
    }
  }, [data]);

  const getComponent = useMemo(() => {
    if (currentGame === "newGame") return <NewGameLibrary />;
    return <GameLibrary id={currentGame} />;
  }, [currentGame]);

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
    <main className="flex flex-row w-full h-full">
      <section className="relative flex flex-col bg-highlight-low border-r border-highlight-medium p-2 min-w-64 w-64 gap-1 overflow-y-auto">
        <Input
          type="text"
          placeholder="Поиск игр"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Button
          variant="link"
          className="border border-text text-text"
          onClick={() => setCurrentGame("newGame")}
          disabled={currentGame === "newGame"}
        >
          <Plus />
        </Button>
        <div className="flex flex-col gap-1 overflow-y-auto h-full">
          {data
            ?.filter((game) =>
              game.data.name.toUpperCase().includes(searchTerm.toUpperCase()),
            )
            .sort((a, b) => (a.createdAt! > b.createdAt! ? 1 : -1))
            .map((game) => (
              <div key={game.id} className="flex flex-col w-full">
                <Button
                  variant="link"
                  className="relative border border-text text-text disabled:opacity-45 overflow-hidden"
                  disabled={currentGame === game.id}
                  onClick={() => setCurrentGame(game.id as string)}
                >
                  <span
                    className="flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ml-3"
                    style={{ backgroundColor: getStatusColor(game.status) }}
                  >
                    {currentGame === game.id && (
                      <ChevronRight className="mr-8" />
                    )}
                  </span>

                  {game.data.name}
                </Button>
              </div>
            ))}
        </div>
      </section>
      <section className="flex w-full h-full">{getComponent}</section>
    </main>
  );
}

export default memo(LibraryTab);
