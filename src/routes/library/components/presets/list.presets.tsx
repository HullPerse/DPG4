import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { GameStatus, Preset } from "@/types/games";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon, Plus, Trash } from "lucide-react";
import { startTransition, useCallback, useMemo, useRef } from "react";
import GameApi from "@/api/games.api";
import Image from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import { highlightText } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";

const gameApi = new GameApi();
const STEAM_PRESET_ID = "steamPreset";

function PresetSettings({
  id,
  searchTerms,
}: {
  id: string;
  searchTerms: string;
}) {
  const queryClient = useQueryClient();
  const isAdmin = useUserStore((state) => state.isAdmin);
  const user = useUserStore((state) => state.user);

  const listRef = useRef<HTMLDivElement>(null);
  const isSteamPreset = id === STEAM_PRESET_ID;



  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["presetGame", id],
    queryFn: async (): Promise<Preset> => {
      if (isSteamPreset) {
        const steamId = await gameApi.resolveVanityUrl(String(user?.steam));
        const games = await gameApi.getSteamLibrary(steamId);

        return {
          id: STEAM_PRESET_ID,
          label: "Библиотека STEAM",
          games,
        };
      }
      return await gameApi.getPresetById(id);
    },
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


  const filteredGames = useMemo(() => {
    if (!data?.games) return [];
    return data.games.filter(item =>
      !searchTerms ||
      item.name.toUpperCase().includes(searchTerms.toUpperCase()) ||
      item.id.toString().includes(searchTerms)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.games, searchTerms]);


  const virtualizer = useVirtualizer({
    count: filteredGames.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 96,
    overscan: 10,
    gap: 8

  });

  const virtualItems = virtualizer.getVirtualItems();

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
      created: new Date().toISOString(),
    };

    return await gameApi.addGame(gameData).then(() => {
      queryClient.invalidateQueries({ queryKey: ["libraryGames"] });
    });
  };


  return (
    <main ref={listRef}
      className="relative flex flex-col gap-2 p-2 w-full overflow-y-auto "
      style={{
        scrollBehavior: "smooth",
        willChange: "transform",
    }}>
      <label className="text-2xl underline font-bold">
        Пресет: [{data?.label}] - {data?.games?.length ?? 0} игр
      </label>

      {virtualItems.map((virtualItem) => {
        const item = filteredGames[virtualItem.index];

        return (
          <div
            key={virtualItem.index}
            style={{
              position: "absolute",
              transform: `translateY(${virtualItem.start}px)`,
              width: "99%",
            }}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            className="flex flex-row min-h-24 h-24 border-2 border-highlight-high p-2 items-center justify-between bg-card shadow-sharp-sm"
          >
            {/* LABEL */}
            <section className="flex flex-row w-full h-full items-center gap-2">
              <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden">
                <Image
                  src={item?.capsuleImage ?? "https://placehold.co/16x10"}
                  alt={String(item?.name)}
                />
              </div>
              <span className="font-bold truncate line-clamp-1">
                {highlightText(String(item?.name), searchTerms)} [{item?.time ?? "?"} ч.]
              </span>
            </section>

            {/* BUTTONS */}
            <section className="flex flex-row items-center gap-1">
              <Button
                title="Добавить в библиотеку"
                variant="success"
                size="icon"
                onClick={async () => await handleAddGame(Number(item?.id))}
              >
                <Plus />
              </Button>
              <Button
                title="Удалить игру"
                variant="error"
                size="icon"
                hidden={!isAdmin || isSteamPreset}
                onClick={async () =>
                  await gameApi.removePresetGame(id, Number(item?.id))
                }
              >
                <Trash />
              </Button>
            </section>
          </div>
        )
      })}

    </main>
  );
}

export default PresetSettings;
