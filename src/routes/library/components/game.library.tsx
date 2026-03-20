import { Image } from "@/components/shared/image.component";
import { Game } from "@/types/games";
import { useQuery } from "@tanstack/react-query";
import { memo, useMemo, useState } from "react";

import GameApi from "@/api/games.api";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { NetworkIcon, NotebookPen, Settings, Trash, X } from "lucide-react";

import { getStatusColor } from "@/lib/utils";
import { Button } from "@/components/ui/button.component";
import SettingsLibrary from "./settings.library";
import { EditReview, ReviewLibrary } from "./review.library";
const gameApi = new GameApi();

function GameLibrary({ id }: { id: string }) {
  const [content, setContent] = useState<"general" | "review" | "editGame">(
    "general",
  );

  const {
    data: game,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["game", id],
    queryFn: async (): Promise<Game> => await gameApi.getGameInfo(id),
  });

  const contentComponent = useMemo(() => {
    if (!id) return null;

    const componentMap = {
      editGame: <SettingsLibrary />,
      review: <EditReview />,
      general: <ReviewLibrary id={id} />,
    };

    return componentMap[content as keyof typeof componentMap];
  }, [content, id]);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка при загрузке игры")}
        icon={<NetworkIcon />}
      />
    );

  return (
    <main className="flex h-full w-full flex-col">
      <section className="flex w-full flex-col">
        <div className="relative flex w-full flex-col overflow-hidden object-cover">
          <Image
            src={game?.data.backgroundImage ?? ""}
            alt="game background"
            className="h-64 blur-xs brightness-75"
          />

          <div className="absolute top-2 right-2 flex flex-row gap-1">
            <Button
              variant="link"
              size="icon"
              title="Параметры игры"
              className="border text-text opacity-100"
              style={{
                boxShadow: "0px 4px 4px 2px rgba(0, 0, 0, 0.3)",
              }}
              onClick={() => setContent("editGame")}
              disabled={content === "editGame"}
            >
              <Settings />
            </Button>
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
              onClick={async () => await gameApi.removeGame(id)}
            >
              <Trash />
            </Button>
          </div>
          <div className="relative flex h-12 w-full flex-row items-center border-y-2 border-highlight-high bg-background">
            <div className="absolute bottom-4.5 left-2 h-52 w-36 overflow-hidden rounded border-2 border-highlight-high bg-background">
              <Image
                src={game?.data.image ?? ""}
                alt="game background"
                className="h-full w-full"
              />
              <div
                className="absolute top-8 left-14 h-5 w-full rotate-45 border-2 border-highlight-high"
                style={{
                  backgroundColor: getStatusColor(game?.status ?? "PLAYING"),
                  boxShadow: "-4px 2px 10px 4px rgba(0, 0, 0, 0.67)",
                }}
              />
            </div>
          </div>
        </div>
      </section>
      <section className="relative flex h-full w-full flex-col p-2">
        {content !== "general" && (
          <Button
            variant="ghost"
            size="icon"
            title="Закрыть"
            className="absolute top-1 right-1"
            onClick={() => setContent("general")}
          >
            <X />
          </Button>
        )}
        {contentComponent}
      </section>
    </main>
  );
}

export default memo(GameLibrary);
