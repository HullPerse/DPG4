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
import InventoryTab from "./inventory.tab";
import { Input } from "@/components/ui/input.component";
import TradeTab from "./trade.tab";
import { Activity } from "@/types/activity";
import ActivityApi from "@/api/activity.api";
import { useDataStore } from "@/store/data.store";
import { CreateModal } from "@/components/shared/items.modal";
const userApi = new UserApi();
const gameApi = new GameApi();
const activityApi = new ActivityApi();

function ProfileTab({ id }: { id?: string }) {
  const user = useUserStore((state) => state.user);
  const userProfile = useDataStore((state) => state.userProfile);

  const [addMoney, setAddMoney] = useState<number>(0);
  const [moneyModal, setMoneyModal] = useState<boolean>(false);
  const [moneyDescription, setMoneyDescription] = useState<string>("");

  const [position, setPosition] = useState<number>(0);
  const [positionModal, setPositionModal] = useState<boolean>(false);
  const [positionDescription, setPositionDescription] = useState<string>("");

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
        refetchType: "active",
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
    if (userProfile?.type === "chat")
      return <ChatProfile id={String(data?.user.id)} />;

    const tabMap = {
      profile: (
        <Profile user={data?.user as User} games={data?.games as Game[]} />
      ),
      library: <Games games={data?.games as Game[]} />,
      reviews: <ReviewsProfile id={String(data?.user.id)} />,
      chat: <ChatProfile id={String(data?.user.id)} />,
      trade: <TradeTab id={String(data?.user.id)} />,
      inventory: <InventoryTab id={String(data?.user.id)} />,
    };

    return tabMap[profileTab];
  };

  return (
    <main className="flex w-full h-full">
      {moneyModal && (
        <CreateModal
          label="Добавить чубрики"
          body={() => (
            <main className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-bold">Чубрики</span>
                <Input
                  arrows
                  type="number"
                  placeholder="Изменить чубрики"
                  value={addMoney}
                  onChange={(e) => setAddMoney(Number(e.target.value))}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-bold">Примечание</span>
                <Input
                  arrows
                  type="text"
                  placeholder="Примечание"
                  value={moneyDescription}
                  onChange={(e) => setMoneyDescription(e.target.value)}
                />
              </label>

              <section className="flex flex-row items-center justify-between gap-2 p-1">
                <Button
                  className="flex flex-1"
                  variant="success"
                  onClick={async () => {
                    if (!addMoney || !moneyDescription) return;

                    await userApi.scoreUser(String(data?.user.id), addMoney);

                    const activityData = {
                      author: user?.id,
                      image: user?.avatar,
                      type: "emoji",
                      text: `${user?.username} изменил чубрики на ${addMoney} ${data?.user.username} с примечанием: ${moneyDescription}`,
                    } as Activity;

                    await activityApi.createActivity(activityData);

                    setAddMoney(0);
                    setMoneyDescription("");
                    return setMoneyModal(false);
                  }}
                  disabled={!addMoney || !moneyDescription}
                >
                  Применить
                </Button>
              </section>
            </main>
          )}
          open={!!moneyModal}
          setOpen={(open) => {
            if (!open) setMoneyModal(false);
          }}
        />
      )}
      {positionModal && (
        <CreateModal
          label="Изменить клетку"
          body={() => (
            <main className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="font-bold">Клетка</span>
                <Input
                  arrows
                  type="number"
                  placeholder="Клетка"
                  value={position}
                  onChange={(e) => setPosition(Number(e.target.value))}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-bold">Примечание</span>
                <Input
                  arrows
                  type="text"
                  placeholder="Примечание"
                  value={positionDescription}
                  onChange={(e) => setPositionDescription(e.target.value)}
                />
              </label>

              <section className="flex flex-row items-center justify-between gap-2 p-1">
                <Button
                  className="flex flex-1"
                  variant="success"
                  onClick={async () => {
                    if (!position || !positionDescription) return;

                    await userApi.moveUserAnimated(
                      String(data?.user.id),
                      Number(data?.user.position) + position,
                    );

                    const activityData = {
                      author: user?.id,
                      image: user?.avatar,
                      type: "emoji",
                      text: `${user?.username} передвинул игрока ${data?.user.username} на ${Number(data?.user.position) + position} клетку с примечанием: ${positionDescription}`,
                    } as Activity;

                    await activityApi.createActivity(activityData);

                    setPosition(0);
                    setPositionDescription("");
                    return setPositionModal(false);
                  }}
                  disabled={!position || !positionDescription}
                >
                  Применить
                </Button>
              </section>
            </main>
          )}
          open={!!positionModal}
          setOpen={(open) => {
            if (!open) setPositionModal(false);
          }}
        />
      )}

      <section className="flex-1 overflow-y-auto">{getComponent()}</section>
      <section className="flex flex-col gap-2 items-center border-l-2 h-full  border-highlight-high bg-background">
        {/* USER INFO */}
        <div className="flex flex-col items-center w-full border-b-2 border-highlight-high p-2 font-bold gap-2">
          <span className="flex flex-row w-full">
            <RussianRubleIcon /> {data?.user.money} чубриков
          </span>
          {data?.user.id !== user?.id && (
            <span className="flex flex-row w-full">Ваши: {user?.money}</span>
          )}

          <Button
            variant="success"
            className="w-full h-8"
            onClick={() => setMoneyModal(true)}
          >
            Изменить чубрики
          </Button>

          <Button
            variant="info"
            className="w-full h-8"
            onClick={() => setPositionModal(true)}
          >
            Передвинуть
          </Button>
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
