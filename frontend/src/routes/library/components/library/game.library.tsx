import Image from "@/components/shared/image.component";
import { Game, GameReview, GameStatus } from "@/types/games";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { memo, RefObject, startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import {
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  NetworkIcon,
  NotebookPen,
  RussianRuble,
  Timer,
  Trash,
  UserStar,
} from "lucide-react";
import SteamSvg from "@/components/svg/steam.component";
import { Button, buttonVariants } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import { gameButtons } from "@/config/library.config";
import { useSubscription } from "@/hooks/index.hook";
import { calculateScore, checkImage, getStatusColor, openWindow } from "@/lib/index.utils";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useClickAway } from "@uidotdev/usehooks";
import { VariantProps } from "class-variance-authority";

import GameApi from "@/api/games.api";
import UserApi from "@/api/user.api";
import CellApi from "@/api/cell.api";

import ReviewComponent from "@/components/shared/review.component";
import EditReview from "./edit.library";
import { getFileUrl } from "@/api/client.api";
import { User } from "@/types/user";
import ImageViewer from "@/components/shared/viewer.component";
import { useDataStore } from "@/store/data.store";
import { unbanDice } from "@/api/gambling.api";

const gameApi = new GameApi();
const userApi = new UserApi();
const cellApi = new CellApi();

