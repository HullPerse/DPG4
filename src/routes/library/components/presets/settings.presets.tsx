import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { GameStatus, Preset } from "@/types/games";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon, Plus, Trash } from "lucide-react";
import { startTransition, useCallback } from "react";
import GameApi from "@/api/games.api";
import Image from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";

const gameApi = new GameApi();

function PresetSettings({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const isAdmin = useUserStore((state) => state.isAdmin);
  const user = useUserStore((state) => state.user);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["presetGame", id],
    queryFn: async (): Promise<Preset> => await gameApi.getPresetById(id),
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["presetGame", id],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("presets", "*", invalidateQuery);

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

  const handleAddGame = async (id: number) => {
    const game = data?.games.find((game) => game.id === id);
    if (!game) return;

    const gameData = {
      user: {
        id: String(user?.id),
        username: String(user?.username),
      },
      playtime: {
        hltb: Number(game?.time ?? 1),
      },
      status: "PLAYING" as GameStatus,
      data: {
        id: game.id,
        name: game.name,
        image: game.image,
        capsuleImage: game.capsuleImage,
        backgroundImage: game.backgroundImage,
        steamLink: `https://store.steampowered.com/app/${game.id}`,
        websiteLink: game.websiteLink ?? "",
      },
    };

    return await gameApi.addGame(gameData).then(() => {
      queryClient.invalidateQueries({ queryKey: ["libraryGames"] });
    });
  };

  return (
    <main className="flex flex-col gap-2 pt-14 p-2 w-full overflow-y-auto">
      {data?.games &&
        data.games.map((game) => (
          <div
            key={game.id}
            className="flex flex-row w-full min-h-24 h-24 border-2 border-highlight-high p-2 items-center justify-between bg-card shadow-sharp-sm"
          >
            {/* LABEL */}
            <section className="flex flex-row w-full h-full items-center gap-2">
              <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden">
                <Image
                  src={game.capsuleImage ?? "https://placehold.co/16x10"}
                  alt={game.name}
                />
              </div>
              <span className="font-bold truncate line-clamp-1">
                {game.name} [{game.time ?? 1} ч.]
              </span>
            </section>

            {/* BUTTONS */}
            <section className="flex flex-row items-center gap-1">
              <Button
                title="Добавить в библиотеку"
                variant="success"
                size="icon"
                onClick={async () => await handleAddGame(game.id)}
              >
                <Plus />
              </Button>
              <Button
                title="Удалить игру"
                variant="error"
                size="icon"
                hidden={!isAdmin}
                onClick={async () =>
                  await gameApi.removePresetGame(id, game.id)
                }
              >
                <Trash />
              </Button>
            </section>
          </div>
        ))}
    </main>
  );
}

export default PresetSettings;
