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
    <main className="flex flex-col w-full h-full">
      <section className="flex flex-col w-full">
        <div className="relative flex flex-col w-full object-cover overflow-hidden">
          <Image
            src={game?.data.backgroundImage ?? ""}
            alt="game background"
            className="h-64 blur-xs brightness-75"
          />

          <div className="absolute flex flex-row right-2 top-2 gap-1">
            <Button
              variant="link"
              size="icon"
              title="Параметры игры"
              className="text-text border opacity-100"
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
              className="text-text border opacity-100"
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
              className="text-text border opacity-100"
              style={{
                boxShadow: "0px 4px 4px 2px rgba(0, 0, 0, 0.3)",
              }}
              onClick={async () => await gameApi.removeGame(id)}
            >
              <Trash />
            </Button>
          </div>
          <div className="relative flex flex-row h-12 w-full border-y-2 border-highlight-high bg-background items-center">
            <div className="absolute left-2 bottom-4.5 bg-background w-36 h-52 border-2 rounded border-highlight-high overflow-hidden">
              <Image
                src={game?.data.image ?? ""}
                alt="game background"
                className="w-full h-full"
              />
              <div
                className="absolute top-8 left-14 rotate-45 w-full h-5 border-2 border-highlight-high"
                style={{
                  backgroundColor: getStatusColor(game?.status ?? "PLAYING"),
                  boxShadow: "-4px 2px 10px 4px rgba(0, 0, 0, 0.67)",
                }}
              />
            </div>
          </div>
        </div>
      </section>
      <section className="relative flex flex-col w-full h-full p-2">
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
