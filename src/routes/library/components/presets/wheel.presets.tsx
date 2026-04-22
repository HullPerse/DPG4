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
import { useDataStore } from "@/store/data.store";
import { openUrl } from "@tauri-apps/plugin-opener";
import { openWindow } from "@/lib/utils";
const gameApi = new GameApi();
const STEAM_PRESET_ID = "steamPreset";

export default function PresetsWheel({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  const accessToken = useDataStore((state) => state.accessToken);

  const isSteamPreset = id === STEAM_PRESET_ID;
  const listRef = useRef<HTMLDivElement>(null);

  const [hiddenGames, setHiddenGames] = useState<string[]>([]);
  const [result, setResult] = useState<GameData | null>(null);

  const [time, setTime] = useState<string | null>(null);
  const [input, setInput] = useState({
    enabled: false,
    id: "",
    type: "",
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["presetWheel", id],
    queryFn: async (): Promise<Preset> => {
      if (isSteamPreset) {
        const steamId = await gameApi.resolveVanityUrl(String(user?.steam));

        let games: GameData[] = [];

        if (accessToken) {
          games = (await gameApi.getSteamFamily(
            steamId,
            accessToken,
          )) as GameData[];
        } else {
          games = (await gameApi.getSteamLibrary(steamId)) as GameData[];
        }

        return {
          id: STEAM_PRESET_ID,
          label: "Библиотека STEAM",
          games: games,
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

  const handleAddGame = async (id: number, type: "list" | "result") => {
    if (!time && isSteamPreset) {
      return setInput({
        enabled: true,
        id: String(id),
        type: type,
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
      } as GameData,
      created: new Date().toISOString(),
    };

    return await gameApi.addGame(gameData).then(() => {
      queryClient.invalidateQueries({ queryKey: ["libraryGames"] });
      setInput({ enabled: false, id: "", type: "" });
      setTime(null);
    });
  };

  const visibleGames =
    data?.games.filter((game) => !hiddenGames.includes(String(game.id))) ?? [];

  return (
    <main className="flex flex-col gap-2 w-full h-full">
      {/* WHEEL */}
      <section className="flex flex-col w-full gap-2 p-2 items-center justify-center">
        <Wheel
          key={hiddenGames.join(",")}
          list={visibleGames.map((game) => ({
            id: String(game.id),
            label: game.name,
            image: game.capsuleImage ?? "https://placehold.co/16x10",
            type: "image",
          }))}
          onResult={(item) => {
            return setResult(
              data?.games.find(
                (game) => Number(game.id) === Number(item?.id),
              ) as GameData,
            );
          }}
          free
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
              <span
                className={`font-bold truncate line-clamp-1 hover:cursor-pointer hover:underline`}
                onContextMenu={(e) => {
                  e.preventDefault();
                  const link = `https://store.steampowered.com/app/${result.id}`;
                  if (!link) return;

                  openUrl(link);
                }}
                onClick={() => {
                  const link = `https://store.steampowered.com/app/${result.id}`;

                  if (!link) return;

                  openWindow(
                    `steam-${result.id}`,
                    link,
                    `Страница ${String(result.name)}`,
                  );
                }}
              >
                {result?.name}[{result?.time ?? "?"} ч.]
              </span>
            </section>

            {/* BUTTONS */}
            <section className="flex flex-row items-center gap-1">
              {input.enabled &&
                input.type === "result" &&
                input.id === String(result?.id) && (
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
                onClick={() => handleAddGame(result.id, "result")}
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
        style={{
          scrollBehavior: "smooth",
          willChange: "transform",
        }}
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
                  {item?.name}[{item?.time ?? "?"} ч.]
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
                {input.enabled &&
                  input.type === "list" &&
                  input.id === String(item?.id) && (
                    <Input
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
                  onClick={() => handleAddGame(item.id, "list")}
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
