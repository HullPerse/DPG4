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
import { useCallback, useState } from "react";
import { gameApi } from "@/api/games.api";
import { userApi } from "@/api/user.api";
import Image from "@/components/shared/image.component";
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

export default function CustomLibrary({
  setCurrentGame,
  currentType,
  presetId,
}: {
  setCurrentGame: (gameId: string) => void;
  currentType: "library" | "preset";
  presetId?: string;
}) {
  const user = useUserStore((state) => state.user);
  const queryClient = useQueryClient();

  const noAction = useDataStore((state) => state.noAction);

  const [status, setStatus] = useState("В ПРОЦЕССЕ");
  const [name, setName] = useState("");
  const [headerImage, setHeaderImage] = useState<string | null>(null);
  const [time, setTime] = useState("");
  const [realTime, setRealTime] = useState("");

  const gameMutation = useMutation({
    mutationFn: async () => {
      if (!name || !headerImage || !time || !status) throw new Error("Missing fields");

      const parsedTime = Number(time);
      const parsedReal = Number(realTime);
      if (isNaN(parsedTime)) throw new Error("Invalid time value");
      const score = await calculateScore(isNaN(parsedReal) ? 0 : parsedReal, parsedTime);
      const gameData = {
        user: {
          id: user?.id,
          username: user?.username,
        },
        playtime: {
          hltb: Number(time),
          user: status == "ПРОЙДЕНО" ? Number(realTime) : undefined,
        },
        status: STATUSES.find((s) => s.label === status)?.name as GameStatus,
        score,
        data: {
          id: `${Date.now()}-${name}`,
          name: name,
          image: headerImage,
          capsuleImage: headerImage,
          backgroundImage: headerImage,
          verticalImage: headerImage,
          steamLink: "",
          websiteLink: "",
          time: currentType === "preset" ? Number(time) : undefined,
        },
        created: new Date().toISOString(),
      } as Game;

      if (currentType === "library") {
        await userApi.changeUserAction(String(user?.id), "GAMEFINISH", noAction);
        const res = await gameApi.addGame(gameData);
        setCurrentGame?.(String(res.id));
        await userApi.changeUserAction(String(user?.id), "GAMEFINISH", noAction);
        return;
      }

      await gameApi.addPresetGame(String(presetId), gameData as any);
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
          loading={gameMutation.isPending}
          disabled={!name || !headerImage || !time || !status}
          onClick={handleGame}
        >
          ПОДТВЕРДИТЬ
        </Button>
      </section>
      <section className="flex h-full w-1/2 flex-col items-center rounded border-2 border-highlight-high p-2">
        <span className="text-xl font-bold text-wrap">{name || "Название игры"}</span>
        {headerImage && (
          <Image
            src={headerImage ?? ""}
            alt="image"
            className="aspect-video h-38 w-fit rounded border-2 object-cover"
          />
        )}

        {time && <span>Время: {time}</span>}
      </section>
    </main>
  );
}
