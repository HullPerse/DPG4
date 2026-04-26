import { memo, startTransition, useCallback, useState } from "react";
import GameApi from "@/api/games.api";
import UserApi from "@/api/user.api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/subscription.hook";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon } from "lucide-react";
import { User } from "@/types/user";
import { Game } from "@/types/games";
import { getStatusColor } from "@/lib/utils";
import { Input } from "@/components/ui/input.component";
import { useDataStore } from "@/store/data.store";
import { Chat } from "@/types/chat";
import ChatApi from "@/api/chat.api";
import { useUserStore } from "@/store/user.store";

const gameApi = new GameApi();
const userApi = new UserApi();
const chatApi = new ChatApi();

function FriendsTab() {
  const queryClient = useQueryClient();

  const currentUser = useUserStore((state) => state.user);
  const setUserProfile = useDataStore((state) => state.setUserProfile);

  const [searchTerms, setSearchTerms] = useState<string>("");

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["friendsTab"],
    queryFn: async (): Promise<{
      users: User[];
      games: Game[];
      chats: Chat[];
    }> => {
      const allIds = await userApi.getAllIds();

      const [users, games, chats] = await Promise.all([
        userApi.getAllUsers(),
        gameApi.getLastGame(allIds.map((player) => player.id)),
        chatApi.getUnreadByReceiver(String(currentUser?.id)),
      ]);

      return {
        users: users,
        games: games,
        chats: chats,
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
  useSubscription("chats", "*", invalidateQuery);

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

  return (
    <main className="p-2 flex flex-col w-full h-full gap-8">
      <Input
        autoFocus
        type="text"
        placeholder="Поиск пользователя"
        value={searchTerms}
        onChange={(e) => setSearchTerms(e.target.value)}
      />
      <section className="flex flex-wrap gap-2 overflow-y-auto w-full pb-2 items-start justify-start">
        {data?.users
          .filter((user) =>
            user.username.toUpperCase().includes(searchTerms.toUpperCase()),
          )
          .map((user) => {
            const game = data.games.find((g) => g.user.id === user.id);
            const unread = data.chats?.filter(
              (c) => c.data.sender.id === user.id,
            );

            return (
              <button
                key={user.id}
                type="button"
                className="relative flex flex-row max-h-18 h-18 max-w-70 w-70 items-center border-2 border-highlight-high shadow-sharp-sm hover:cursor-pointer hover:opacity-100 opacity-85 active:translate-y-0.5"
                onClick={() => {
                  setUserProfile({
                    type: "profile",
                    id: String(user.id),
                  });
                }}
              >
                {unread.length > 0 && (
                  <span className="absolute top-0 right-1 text-primary animate-pulse">
                    [{unread.length}]
                  </span>
                )}

                <section
                  className="min-w-17 w-17 min-h-17 h-17 border-r-4 bg-background flex items-center justify-center text-4xl relative"
                  style={{
                    borderColor: getStatusColor(game?.status ?? "PLAYING"),
                  }}
                >
                  {user.avatar}
                </section>
                <section className="flex flex-col p-1 h-full w-full leading-tight text-start overflow-hidden">
                  <span className="font-bold">{user.username}</span>
                  <span className="truncate font-light text-ellipsis">
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
