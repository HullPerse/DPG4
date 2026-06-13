import { useQuery } from "@tanstack/react-query";
import { getLeaderboard, type LeaderboardEntry } from "@/api/history.api";
import { Trophy, TrendingUp, TrendingDown, DollarSign, Ticket } from "lucide-react";
import { useState } from "react";
import {
  GAMBLING_GAME_FILTERS,
  LEADERBOARD_PERIODS,
  PODIUM_COLORS,
} from "@/lib/gambling/stats.constants";
import { useUserStore } from "@/store/user.store";
import { cn, BORDER_WINDOW } from "@/lib/utils";
import { WindowLoader } from "@/components/shared/loader.component";
import {
  FilterChipGroup,
  EmptyState,
  NetValue,
} from "../components/stats.shared";
import { LeaderboardNetChart } from "../components/charts.stats";

export default function LeaderboardTab() {
  const [gameType, setGameType] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<"alltime" | "weekly">("alltime");

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", gameType, period],
    queryFn: () =>
      getLeaderboard({ gameType: gameType as any, period, limit: 50 }),
  });

  const entries = data?.data ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  if (isLoading) return <WindowLoader className="bg-transparent" />;

  return (
    <main className="flex flex-col w-full h-full gap-3 p-1 overflow-y-auto">
      <header className="flex items-center gap-2">
        <Trophy className="size-5 text-primary" />
        <h2 className="text-lg font-bold">Лидерборд</h2>
      </header>

      <header className="flex flex-col gap-2">
        <FilterChipGroup
          options={GAMBLING_GAME_FILTERS}
          value={gameType}
          onChange={setGameType}
        />
        <FilterChipGroup
          options={LEADERBOARD_PERIODS}
          value={period}
          onChange={setPeriod}
        />
      </header>

      {entries.length === 0 ? (
        <EmptyState icon={null} message="Пока никто не играл" />
      ) : (
        <>
          {podium.length > 0 && <Podium entries={podium} />}
          {entries.length >= 3 && <LeaderboardNetChart entries={entries} />}
          <section className="flex flex-col gap-2">
            {rest.map((entry, i) => (
              <LeaderboardRow key={entry.userId} entry={entry} rank={i + 4} />
            ))}
          </section>
        </>
      )}
    </main>
  );
}

const PODIUM_ORDER = [1, 0, 2] as const;
const PODIUM_MEDAL_LABELS = ["1 место", "2 место", "3 место"] as const;

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <section className="grid grid-cols-3 gap-2 items-end pt-2 pb-1">
      {PODIUM_ORDER.map((idx) => {
        const entry = entries[idx];
        if (!entry) {
          return <div key={idx} />;
        }

        const color = PODIUM_COLORS[idx];

        return (
          <div
            key={entry.userId}
            className={cn(
              "flex flex-col items-center gap-1.5",
              idx === 0 && "order-2",
              idx === 1 && "order-1",
              idx === 2 && "order-3",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center size-12 rounded-full border-2 text-lg font-bold",
              )}
              style={{
                borderColor: color,
                backgroundColor: `${color}18`,
                color,
              }}
            >
              {entry.avatar}
            </span>
            <span
              className="text-xs font-bold truncate max-w-full px-1"
              style={{ color: entry.color }}
            >
              {entry.username}
            </span>
            <NetValue value={entry.totalNet} className="text-sm" />
            <div
              className={cn(
                "w-full flex flex-col items-center justify-end border-2 pt-2 pb-1",
                idx === 0 && "h-24",
                idx === 1 && "h-20",
                idx === 2 && "h-16",
              )}
              style={{
                borderColor: `${color}50`,
                backgroundColor: `${color}08`,
              }}
            >
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color }}
              >
                {PODIUM_MEDAL_LABELS[idx]}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function LeaderboardRow({
  entry,
  rank,
}: {
  entry: LeaderboardEntry;
  rank: number;
}) {
  const currentUserId = useUserStore((s) => s.user?.id);
  const isMe = currentUserId === entry.userId;

  return (
    <section
      className={cn(
        BORDER_WINDOW,
        "flex flex-col gap-2 bg-card/40 p-3 transition-colors",
        isMe && "border-iris bg-iris/10",
      )}
    >
      <div className="flex flex-row items-center gap-3">
        <span className="flex items-center justify-center size-8 shrink-0 border-2 border-highlight-high bg-background/40 text-sm font-bold text-muted tabular-nums">
          {rank}
        </span>
        <span className="text-xl shrink-0">{entry.avatar}</span>
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold truncate" style={{ color: entry.color }}>
              {entry.username}
            </span>
            {isMe && (
              <span className="text-[10px] font-bold text-iris uppercase">
                ты
              </span>
            )}
          </div>
          <div className="flex flex-row gap-3 text-[10px] text-muted">
            <span className="flex items-center gap-0.5">
              <Trophy className="size-3" />
              {entry.gamesPlayed}
            </span>
            <span className="flex items-center gap-0.5 text-emerald-400">
              <TrendingUp className="size-3" />
              {entry.wins}
            </span>
            <span className="flex items-center gap-0.5 text-red-400">
              <TrendingDown className="size-3" />
              {entry.losses}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <NetValue value={entry.totalNet} className="text-lg" />
          <span className="text-[10px] text-muted flex items-center gap-0.5 tabular-nums">
            <DollarSign className="size-3" />
            {entry.currentMoney}
          </span>
          {entry.currentTickets > 0 && (
            <span className="text-[10px] text-muted flex items-center gap-0.5 tabular-nums">
              <Ticket className="size-3" />
              {entry.currentTickets} т.
            </span>
          )}
        </div>
      </div>
      <WinRateBar wins={entry.wins} total={entry.gamesPlayed} />
    </section>
  );
}

function WinRateBar({ wins, total }: { wins: number; total: number }) {
  const rate = total > 0 ? (wins / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2 w-full">
      <div className="h-1.5 flex-1 bg-highlight-low border border-highlight-high overflow-hidden">
        <div
          className="h-full bg-emerald-400/80 transition-all"
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-[10px] text-muted tabular-nums w-7 text-right">
        {Math.round(rate)}%
      </span>
    </div>
  );
}
