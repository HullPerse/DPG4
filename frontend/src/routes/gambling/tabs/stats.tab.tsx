import { useQuery } from "@tanstack/react-query";
import { getStats } from "@/api/stats.api";
import { getHistory } from "@/api/history.api";
import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import {
  BarChart3,
  GlobeX,
  TrendingUp,
  Gamepad2,
  Coins,
  Target,
  Trophy,
  History,
} from "lucide-react";
import { formatNet, netColorClass, GAME_TYPE_LABELS } from "@/lib/gambling/stats.constants";
import { cn, BORDER_WINDOW } from "@/lib/index.utils";
import { StatCard, NetValue } from "../components/stats.shared";
import { lazy, Suspense } from "react";
import { HistoryRecord } from "@/types/history";

const StatsCharts = lazy(() =>
  import("../components/charts.stats").then((m) => ({
    default: m.StatsCharts,
  })),
);

export default function StatsTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["gamblingStats"],
    queryFn: async () => ({
      stats: await getStats(),
      history: await getHistory(1, 8),
    }),
  });

  if (isLoading || !data) return <WindowLoader className="bg-transparent" />;
  if (isError) {
    return (
      <WindowError
        error={new Error("Соединение с сервером потеряно")}
        icon={<GlobeX className="size-28 text-red-500" />}
      />
    );
  }

  const { summary } = data.stats;

  return (
    <main className="flex flex-col w-full h-full gap-3 p-1 overflow-y-auto">
      <header className="flex items-center gap-2">
        <BarChart3 className="size-5 text-primary" />
        <h2 className="text-lg font-bold">Статистика</h2>
      </header>

      <section className="grid grid-cols-2 gap-2">
        <StatCard
          label="Чистый доход"
          value={formatNet(summary.totalNet)}
          color={netColorClass(summary.totalNet)}
          icon={TrendingUp}
        />
        <StatCard label="Сыграно" value={String(summary.totalPlayed)} icon={Gamepad2} />
        <StatCard label="Всего поставлено" value={String(summary.totalWagered)} icon={Coins} />
        <StatCard
          label="Винрейт"
          value={`${summary.winRate}%`}
          color={summary.winRate >= 50 ? "text-emerald-400" : "text-red-400"}
          icon={Target}
        />
        <StatCard
          label="Лучший выигрыш"
          value={`+${summary.biggestWin}`}
          color="text-emerald-400"
          icon={Trophy}
        />
        <StatCard label="Средняя ставка" value={String(summary.avgBet)} icon={Coins} />
      </section>

      <Suspense fallback={null}>
        <StatsCharts
          dailyNet={data.stats.dailyNet}
          gameDistribution={data.stats.gameDistribution}
          betDistribution={data.stats.betDistribution}
        />
      </Suspense>

      {data.history.data.length > 0 && <RecentHistory records={data.history.data} />}
    </main>
  );
}

function RecentHistory({ records }: { records: HistoryRecord[] }) {
  return (
    <section className={cn(BORDER_WINDOW, "flex flex-col gap-2 bg-card/40 p-3")}>
      <header className="flex items-center gap-2 text-sm font-bold text-muted">
        <History className="size-4 text-iris" />
        Последние игры
      </header>
      <div className="flex flex-col gap-1.5">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex items-center gap-2 border border-highlight-high bg-background/40 px-2 py-1.5 text-xs"
          >
            <span className="text-base shrink-0">{record.image}</span>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-bold truncate">
                {GAME_TYPE_LABELS[record.type] ?? record.label}
              </span>
              <span className="text-[10px] text-muted tabular-nums">ставка {record.bid}</span>
            </div>
            <NetValue value={record.net} className="text-sm shrink-0" />
          </div>
        ))}
      </div>
    </section>
  );
}
