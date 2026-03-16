import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon, Plus } from "lucide-react";
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
      return setCurrentGame(data[0]?.id);
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
      <section className="relative flex flex-col bg-highlight-low border-r border-highlight-medium p-2 w-64 gap-1">
        <Input
          type="text"
          placeholder="Поиск игр"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Button
          variant="link"
          className="absolute left-1 bottom-1 border border-text text-text"
          onClick={() => setCurrentGame("newGame")}
          disabled={currentGame === "newGame"}
        >
          <Plus />
        </Button>

        {data
          ?.filter((game) =>
            game.data.name
              .toUpperCase()
              .includes(searchTerm.trim().toUpperCase()),
          )
          .map((game) => (
            <Button
              key={game.id}
              variant="link"
              className="border border-text text-text"
              style={{
                borderColor: getStatusColor(game.status),
              }}
              disabled={currentGame === game.id}
              onClick={() => setCurrentGame(game.id)}
            >
              {game.data.name}
            </Button>
          ))}
      </section>
      <section>{getComponent}</section>
    </main>
  );
}

export default memo(LibraryTab);