function GameLibrary({ id, switchGame }: { id: string; switchGame: () => void }) {
  const queryClient = useQueryClient();
  const setGamblingBanned = useDataStore((state) => state.setGamblingBanned);
  const setStoreItems = useDataStore((state) => state.setStoreItems);
  const setRerollPrice = useDataStore((state) => state.setRerollPrice);
  const noAction = useDataStore((state) => state.noAction);

  const [content, setContent] = useState<"general" | "review">("general");
  const [time, setTime] = useState<string | null>(null);
  const [input, setInput] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [websiteExists, setWebsiteExists] = useState(false);

  const clickAwayRef = useClickAway((e: Event) => {
    const target = e.target as HTMLElement;

    const inputElement = target.closest('[data-time-input="true"]');
    if (inputElement) return;

    const otherButtons = target.closest('[data-status-button="true"]');

    if (!otherButtons && input) {
      setInput(false);
      setTime(null);
    }
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["gameInstance", id],
    queryFn: async (): Promise<{
      game: Game;
      user: User;
      achievements: {
        gameName: string;
        achievements: {
          apiname: string;
          achieved: number;
          unlocktime: number;
          name: string;
          description: string;
        }[];
      } | null;
    }> => {
      const game = await gameApi.getGameInfo(id);
      const user = await userApi.getUserById(String(game.user.id));

      const steamId = await gameApi.resolveVanityUrl(user.steam);
      const appId = game?.data.steamLink.match(/\/app\/(\d+)/)?.[1];

      let achievements = null;

      if (!appId) achievements = null;
      else achievements = await gameApi.getSteamAchievements(appId, steamId);

      return { game, user, achievements };
    },
    staleTime: 0,
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["gameInstance", id],
        refetchType: "active",
      });
    });
  }, [queryClient, id]);

  useSubscription("games", invalidateQuery);

  useEffect(() => {
    if (id) {
      setContent("general");
    }
  }, [id]);

  const contentComponent = useMemo(() => {
    if (!id) return null;

    const componentMap = {
      review: <EditReview id={id} setContent={setContent} />,
      general: (
        <ReviewComponent
          id={id}
          title={data?.game.data.name as string}
          review={data?.game?.review as GameReview}
          image={getFileUrl(data?.game)}
          user={data?.user as User}
        />
      ),
    };

    return componentMap[content as keyof typeof componentMap];
  }, [content, id, data]);

  const buttonStyle = (
    buttonStatus: GameStatus,
  ): VariantProps<typeof buttonVariants>["variant"] => {
    if (!buttonStatus) return null;

    const styleMap = {
      PLAYING: "warning",
      COMPLETED: "success",
      DROPPED: "error",
      REROLLED: "info",
    } as {
      [key in GameStatus]?: VariantProps<typeof buttonVariants>["variant"];
    };

    return styleMap[buttonStatus];
  };

  const removeMutation = useMutation({
    mutationFn: () => gameApi.removeGame(id),
    onSuccess: () => switchGame(),
  });

  const statusMutation = useMutation({
    mutationFn: async (status: GameStatus) => {
      if (!data?.game) return;

      const score =
        status === "COMPLETED"
          ? await calculateScore(Number(time), data.game.playtime.hltb)
          : data.game.score;

      await gameApi.changeStatus(id, data.game, status, Number(time), Number(score));

      if (status === "DROPPED") {
        await userApi.changeUserAction(String(data.game.user.id), "MOVE_NEGATIVE", noAction);
        await userApi.changeUserDice(data.game.user.id, Number(time ?? 0), "MOVE_NEGATIVE");
      }

      if (status === "COMPLETED") {
        await userApi.scoreUser(String(data.game.user.id), Number(score));
        await userApi.changeUserAction(String(data.game.user.id), "MOVE_POSITIVE", noAction);
        await userApi.changeUserDice(data.game.user.id, Number(time), "MOVE_POSITIVE");
        await cellApi.captureCell(
          String(data.game.user.id),
          String(data.game.user.username),
          data.user.position,
        );

        if (data.user.status?.includes("poop")) {
          await userApi.changeUserStatus(String(data.user.id), "poop", "remove");
        }

        if (data.user.position === 101) {
          await userApi.updatePlace(String(data.game.user.id));
        }

        await userApi.changeHangman(String(data.game.user.id), false);

        setStoreItems([]);
        setRerollPrice(2);

        await unbanDice();
        setGamblingBanned(false);
      }
    },
    onSuccess: () => {
      setInput(false);
      setTime(null);
      invalidateQuery();
    },
    onError: (e) => console.error(e),
  });

  const changeStatus = useCallback(
    (status: GameStatus) => {
      if (status === "COMPLETED" && !time) return setInput(true);
      if (!data?.game) return;
      statusMutation.mutate(status);
    },
    [data, time, statusMutation],
  );

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!data?.game?.data.websiteLink) {
        if (!cancelled) setWebsiteExists(false);
        return;
      }

      const ok = await checkImage(`${data.game.data.websiteLink}/favicon.ico`);
      if (!cancelled) setWebsiteExists(ok);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [data?.game?.data.websiteLink]);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError error={new Error("Произошла ошибка при загрузке игры")} icon={<NetworkIcon />} />
    );

  return (
    <main className="relative flex flex-col w-full h-full">
      {/* HEADER */}
      <section className="relative">
        <Image
          src={data?.game.data.backgroundImage ?? ""}
          alt="game background"
          className="h-64 brightness-75"
        />

        {/* STATUS BUTTONS */}
        <div
          className="absolute top-8 flex flex-row gap-2 items-center justify-center"
          style={{
            left: input ? "0px" : "16px",
          }}
          ref={clickAwayRef as RefObject<HTMLDivElement>}
        >
          {input && (
            <Input
              autoFocus
              data-time-input="true"
              type="text"
              min={0}
              max={1000}
              placeholder="Введите время"
              value={time ?? ""}
              onChange={(e) => setTime(e.target.value)}
              className="h-9 w-36 ml-2 shadow-sharp-sm"
              disabled={statusMutation.isPending}
            />
          )}

          {gameButtons
            .filter((item) => item.value !== data?.game?.status)
            .sort((a, b) => Number(a.priority) - Number(b.priority))
            .map((item) => (
              <Button
                key={item.value}
                data-status-button="true"
                title={item.description}
                size="icon"
                variant={buttonStyle(item.value)}
                className="border-2 shadow-sharp-sm font-bold"
                loading={statusMutation.isPending && statusMutation.variables === item.value}
                disabled={
                  (data?.game && data?.game.status === item.value) ||
                  (item.value === "COMPLETED" && input && !time)
                }
                onClick={() => changeStatus(item.value)}
              >
                {item.icon}
              </Button>
            ))}
        </div>
        {/* GAME BUTTONS */}
        <div className="absolute top-2 right-2 flex flex-row gap-2 items-center justify-center">
          <Button
            variant="link"
            size="icon"
            title="Отзыв"
            className="border text-text opacity-100"
            style={{
              boxShadow: "0px 4px 4px 2px rgba(0, 0, 0, 0.3)",
            }}
            onClick={() => setContent("review")}
            disabled={content === "review"}
          >
            <NotebookPen />
          </Button>
          <Button
            variant="error"
            size="icon"
            title="Удалить"
            className="border text-text opacity-100"
            style={{
              boxShadow: "0px 4px 4px 2px rgba(0, 0, 0, 0.3)",
            }}
            onClick={() => removeMutation.mutate()}
          >
            <Trash />
          </Button>
        </div>
        <div className="relative flex w-full h-12 border-y-2 border-highlight-high bg-background">
          {/* VERTICAL IMAGE */}
          <div className="absolute bottom-4.5 left-2 h-52 w-36 overflow-hidden rounded border-2 border-highlight-high bg-background shadow-sharp-sm">
            <ImageViewer
              src={[
                data?.game?.data.verticalImage ??
                  data?.game?.data.image ??
                  (data?.game.data.capsuleImage as string),
              ]}
              zoomable
              draggable
              trigger={
                <Image
                  role="button"
                  src={
                    data?.game?.data.verticalImage ??
                    data?.game?.data.image ??
                    (data?.game.data.capsuleImage as string)
                  }
                  alt="game background"
                  className="h-full w-full hover:cursor-pointer opacity-85 hover:opacity-100"
                />
              }
            />

            <div
              className="absolute top-8 left-14 h-5 w-full rotate-45 border-2 border-highlight-high pointer-events-none"
              style={{
                backgroundColor: getStatusColor(data?.game?.status ?? "PLAYING"),
                boxShadow: "-4px 2px 10px 4px rgba(0, 0, 0, 0.67)",
              }}
            />
          </div>

          {/* GAME DATA */}
          <div className="flex flex-row gap-2 ml-40 w-full items-center justify-between font-bold">
            {/* DATA */}
            <section className="flex flex-row gap-2 w-full">
              {/* USER TIME */}
              {data?.game?.playtime.user != null && Number(data?.game.playtime.user) > 0 && (
                <div
                  className="flex flex-row gap-1 border p-1 w-fit items-center justify-between border-highlight-high opacity-75 text-sm"
                  title="Время Игрока"
                >
                  <UserStar className="size-4" /> <span>{data?.game?.playtime.user} ч.</span>
                </div>
              )}

              {/* HLTB TIME */}

              {data?.game?.playtime.hltb != null && Number(data?.game?.playtime.hltb) > 0 && (
                <div
                  className="flex flex-row gap-1 border p-1 w-fit min-w-14 items-center justify-between border-highlight-high opacity-75 text-sm"
                  title="Время HLTB"
                >
                  <Timer className="size-4" /> <span>{data?.game.playtime.hltb} ч.</span>
                </div>
              )}
              {/* SCORE */}

              {data?.game?.playtime.user != null &&
                Number(data?.game.playtime.user) > 0 &&
                data?.game.score != null &&
                Number(data?.game.score) > 0 && (
                  <div
                    className="flex flex-row gap-1 border p-1 w-fit min-w-14 items-center justify-between border-highlight-high opacity-75 text-sm"
                    title="Чубрики"
                  >
                    <RussianRuble className="size-4" /> <span>{data?.game.score}</span>
                  </div>
                )}

              {data?.game.created && (
                <div
                  className="flex flex-row gap-1 border p-1 w-fit min-w-14 items-center justify-between border-highlight-high opacity-75"
                  title="Дата добавления"
                >
                  <Calendar />
                  <span>{new Date(data?.game.created).toLocaleDateString()}</span>
                </div>
              )}
            </section>
            {/* LINKS */}
            <section className="flex flex-row gap-1 px-2">
              {data?.game?.data.websiteLink && (
                <Button
                  variant="ghost"
                  title="Перейти на сайт"
                  className="items-center justify-center w-10 h-10 border rounded self-center"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!data?.game?.data.websiteLink) return;

                    openUrl(data?.game?.data.websiteLink);
                  }}
                  onClick={() => {
                    if (!data?.game?.data.websiteLink) return;

                    openWindow(
                      `website-${data?.game?.data.id}`,
                      data?.game?.data.websiteLink,
                      `Сайт ${String(data?.game?.data.name)}`,
                    );
                  }}
                >
                  {/*<ExternalLink />*/}
                  {data?.game?.data.websiteLink && (
                    <Image
                      src={
                        websiteExists ? `${data?.game?.data.websiteLink}/favicon.ico` : "box.png"
                      }
                      alt={String(data?.game?.data.name)}
                      className="min-w-9 min-h-9 w-9 h-9"
                    />
                  )}
                </Button>
              )}

              {data?.game?.data.steamLink && (
                <Button
                  variant="ghost"
                  title="Перейти в Steam"
                  className="items-center justify-center w-10 h-10 border rounded self-center"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!data?.game?.data.steamLink) return;

                    openUrl(data?.game?.data.steamLink);
                  }}
                  onClick={() => {
                    if (!data?.game?.data.steamLink) return;

                    openWindow(
                      `steam-${data?.game?.data.id}`,
                      data?.game?.data.steamLink,
                      `Страница ${String(data?.game?.data.name)}`,
                    );
                  }}
                >
                  <SteamSvg className="size-6" />
                </Button>
              )}
            </section>
          </div>
        </div>
      </section>
      {/* BODY */}
      <section className="relative flex flex-col h-full w-full p-2 overflow-y-auto">
        {contentComponent}

        {data?.achievements && data.achievements.achievements.length > 0 && (
          <div className="flex flex-col border-t border-highlight-high pt-2">
            <Button>{showAchievements ? <ChevronUp /> : <ChevronDown />}</Button>
          </div>
        )}

        {/*{data?.achievements && data?.achievements.achievements.length > 0 && (
          <div className="mt-2 border-t border-highlight-medium pt-2">
            <Button
              variant="link"
              className="w-full justify-between text-text"
              onClick={() => setShowAchievements(!showAchievements)}
            >
              <span className="flex items-center gap-2">
                <Award className="size-4" />
                Достижения Steam ({data?.achievements.achievements.filter((a) => a.achieved).length}
                /{data?.achievements.achievements.length})
              </span>
              <span>{showAchievements ? "▲" : "▼"}</span>
            </Button>
            {showAchievements && (
              <div className="mt-1 grid grid-cols-2 gap-1">
                {data?.achievements.achievements.map((a) => (
                  <div
                    key={a.apiname}
                    className={`flex flex-col gap-0.5 rounded border p-1.5 text-xs ${a.achieved ? "border-highlight-medium" : "border-highlight-low opacity-50"}`}
                  >
                    <span className="font-bold">{a.name}</span>
                    {a.description && <span className="text-text/60">{a.description}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}*/}
      </section>
    </main>
  );
}

export default memo(GameLibrary);
