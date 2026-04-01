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
import { useCallback, useState } from "react";
import GameApi from "@/api/games.api";
import { SmallLoader } from "@/components/shared/loader.component";
import Image from "@/components/shared/image.component";
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

export default function CustomLibrary() {
  const user = useUserStore((state) => state.user);

  const [status, setStatus] = useState("В ПРОЦЕССЕ");
  const [name, setName] = useState("");
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleGame = useCallback(async () => {
    if (!name || !headerImage || !time || !status) return;

    setLoading(true);

    const gameData = {
      user: {
        id: user?.id,
        username: user?.username,
      },
      playtime: {
        hltb: Number(time),
      },
      status: STATUSES.find((s) => s.label === status)?.name as GameStatus,
      data: {
        id: `${Date.now()}`,
        name: name,
        image: headerImage,
        capsuleImage: headerImage,
        backgroundImage: headerImage,
        steamLink: "",
        websiteLink: "",
      },
    };

    try {
      await gameApi.addGame(gameData as any);
      setName("");
      setHeaderImage("");
      setTime("");
      setStatus("В ПРОЦЕССЕ");
    } catch (e) {
      return console.log(e);
    } finally {
      setLoading(false);
    }
  }, [name, headerImage, time, status, gameApi]);

  return (
    <main className="flex h-full w-full flex-row items-center">
      <section className="flex h-full w-1/2 flex-col gap-2 px-1">
        <div className="leading-tight">
          <span>Название</span>
          <Input
            placeholder="Название игры"
            className="h-12"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="leading-tight">
          <span>Ссылка на картинку</span>
          <Input
            placeholder="URL изображения"
            className="h-12"
            value={headerImage ?? ""}
            onChange={(e) => setHeaderImage(e.target.value)}
          />
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
          disabled={!name || !headerImage || !time || !status || loading}
          onClick={handleGame}
        >
          {loading ? <SmallLoader /> : "ПОДТВЕРДИТЬ"}
        </Button>
      </section>
      <section className="flex h-full w-1/2 flex-col items-center rounded border-2 border-highlight-high p-2">
        <span className="text-xl font-bold text-wrap">
          {name || "Название игры"}
        </span>
        {headerImage && (
          <Image
            src={headerImage ?? ""}
            alt="image"
            className="aspect-video h-38 rounded border-2 object-cover"
          />
        )}

        {time && <span>Время: {time}</span>}
      </section>
    </main>
  );
}
