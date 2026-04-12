import { memo, useState } from "react";
import Profile from "../components/profile/profile.profile";
import { type ProfileTab } from "@/types/profile";

import { useUserStore } from "@/store/user.store";

import { Button } from "@/components/ui/button.component";
import { profileTabs } from "@/config/library.config";
import { RussianRubleIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon } from "lucide-react";
import { startTransition, useCallback } from "react";
import { useSubscription } from "@/hooks/subscription.hook";
import UserApi from "@/api/user.api";
import { User } from "@/types/user";
import { Game } from "@/types/games";
import GameApi from "@/api/games.api";
import Games from "../components/profile/games.profile";
import ReviewsProfile from "../components/profile/reviews.profile";
import ChatProfile from "../components/profile/chat.profile";
const userApi = new UserApi();
const gameApi = new GameApi();

function ProfileTab({ id }: { id?: string }) {
  const user = useUserStore((state) => state.user);

  const [profileTab, setProfileTab] = useState<ProfileTab>("profile");

  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["profileTab", id],
    queryFn: async (): Promise<{ user: User; games: Game[] }> => {
      const userData = await userApi.getUserById(id ?? String(user?.id));
      const gamesDatat = await gameApi.getAllUserGames(id ?? String(user?.id));

      return { user: userData, games: gamesDatat };
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["profileTab", id],
        refetchType: "all",
      });
    });
  }, [queryClient, id]);

  useSubscription("users", `*`, invalidateQuery);
  useSubscription("games", `*`, invalidateQuery);

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

  const getComponent = () => {
    const tabMap = {
      profile: (
        <Profile user={data?.user as User} games={data?.games as Game[]} />
      ),
      library: <Games games={data?.games as Game[]} />,
      reviews: <ReviewsProfile id={String(data?.user.id)} />,
      chat: <ChatProfile id={String(data?.user.id)} />,
      trade: <>4</>,
      inventory: <>2</>,
    };

    return tabMap[profileTab];
  };

  return (
    <main className="flex w-full h-full">
      <section className="flex w-full h-full overflow-y-auto">
        {getComponent()}
      </section>
      <section className="flex flex-col gap-2 items-center border-l-2 h-full  border-highlight-high bg-background">
        {/* USER INFO */}
        <div className="flex flex-row items-center w-full border-b-2 border-highlight-high p-2 font-bold">
          <RussianRubleIcon /> {data?.user.money} чубриков
        </div>
        {/* TABS */}
        <div className="flex flex-col gap-2 p-2">
          {profileTabs.map((tab) => (
            <Button
              key={tab.value}
              className="min-w-40 w-40 max-w-4- disabled:bg-text/20 disabled:text-primary disabled:opacity-85"
              onClick={() => {
                setProfileTab(tab.value as ProfileTab);
              }}
              disabled={profileTab === tab.value}
              hidden={tab.disabled && data?.user.id === user?.id}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}
export default memo(ProfileTab);
