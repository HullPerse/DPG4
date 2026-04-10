import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { useSubscription } from "@/hooks/subscription.hook";
import { GameData, GameStatus, Preset } from "@/types/games";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeIcon, EyeOffIcon, NetworkIcon, Plus } from "lucide-react";
import { startTransition, useCallback, useMemo, useRef, useState } from "react";
import Image from "@/components/shared/image.component";

import GameApi from "@/api/games.api";
import { Button } from "@/components/ui/button.component";
import { useUserStore } from "@/store/user.store";
import Wheel from "@/components/shared/wheel.component";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Input } from "@/components/ui/input.component";
const gameApi = new GameApi();
const STEAM_PRESET_ID = "steamPreset";

export default function PresetsWheel({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const isSteamPreset = id === STEAM_PRESET_ID;
  const listRef = useRef<HTMLDivElement>(null);

  const [hiddenGames, setHiddenGames] = useState<string[]>([]);
  const [result, setResult] = useState<GameData | null>(null);

  const [time, setTime] = useState<string | null>(null);
  const [input, setInput] = useState({
    enabled: false,
    id: "",
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["presetWheel", id],
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
        queryKey: ["presetWheel", id],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  useSubscription("presets", "*", invalidateQuery);

  const filteredGames = useMemo(() => {
    if (!data?.games) return [];
    return data.games.sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.games]);

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

  const handleAddGameClick = (gameId: number) => {
    const game = data?.games.find((g) => g.id === gameId);
    if (!game) return;
    handleAddGame(gameId);
  };

  const handleAddGame = async (id: number, playtime?: number) => {
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
        hltb: playtime ?? Number(game?.time ?? 1),
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
        time: Number(time),
      },
      created: new Date().toISOString(),
    };

    return await gameApi.addGame(gameData).then(() => {
      queryClient.invalidateQueries({ queryKey: ["libraryGames"] });
    });
  };

  const visibleGames =
    data?.games.filter((game) => !hiddenGames.includes(String(game.id))) ?? [];

  return (
    <main className="flex flex-col gap-2 w-full h-full" ref={listRef}>
      {/* WHEEL */}
      <section className="flex flex-col w-full gap-2 p-2 items-center justify-center">
        <Wheel
          key={hiddenGames.join(",")}
          list={visibleGames.map((game) => ({
            id: String(game.id),
            label: game.name,
            image: game.capsuleImage ?? "https://placehold.co/16x10",
          }))}
          onResult={(item) => {
            return setResult(
              data?.games.find(
                (game) => Number(game.id) === Number(item?.id),
              ) as GameData,
            );
          }}
        />

        {result && (
          <div
            key={result.id}
            className="flex flex-row w-3xl min-h-24 h-24 border-2 border-highlight-high p-2 items-center justify-between bg-card shadow-sharp-sm"
          >
            {/* LABEL */}
            <section className="flex flex-row w-full h-full items-center gap-2">
              <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden">
                <Image
                  src={result.capsuleImage ?? "https://placehold.co/16x10"}
                  alt={result.name}
                />
              </div>
              <span className="font-bold truncate line-clamp-1">
                {`${result.name} [${result.time ?? 1} ч.]`}
              </span>
            </section>

            {/* BUTTONS */}
            <section className="flex flex-row items-center gap-1">
              <Button
                title="Добавить в библиотеку"
                variant="success"
                size="icon"
                onClick={() =>
                  handleAddGame(result.id).then(() => setResult(null))
                }
              >
                <Plus />
              </Button>
            </section>
          </div>
        )}
      </section>
      {/* LIST */}
      <section
        ref={listRef}
        className="relative flex flex-col w-full h-full border-t-2 border-highlight-high p-2 gap-2 overflow-y-auto"
      >
        {virtualItems.map((virtualItem) => {
          const item = filteredGames[virtualItem.index];

          return (
            <div
              key={virtualItem.index}
              style={{
                position: "absolute",
                transform: `translateY(${virtualItem.start}px)`,
                width: "99%",
                opacity:
                  hiddenGames.find((h) => h === String(item.id)) && "50%",
              }}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="flex flex-row min-h-24 h-24 border-2 border-highlight-high p-2 items-center justify-between bg-card shadow-sharp-sm"
            >
              {/* LABEL */}
              <section className="flex flex-row w-full h-full items-center gap-2">
                <div className="flex h-full w-40 aspect-video border-2 border-highlight-high overflow-hidden">
                  <Image
                    src={item.capsuleImage ?? "https://placehold.co/16x10"}
                    alt={item.name}
                  />
                </div>
                <span className="font-bold truncate line-clamp-1">
                  {item.name} [{item.time ?? 1} ч.]
                </span>
              </section>

              {/* BUTTONS */}
              <section className="flex flex-row items-center gap-1">
                <Button
                  size="icon"
                  onClick={() => {
                    const existingGame =
                      hiddenGames.filter((h) => h === String(item.id)).length >
                      0;

                    if (!existingGame)
                      return setHiddenGames([...hiddenGames, String(item.id)]);

                    return setHiddenGames(
                      hiddenGames.filter((h) => h !== String(item.id)),
                    );
                  }}
                >
                  {hiddenGames.find((h) => h === String(item.id)) ? (
                    <EyeIcon size={20} />
                  ) : (
                    <EyeOffIcon size={20} />
                  )}
                </Button>
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
                  onClick={() => handleAddGameClick(item.id)}
                >
                  <Plus />
                </Button>
              </section>
            </div>
          );
        })}
      </section>
    </main>
  );
}
