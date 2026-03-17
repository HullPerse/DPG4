import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startTransition, useCallback, useState } from "react";
import GameApi from "@/api/games.api";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import {
  Clock,
  Link,
  NetworkIcon,
  RussianRuble,
  Settings,
  Store,
  Trash,
} from "lucide-react";
import { useSubscription } from "@/hooks/subscription.hook";
import { Image } from "@/components/shared/image.component";
import { Game } from "@/types/games";
import { getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button.component";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.component";
import { openUrl } from "@tauri-apps/plugin-opener";
import GameReview from "./review.library";
import GameEdit from "./edit.library";

const gameApi = new GameApi();

export default function GameLibrary({ id }: { id: string }) {
  const queryClient = useQueryClient();

  const [isOpen, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["game", id],
    queryFn: async (): Promise<Game> => {
      return await gameApi.getGameInfo(id);
    },
    refetchOnMount: true,
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["game", id],
        refetchType: "all",
      });
    });
  }, [queryClient, id]);

  useSubscription("games", "*", invalidateQuery);

  if (isLoading || !data) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  const { data: gameData, status, playtime, score, user } = data;

  return (
    <main className="relative flex flex-col w-full h-full">
      <Dialog open={isOpen} onOpenChange={setOpen}>
        <DialogContent className="flex flex-col gap-2 min-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Удалить игру?
            </DialogTitle>
          </DialogHeader>
          <section className="flex flex-row gap-2">
            <Button
              onClick={() => setOpen(false)}
              variant="default"
              className="w-1/2"
            >
              Отмена
            </Button>
            <Button
              onClick={async () => {
                try {
                  await gameApi.deleteGame(id);
                } catch (e) {
                  return console.error(e);
                } finally {
                  invalidateQuery();
                  setOpen(false);
                }
              }}
              variant="error"
              className="w-1/2"
            >
              Удалить
            </Button>
          </section>
        </DialogContent>
      </Dialog>
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="flex flex-col gap-2 min-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Редактировать игру
            </DialogTitle>
          </DialogHeader>
          <section className="flex flex-row gap-2">
            <GameEdit game={gameData} onClose={() => setOpenEdit(false)} />
          </section>
        </DialogContent>
      </Dialog>

      <section className="relative h-52 min-h-52 w-full border-b border-highlight-high overflow-hidden">
        <Image
          src={gameData.backgroundImage || gameData.image}
          alt="game background"
          className="w-full h-full"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-transparent backdrop-blur-xs pointer-events-none" />
      </section>

      <section className="flex flex-row bg-highlight-low border-b border-highlight-high h-16 items-center justify-between px-2">
        <div className="relative flex items-center gap-3">
          <div className="relative -top-22 h-52 w-36  bg-card rounded border border-highlight-high overflow-hidden">
            <Image
              src={gameData.image}
              alt="game capsule"
              className="w-full h-full"
              loading="lazy"
            />
            <span
              className="absolute top-5 left-10 w-full flex items-center justify-center font-bold text-black border-y-2 border-highlight-high rotate-45 h-6 drop-shadow-[2px_2px_10px_black]"
              style={{ backgroundColor: getStatusColor(status) }}
            />
          </div>

          <div className="flex flex-row gap-4 opacity-65">
            <div className="flex flex-row items-center gap-2 min-w-fit max-w-64 line-clamp-1">
              <Clock className="w-4 h-4" />
              <div className="flex flex-col">
                <span>Время:</span>
                <span>
                  {playtime.user && <span>{playtime.user} ч. / </span>}
                  {playtime.hltb} ч.
                </span>
              </div>
            </div>
            {score && Number(score) > 0 && (
              <div className="flex flex-row items-center gap-2 min-w-fit max-w-64 line-clamp-1">
                <RussianRuble className="w-4 h-4" />
                <div className="flex flex-col">
                  <span>Чубрики:</span>
                  <span>{score} чубриков </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="absolute top-2 right-2 flex flex-row gap-2">
          {data.data.steamLink && (
            <Button
              size="icon"
              variant="ghost"
              className="border buttonShadow"
              onClick={() => openUrl(data.data.steamLink)}
            >
              <Store />
            </Button>
          )}
          {data.data.websiteLink && (
            <Button
              size="icon"
              variant="ghost"
              className="border buttonShadow"
              onClick={() => openUrl(data.data.websiteLink)}
            >
              <Link />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="border buttonShadow">
            <Settings />
          </Button>
          <Button
            size="icon"
            variant="error"
            className="border buttonShadow"
            onClick={() => setOpen(true)}
          >
            <Trash />
          </Button>
        </div>
      </section>
      <section className="p-2 overflow-auto">
        {!data.review ? (
          <span className="flex flex-col text-center font-bold text-2xl">
            Здесь будет ваш отзыв
          </span>
        ) : (
          <GameReview
            id={id}
            author={user.id}
            review={data.review}
            image={data.image}
            votes={data.review.votes}
          />
        )}
      </section>
    </main>
  );
}
