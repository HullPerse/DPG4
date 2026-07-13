import { Button } from "@/components/ui/button.component";
import { Input } from "@/components/ui/input.component";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.component";
import { calculateScore, getStatusColor } from "@/lib/index.utils";
import { Game, GameStatus } from "@/types/games";
import { Search, Gamepad2, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { gameApi } from "@/api/games.api";
import { userApi } from "@/api/user.api";
import Image from "@/components/shared/image.component";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useUserStore } from "@/store/user.store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDataStore } from "@/store/data.store";



const STATUSES = [
  {
    name: "PLAYING",
    label: "В ПРОЦЕССЕ",
  },
  {
    name: "COMPLETED",
    label: "ПРОЙДЕНО",
  },
  {
    name: "DROPPED",
    label: "ДРОПНУТО",
  },
  {
    name: "REROLLED",
    label: "РЕРОЛЬНУТО",
  },
];

export default function SteamLibrary({
  setCurrentGame,
  currentType,
  presetId,
  existingId,
}: {
  setCurrentGame: (gameId: string) => void;
  currentType: "library" | "preset";
  presetId?: string;
  existingId?: string;
}) {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();
  const noAction = useDataStore((state) => state.noAction);

  const [status, setStatus] = useState("В ПРОЦЕССЕ");
  const [appId, setAppId] = useState(existingId ?? "");
  const [time, setTime] = useState("");
  const [realTime, setRealTime] = useState("");

  const [game, setGame] = useState<any>();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<
    { appid: number; name: string; image: string }[]
  >([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [searchLoading, setSearchLoading] = useState<boolean>(false);

  const [hltbResults, setHltbResults] = useState<
    { title: string; mainStory: number }[]
  >([]);
  const [showHltbDropdown, setShowHltbDropdown] = useState(false);
  const hltbRef = useRef<HTMLDivElement>(null);
  const [hltbLoading, setHltbLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      const results = await gameApi.searchSteam(searchTerm);
      setSearchResults(results);
      setShowResults(results.length > 0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
      if (hltbRef.current && !hltbRef.current.contains(e.target as Node)) {
        setShowHltbDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const gameMutation = useMutation({
    mutationFn: async () => {
      if (!user || !game) throw new Error("Missing data");

      const parsedTime = Number(time);
      const parsedReal = Number(realTime);
      if (isNaN(parsedTime)) throw new Error("Invalid time value");
      const score = await calculateScore(isNaN(parsedReal) ? 0 : parsedReal, parsedTime);
      const gameData = {
        user: {
          id: String(user?.id),
          username: String(user?.username),
        },
        playtime: {
          hltb: parsedTime,
          user: status == "ПРОЙДЕНО" ? (isNaN(parsedReal) ? 0 : parsedReal) : undefined,
        },
        score,
        status: STATUSES.find((s) => s.label === status)?.name as GameStatus,
        data: {
          id: appId,
          name: game.game.name,
          image: game.library_image,
          capsuleImage: game.game.capsule_image,
          backgroundImage: game.library_background,
          verticalImage: `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/library_600x900_2x.jpg`,
          steamLink: `https://store.steampowered.com/app/${appId}`,
          websiteLink: game.game.website ?? "",
          time: currentType === "preset" ? Number(time) : undefined,
        },
        created: new Date().toISOString(),
      } as Game;

      if (currentType === "library") {
        const res = await gameApi.addGame(gameData);
        setCurrentGame(String(res.id));
        await userApi.changeUserAction(String(user.id), "GAMEFINISH", noAction);
        return;
      }

      await gameApi.addPresetGame(String(presetId), gameData);
      queryClient.invalidateQueries({ queryKey: ["presetGame", presetId] });
      setCurrentGame("presetList");
    },
  });

  const handleGame = useCallback(() => {
    gameMutation.mutate();
  }, []);

  return (
    <main className="flex h-full w-full flex-row items-center">
      <section className="flex h-full w-1/2 flex-col gap-2 px-1">
        <div className="relative" ref={searchRef}>
          <Input
            autoFocus
            type="text"
            placeholder="Поиск по названию"
            className="h-12"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowResults(true);
            }}
          />
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-60 overflow-y-auto rounded border border-highlight-medium bg-background shadow-sharp">
              {searchResults.map((r) => (
                <button
                  key={r.appid}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-highlight-low"
                  onClick={() => {
                    setAppId(String(r.appid));
                    setSearchTerm(r.name);
                    setShowResults(false);
                    gameApi.getSteamGame(String(r.appid)).then((res) => {
                      if (res) setGame(res as any);
                    });
                  }}
                >
                  <Gamepad2 className="size-4 shrink-0" />
                  <span className="truncate">{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-row items-center justify-center gap-1">
          <Input
            type="number"
            placeholder="ID игры"
            className="h-12"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          />
          <Button
            className="h-12 w-12"
            loading={searchLoading}
            onClick={async () => {
              setSearchLoading(true);
              try {
                const result = await gameApi.getSteamGame(appId);
                if (result) setGame(result as any);
              } catch (e) {
                console.error("Steam search error:", e);
              } finally {
                setSearchLoading(false);
              }
            }}
          >
            <Search className="h-4 w-4 border-text text-text" />
          </Button>
        </div>
        <div className="leading-tight relative" ref={hltbRef}>
          <span>Время на HLTB</span>
          <Input
            type="number"
            placeholder="hltb"
            className="h-12"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            onFocus={async () => {
              if (!searchTerm || hltbLoading) return;
              setHltbLoading(true);
              const res = await gameApi.searchHltb(searchTerm);
              setHltbResults(res.results);
              setShowHltbDropdown(res.results.length > 0);
              setHltbLoading(false);
            }}
          />
          {showHltbDropdown && hltbResults.length > 0 && (
            <div className="absolute top-full left-0 z-50 mt-1 w-full max-h-48 overflow-y-auto rounded border border-highlight-medium bg-background shadow-sharp">
              {hltbResults.map((r) => (
                <button
                  key={r.title}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-highlight-low"
                  onClick={() => {
                    setTime(String(r.mainStory));
                    setShowHltbDropdown(false);
                  }}
                >
                  <Timer className="size-4 shrink-0" />
                  <span className="truncate">{r.title}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs text-muted">
                    {r.mainStory > 0 ? `${r.mainStory} ч.` : "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {status === "ПРОЙДЕНО" && (
          <div className="leading-tight">
            <span>Время прохождения</span>
            <Input
              type="number"
              placeholder="Время прохождения"
              className="h-12"
              value={realTime}
              onChange={(e) => setRealTime(e.target.value)}
            />
          </div>
        )}
        {currentType === "library" && (
          <div className="leading-tight">
            <span>Статус</span>
            <Select value={status} onValueChange={(e) => setStatus(e as GameStatus)}>
              <SelectTrigger className="w-full py-5">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STATUSES.map((item) => (
                    <SelectItem
                      key={item.label}
                      value={item.label}
                      style={{ color: getStatusColor(item.name as GameStatus) }}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          variant="success"
          className="mt-auto mb-2"
          loading={gameMutation.isPending || searchLoading}
          disabled={!appId || !time || !status}
          onClick={handleGame}
        >
          ПОДТВЕРДИТЬ
        </Button>
      </section>
      <section className="flex h-full w-1/2 flex-col items-center rounded border-2 border-highlight-high p-2">
        {game && (
          <>
            <span className="text-xl font-bold text-wrap">{game?.game.name}</span>
            <Image
              src={game?.game.header_image}
              alt="image"
              className="aspect-video h-38 w-fit border-2 object-cover"
            />

            <Button
              variant="link"
              className="mt-auto mb-1"
              onClick={() =>
                openUrl(`https://store.steampowered.com/app/${game?.game.steam_appid}`)
              }
            >
              <span>Перейти на Steam</span>
            </Button>
            {game?.game.website && (
              <Button variant="link" onClick={() => openUrl(game?.game.website)}>
                <span>Перейти на сайт</span>
              </Button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
