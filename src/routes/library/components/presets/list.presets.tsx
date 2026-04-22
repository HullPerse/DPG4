import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { GameData, GameStatus, Preset } from "@/types/games";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NetworkIcon, Plus, Trash } from "lucide-react";
import { startTransition, useCallback, useMemo, useRef, useState } from "react";
import GameApi from "@/api/games.api";
import Image from "@/components/shared/image.component";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import { highlightText, openWindow } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/input.component";
import { useDataStore } from "@/store/data.store";
import { openUrl } from "@tauri-apps/plugin-opener";

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
  const accessToken = useDataStore((state) => state.accessToken);

  const listRef = useRef<HTMLDivElement>(null);
  const isSteamPreset = id === STEAM_PRESET_ID;

  const [time, setTime] = useState<string | null>(null);
  const [input, setInput] = useState({
    enabled: false,
    id: "",
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["presetGame", id],
    queryFn: async (): Promise<Preset> => {
      if (isSteamPreset) {
        const steamId = await gameApi.resolveVanityUrl(String(user?.steam));
        let games: GameData[] = [];

        if (accessToken) {
          games = await gameApi.getSteamFamily(steamId, accessToken);
        } else {
          games = await gameApi.getSteamLibrary(steamId);
        }

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
    return data.games
      .filter(
        (item) =>
          !searchTerms ||
          item.name.toUpperCase().includes(searchTerms.toUpperCase()) ||
          item.id.toString().includes(searchTerms),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.games, searchTerms]);

  const virtualizer = useVirtualizer({
    count: filteredGames.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 96,
    overscan: 10,
    gap: 8,
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
    if (!time && isSteamPreset) {
      return setInput({
        enabled: true,
        id: String(id),
      });
    }

    const game = data?.games.find((game) => game.id === id);
    if (!game) return;

    const gameData = {
      user: {
        id: String(user?.id),
        username: String(user?.username),
      },
      playtime: {
        hltb: Number(time ?? 1),
      },
      status: "PLAYING" as GameStatus,
      data: {
        id: game.id,
        name: game.name,
        image: game.capsuleImage,
        capsuleImage: game.image,
        backgroundImage: game.backgroundImage,
        steamLink: `https://store.steampowered.com/app/${game.id}`,
        websiteLink: game.websiteLink ?? "",
      },
      created: new Date().toISOString(),
    };

    return await gameApi
      .addGame(gameData)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["libraryGames"] });
      })
      .then(() => {
        setInput({ enabled: false, id: "" });
        setTime(null);
      });
  };

  return (
    <main
      className="relative flex flex-col gap-2 p-2 w-full overflow-y-auto pb-10"
      ref={listRef}
      style={{
        scrollBehavior: "smooth",
        willChange: "transform",
      }}
    >
      <label className="text-2xl underline font-bold">
        Пресет: [{data?.label}] - {data?.games?.length ?? 0} игр
      </label>
      {virtualItems.map((virtualItem) => {
        const item = filteredGames[virtualItem.index];

        return (
          <div
            key={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              transform: `translateY(${virtualItem.start}px)`,
              width: "99%",
            }}
            data-index={virtualItem.index}
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
              <span
                className={`font-bold truncate line-clamp-1 ${item.steamLink ? "hover:cursor-pointer hover:underline" : ""}`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!item.steamLink) return;

                  openUrl(item.steamLink);
                }}
                onClick={() => {
                  if (!item.steamLink) return;

                  openWindow(
                    `steam-${item.id}`,
                    item.steamLink,
                    `Страница ${String(item.name)}`,
                  );
                }}
              >
                {highlightText(String(item?.name), searchTerms)} [
                {item?.time ?? "?"} ч.]
              </span>
            </section>

            {/* BUTTONS */}
            <section className="flex flex-row items-center gap-1">
              {input.enabled && input.id === String(item?.id) && (
                <Input
                  autoFocus
                  type="text"
                  placeholder="Введите время"
                  value={time ?? ""}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-9 w-36 ml-2 shadow-sharp-sm"
                />
              )}
              <Button
                title="Добавить в библиотеку"
                variant="success"
                size="icon"
                onClick={async () => await handleAddGame(Number(item?.id))}
                disabled={
                  input.enabled && input.id === String(item?.id) && !time
                }
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
        );
      })}
    </main>
  );
}

export default PresetSettings;
