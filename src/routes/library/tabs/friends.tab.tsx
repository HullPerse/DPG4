import { memo, startTransition, useCallback, useState } from "react";
import GameApi from "@/api/games.api";
import UserApi from "@/api/user.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon } from "lucide-react";
import { User } from "@/types/user";
import { Game, GameStatus } from "@/types/games";
import { getStatusColor } from "@/lib/utils";
import { Input } from "@/components/ui/input.component";
import { useDataStore } from "@/store/data.store";
import ProfileTab from "./profile.tab";

const gameApi = new GameApi();
const userApi = new UserApi();

function FriendsTab() {
  const queryClient = useQueryClient();
  const setUserProfile = useDataStore((state) => state.setUserProfile);
  const userProfile = useDataStore((state) => state.userProfile);

  const [searchTerms, setSearchTerms] = useState<string>("");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["friendsTab"],
    queryFn: async (): Promise<{ users: User[]; games: Game[] }> => {
      const allIds = await userApi.getAllIds();

      const [users, games] = await Promise.all([
        userApi.getAllUsers(),
        gameApi.getLastGame(allIds.map((player) => player.id)),
      ]);

      return {
        users: users,
        games: games,
      };
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["friendsTab"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("games", "*", invalidateQuery);
  useSubscription("users", "*", invalidateQuery);

  if (isLoading || isFetching) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  if (userProfile) {
    return (
      <main className="p-2 flex flex-wrap flex-row w-full h-full">
        <ProfileTab id={userProfile} />
      </main>
    );
  }

  return (
    <main className="p-2 flex flex-wrap flex-row w-full h-full gap-8">
      <Input
        autoFocus
        type="text"
        placeholder="Поиск пользователя"
        value={searchTerms}
        onChange={(e) => setSearchTerms(e.target.value)}
      />
      <section className="flex flex-wrap gap-4 overflow-y-auto h-full w-full">
        {data?.users
          .filter((user) =>
            user.username.toUpperCase().includes(searchTerms.toUpperCase()),
          )
          .map((user) => {
            const game = data.games.find((g) => g.user.id === user.id);

            return (
              <button
                key={user.id}
                type="button"
                className="flex flex-row max-h-18 h-18 max-w-72 w-72 items-center border-2 border-highlight-high shadow-sharp-sm hover:cursor-pointer hover:opacity-100 opacity-85 active:translate-y-0.5"
                onClick={() => setUserProfile(String(user.id))}
              >
                <section
                  className="min-w-17 w-17 min-h-17 h-17 border-r-4 bg-background flex items-center justify-center text-4xl"
                  style={{
                    borderColor: getStatusColor(game?.status as GameStatus),
                  }}
                >
                  {user.avatar}
                </section>
                <section className="flex flex-col p-1 h-full w-full leading-tight text-start">
                  <span className="font-bold">{user.username}</span>
                  <span className="truncate line-clamp-2 font-light">
                    {game?.data.name}
                  </span>
                </section>
              </button>
            );
          })}
      </section>
    </main>
  );
}
export default memo(FriendsTab);
