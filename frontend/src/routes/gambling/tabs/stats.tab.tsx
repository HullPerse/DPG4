import { useQuery } from "@tanstack/react-query";
import { getStats, StatsResponse } from "@/api/stats.api";
import { getHistory, HistoryResponse } from "@/api/history.api";

import { WindowError } from "@/components/shared/error.component";
import { WindowLoader } from "@/components/shared/loader.component";
import { GlobeX } from "lucide-react";

export default function StatsTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["gamblingStats"],
    queryFn: async (): Promise<{
      stats: StatsResponse;
      history: HistoryResponse;
    }> => {
      return {
        stats: await getStats(),
        history: await getHistory(1, 10),
      };
    },
  });

  if (isLoading || !data) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Соединение с сервером потеряно")}
        icon={<GlobeX className="size-28 text-red-500" />}
      />
    );

  return (
    <main className="flex flex-col w-full h-full gap-4 p-2 overflow-y-auto">
      <section className="grid grid-cols-2 gap-2">
        <StatCard
          label="Чистый доход"
          value={`${data.stats.summary.totalNet >= 0 ? "+" : ""}${data.stats.summary.totalNet}`}
          color={
            data.stats.summary.totalNet >= 0 ? "text-green-400" : "text-red-400"
          }
        />
        <StatCard
          label="Сыграно"
          value={String(data.stats.summary.totalPlayed)}
        />
        <StatCard
          label="Всего поставлено"
          value={String(data.stats.summary.totalWagered)}
        />
        <StatCard
          label="Винрейт"
          value={`${data.stats.summary.winRate}%`}
          color={
            data.stats.summary.winRate >= 50 ? "text-green-400" : "text-red-400"
          }
        />
        <StatCard
          label="Лучший выигрыш"
          value={`+${data.stats.summary.biggestWin}`}
          color="text-green-400"
        />
        <StatCard
          label="Средняя ставка"
          value={String(data.stats.summary.avgBet)}
        />
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  color = "text-white",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="border-2 border-highlight-high p-2 flex flex-col gap-2">
      <div className="flex flex-row items-center gap-2 text-muted">
        <span>{label}</span>
      </div>
      <span className={`font-bold text-xl ${color}`}>{value}</span>
    </div>
  );
}
