import Image from "@/components/shared/image.component";
import { Game, GameReview, GameStatus } from "@/types/games";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  memo,
  RefObject,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { WindowError } from "@/components/shared/error.component";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import {
  Calendar,
  ExternalLink,
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
import { useSubscription } from "@/hooks/subscription.hook";
import { calculateScore, getStatusColor } from "@/lib/utils";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useClickAway } from "@uidotdev/usehooks";
import { VariantProps } from "class-variance-authority";

import GameApi from "@/api/games.api";
import UserApi from "@/api/user.api";
import CellApi from "@/api/cell.api";

import ReviewComponent from "@/components/shared/review.component";
import EditReview from "./edit.library";
import { image } from "@/api/client.api";
import { User } from "@/types/user";
import { useUserStore } from "@/store/user.store";

const gameApi = new GameApi();
const userApi = new UserApi();
const cellApi = new CellApi();

function GameLibrary({
  id,
  switchGame,
}: {
  id: string;
  switchGame: () => void;
}) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [content, setContent] = useState<"general" | "review">("general");
  const [loading, setLoading] = useState<
    { button: GameStatus; loading: boolean }[]
  >(gameButtons.map((item) => ({ button: item.value, loading: false })));
  const [time, setTime] = useState<string | null>(null);
  const [input, setInput] = useState(false);

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
    queryFn: async (): Promise<{ game: Game; user: User }> => {
      const game = await gameApi.getGameInfo(id);
      const user = await userApi.getUserById(String(game.user.id));

      return { game, user };
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["gameInstance", id],
        refetchType: "all",
      });
    });
  }, [queryClient, id]);

  useSubscription("games", "*", invalidateQuery);

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
          image={
            data?.game?.image
              ? `${image.game}${data?.game?.id}/${data?.game?.image}`
              : null
          }
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

  const changeStatus = useCallback(
    async (status: GameStatus) => {
      if (status === "COMPLETED" && !time) return setInput(true);

      if (!data?.game) return;

      setLoading((prev) =>
        prev.map((l) => (l.button === status ? { ...l, loading: true } : l)),
      );

      try {
        const score =
          status === "COMPLETED"
            ? calculateScore(Number(time), data.game.playtime.hltb)
            : data.game.score;

        await gameApi.changeStatus(
          id,
          data.game,
          status,
          Number(time),
          Number(score),
        );

        if (status === "DROPPED") {
          await userApi.changeUserAction(
            String(data.game.user.id),
            "MOVE_NEGATIVE",
          );
          await userApi.changeUserDice(
            data.game.user.id,
            Number(time ?? 0),
            "MOVE_NEGATIVE",
          );
        }

        if (status === "COMPLETED") {
          await userApi.scoreUser(String(data.game.user.id), Number(score));
          await userApi.changeUserAction(
            String(data.game.user.id),
            "MOVE_POSITIVE",
          );
          await userApi.changeUserDice(
            data.game.user.id,
            Number(time),
            "MOVE_POSITIVE",
          );
          await cellApi.captureCell(
            String(data.game.user.id),
            String(data.game.user.username),
            data.user.position,
          );

          if (data.user.position === 101) {
            await userApi.updatePlace(String(data.game.user.id));
          }
        }

        setInput(false);
        setTime(null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading((prev) =>
          prev.map((l) => (l.button === status ? { ...l, loading: false } : l)),
        );
        invalidateQuery();
      }
    },
    [data, id, time, invalidateQuery, user],
  );

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при загрузке игры")}
        icon={<NetworkIcon />}
      />
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
              placeholder="Введите время"
              value={time ?? ""}
              onChange={(e) => setTime(e.target.value)}
              className="h-9 w-36 ml-2 shadow-sharp-sm"
              disabled={loading.some((l) => l.loading)}
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
                onClick={() => changeStatus(item.value)}
                disabled={
                  (data?.game && data?.game.status === item.value) ||
                  loading.some((l) => l.loading) ||
                  (item.value === "COMPLETED" && input && !time)
                }
              >
                {loading.find((l) => l.button === item.value)?.loading ? (
                  <SmallLoader />
                ) : (
                  item.icon
                )}
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
            onClick={async () => {
              await gameApi.removeGame(id);
              switchGame();
            }}
          >
            <Trash />
          </Button>
        </div>
        <div className="relative flex w-full h-12 border-y-2 border-highlight-high bg-background">
          {/* VERTICAL IMAGE */}
          <div className="absolute bottom-4.5 left-2 h-52 w-36 overflow-hidden rounded border-2 border-highlight-high bg-background shadow-sharp-sm">
            <Image
              src={
                data?.game?.data.image ??
                (data?.game.data.capsuleImage as string)
              }
              alt="game background"
              className="h-full w-full"
            />
            <div
              className="absolute top-8 left-14 h-5 w-full rotate-45 border-2 border-highlight-high"
              style={{
                backgroundColor: getStatusColor(
                  data?.game?.status ?? "PLAYING",
                ),
                boxShadow: "-4px 2px 10px 4px rgba(0, 0, 0, 0.67)",
              }}
            />
          </div>

          {/* GAME DATA */}
          <div className="flex flex-row gap-2 ml-40 w-full items-center justify-between font-bold">
            {/* DATA */}
            <section className="flex flex-row gap-2 w-full">
              {/* USER TIME */}
              {data?.game?.playtime.user != null &&
                Number(data?.game.playtime.user) > 0 && (
                  <div
                    className="flex flex-row gap-1 border p-1 w-fit min-w-14 items-center justify-between border-highlight-high opacity-75"
                    title="Время Игрока"
                  >
                    <UserStar /> <span>{data?.game?.playtime.user} ч.</span>
                  </div>
                )}

              {/* HLTB TIME */}
              {data?.game?.playtime.hltb && (
                <div
                  className="flex flex-row gap-1 border p-1 w-fit min-w-14 items-center justify-between border-highlight-high opacity-75"
                  title="Время HLTB"
                >
                  <Timer /> <span>{data?.game.playtime.hltb} ч.</span>
                </div>
              )}
              {/* SCORE */}
              {data?.game?.score && (
                <div
                  className="flex flex-row gap-1 border p-1 w-fit min-w-14 items-center justify-between border-highlight-high opacity-75"
                  title="Чубрики"
                >
                  <RussianRuble />
                  <span>{data?.game.score}</span>
                </div>
              )}

              {data?.game.created && (
                <div
                  className="flex flex-row gap-1 border p-1 w-fit min-w-14 items-center justify-between border-highlight-high opacity-75"
                  title="Дата добавления"
                >
                  <Calendar />
                  <span>
                    {new Date(data?.game.created).toLocaleDateString()}
                  </span>
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
                  onClick={() => openUrl(data?.game?.data.websiteLink)}
                >
                  <ExternalLink />
                </Button>
              )}
              {data?.game?.data.steamLink && (
                <Button
                  variant="ghost"
                  title="Перейти в Steam"
                  className="items-center justify-center w-10 h-10 border rounded self-center"
                  onClick={() => openUrl(data?.game?.data.steamLink)}
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
      </section>
    </main>
  );
}

export default memo(GameLibrary);
