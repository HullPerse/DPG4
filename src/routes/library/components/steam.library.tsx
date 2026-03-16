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
import { getStatusColor } from "@/lib/utils";
import { GameStatus } from "@/types/games";
import { Search } from "lucide-react";
import { useCallback, useState } from "react";
import GameApi from "@/api/games.api";
import { SmallLoader } from "@/components/shared/loader.component";
import { Image } from "@/components/shared/image.component";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useUserStore } from "@/store/user.store";

const gameApi = new GameApi();

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

export default function SteamLibrary() {
  const user = useUserStore((state) => state.user);

  const [status, setStatus] = useState("В ПРОЦЕССЕ");
  const [appId, setAppId] = useState("");
  const [time, setTime] = useState("");

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
      },
      status: STATUSES.find((s) => s.label === status)?.name as GameStatus,
      data: {
        id: game.game.steam_appid,
        name: game.game.name,
        image: game.library_image,
        capsuleImage: game.game.capsule_image,
        backgroundImage: game.library_background,
        steamLink: `https://store.steampowered.com/app/${game.game.steam_appid}`,
        websiteLink: game.game.website ?? "",
      },
    };

    try {
      await gameApi.addGame(gameData);
    } catch (e) {
      return console.log(e);
    } finally {
      setLoading(false);
    }
  }, [game, time, appId, status]);

  return (
    <main className="flex flex-row w-full h-full items-center">
      <section className="flex flex-col w-1/2 h-full px-1 gap-2">
        <div className="flex flex-row gap-1 items-center justify-center">
          <Input
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
            <Search className="w-4 h-4 text-text border-text" />
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
        <Button
          variant="success"
          className="mt-auto mb-1"
          disabled={!appId || !time || !status || loading}
          onClick={handleGame}
        >
          {loading ? <SmallLoader /> : "ПОДТВЕРДИТЬ"}
        </Button>
      </section>
      <section className="flex flex-col w-1/2 h-full border-highlight-high border-2 rounded p-2 items-center">
        {game && (
          <>
            <span className="font-bold text-xl text-wrap">
              {game?.game.name}
            </span>
            <Image
              src={game?.game.header_image}
              alt="image"
              className="w-full h-38 object-cover border-2 rounded"
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
