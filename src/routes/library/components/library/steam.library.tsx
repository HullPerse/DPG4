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
import { calculateScore, getStatusColor } from "@/lib/utils";
import { Game, GameStatus } from "@/types/games";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";
import GameApi from "@/api/games.api";
import UserApi from "@/api/user.api";
import { SmallLoader } from "@/components/shared/loader.component";
import Image from "@/components/shared/image.component";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useUserStore } from "@/store/user.store";
import { useQueryClient } from "@tanstack/react-query";

const gameApi = new GameApi();
const userApi = new UserApi();

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

  const [status, setStatus] = useState("В ПРОЦЕССЕ");
  const [appId, setAppId] = useState(existingId ?? "");
  const [time, setTime] = useState("");
  const [realTime, setRealTime] = useState("");

  const [game, setGame] = useState<any>();

  const [loading, setLoading] = useState<boolean>(false);

  const handleGame = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    const gameData = {
      user: {
        id: String(user?.id),
        username: String(user?.username),
      },
      playtime: {
        hltb: Number(time),
        user: status == "ПРОЙДЕНО" ? Number(realTime) : undefined,
      },
      score: calculateScore(Number(realTime), Number(time)),
      status: STATUSES.find((s) => s.label === status)?.name as GameStatus,
      data: {
        id: game.game.steam_appid,
        name: game.game.name,
        image: game.library_image,
        capsuleImage: game.game.capsule_image,
        backgroundImage: game.library_background,
        steamLink: `https://store.steampowered.com/app/${game.game.steam_appid}`,
        websiteLink: game.game.website ?? "",
        time: currentType === "preset" ? Number(time) : undefined,
      },
      created: new Date().toISOString(),
    } as Game;

    if (currentType === "library") {
      return await gameApi
        .addGame(gameData)
        .then((res) => setCurrentGame(String(res.id)));
    }

    await userApi.changeUserAction(String(user.id), "GAMEFINISH");

    return await gameApi.addPresetGame(String(presetId), gameData).then(() => {
      queryClient.invalidateQueries({ queryKey: ["presetGame", presetId] });
      setCurrentGame("presetList");
    });
  }, [game, time, appId, status]);

  return (
    <main className="flex h-full w-full flex-row items-center">
      <section className="flex h-full w-1/2 flex-col gap-2 px-1">
        <div className="flex flex-row items-center justify-center gap-1">
          <Input
            autoFocus
            type="number"
            placeholder="ID игры"
            className="h-12"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
          />
          <Button
            className="h-12 w-12"
            onClick={async () => {
              setLoading(true);

              try {
                const game = await gameApi.getSteamGame(appId);
                setGame(game as any);
              } catch (e) {
                return console.log(e);
              } finally {
                setLoading(false);
              }
            }}
          >
            <Search className="h-4 w-4 border-text text-text" />
          </Button>
        </div>
        <div className="leading-tight">
          <span>Время на HLTB</span>
          <Input
            type="number"
            placeholder="hltb"
            className="h-12"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
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
            <span>Сложность</span>
            <Select
              value={status}
              onValueChange={(e) => setStatus(e as GameStatus)}
            >
              <SelectTrigger className="w-full py-5">
                <SelectValue placeholder="Сложность" />
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
          className="mt-auto mb-13"
          disabled={!appId || !time || !status || loading}
          onClick={handleGame}
        >
          {loading ? <SmallLoader /> : "ПОДТВЕРДИТЬ"}
        </Button>
      </section>
      <section className="flex h-full w-1/2 flex-col items-center rounded border-2 border-highlight-high p-2">
        {game && (
          <>
            <span className="text-xl font-bold text-wrap">
              {game?.game.name}
            </span>
            <Image
              src={game?.game.header_image}
              alt="image"
              className="aspect-video h-38 w-fit border-2 object-cover"
            />

            <Button
              variant="link"
              className="mt-auto mb-1"
              onClick={() =>
                openUrl(
                  `https://store.steampowered.com/app/${game?.game.steam_appid}`,
                )
              }
            >
              <span>Перейти на Steam</span>
            </Button>
            {game?.game.website && (
              <Button
                variant="link"
                onClick={() => openUrl(game?.game.website)}
              >
                <span>Перейти на сайт</span>
              </Button>
            )}
          </>
        )}
      </section>
    </main>
  );
}
