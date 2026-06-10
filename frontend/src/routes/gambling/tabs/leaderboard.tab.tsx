import { useQuery } from "@tanstack/react-query";
import { getLeaderboard, type LeaderboardEntry } from "@/api/history.api";
import { Button } from "@/components/ui/button.component";
import { Trophy, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { useState } from "react";

const GAME_TYPES = [
  { value: undefined, label: "Все" },
  { value: "dice" as const, label: "Чинчирорин" },
  { value: "blackjack" as const, label: "Блэкджек" },
  { value: "rocket" as const, label: "Ракетник" },
  { value: "pachinko" as const, label: "Пачинко" },
];

const PERIODS = [
  { value: "alltime" as const, label: "За всё время" },
  { value: "weekly" as const, label: "За неделю" },
];

const TOP_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"];

export default function LeaderboardTab() {
  const [gameType, setGameType] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<"alltime" | "weekly">("alltime");

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", gameType, period],
    queryFn: () => getLeaderboard({ gameType: gameType as any, period, limit: 50 }),
  });

  return (
    <main className="flex flex-col w-full h-full gap-3 p-2">
      <section className="flex flex-row gap-2 flex-wrap">
        {GAME_TYPES.map((g) => (
          <Button
            key={g.label}
            variant={gameType === g.value ? "default" : "ghost"}
            size="sm"
            onClick={() => setGameType(g.value)}
          >
            {g.label}
          </Button>
        ))}
      </section>
      <section className="flex flex-row gap-2">
        {PERIODS.map((p) => (
          <Button
            key={p.label}
            variant={period === p.value ? "default" : "ghost"}
            size="sm"
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </section>
      <section className="flex flex-col gap-2 overflow-y-auto w-full flex-1">
        {isLoading && <p className="text-center text-muted">Загрузка...</p>}
        {data?.data.map((entry, i) => (
          <LeaderboardRow key={entry.userId} entry={entry} rank={i + 1} />
        ))}
        {data?.data.length === 0 && (
          <p className="text-center text-muted mt-10">Нет данных</p>
        )}
      </section>
    </main>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const medalEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const rankColor = rank <= 3 ? TOP_COLORS[rank - 1] : undefined;

  return (
    <section
      className="flex flex-row items-center gap-3 p-3 border-2 border-highlight-high rounded-lg min-h-16"
      style={rankColor ? { borderColor: rankColor } : undefined}
    >
      <span className="text-xl font-bold w-10 text-center">{medalEmoji}</span>
      <span className="text-2xl">{entry.avatar}</span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className="font-bold truncate" style={{ color: entry.color }}>
          {entry.username}
        </span>
        <div className="flex flex-row gap-3 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Trophy className="size-3" />
            {entry.gamesPlayed}
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="size-3 text-green-400" />
            {entry.wins}
          </span>
          <span className="flex items-center gap-1">
            <TrendingDown className="size-3 text-red-400" />
            {entry.losses}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span
          className={`font-bold text-lg ${entry.totalNet >= 0 ? "text-green-400" : "text-red-400"}`}
        >
          {entry.totalNet >= 0 ? "+" : ""}{entry.totalNet}
        </span>
        <span className="text-xs text-muted flex items-center gap-1">
          <DollarSign className="size-3" />
          {entry.currentMoney}
        </span>
      </div>
    </section>
  );
}
