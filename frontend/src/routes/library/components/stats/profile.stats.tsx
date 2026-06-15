import { useQuery } from "@tanstack/react-query";
import { getUserStats } from "@/api/stats.api";
import { WindowLoader } from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import { BarChart3, NetworkIcon } from "lucide-react";
import { SummaryCards } from "./cards.summary";
import { InventoryGrowthChart } from "./inventoryGrowth.stats";
import { InventoryTypesChart } from "./inventoryType.stats";
import { TopItemsChart } from "./inventoryTop.stats";
import { GameCompletionChart } from "./game.stats";
import { MarketActivityChart } from "./market.stats";

export default function UserStats({ id }: { id: string }) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["userStats", id],
    queryFn: () => getUserStats(id),
  });

  if (isLoading || !data) return <WindowLoader />;
  if (isError) {
    return (
      <WindowError
        error={new Error("Произошла ошибка при загрузке статистики")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );
  }

  return (
    <main className="flex flex-col w-full h-full gap-3 p-2 overflow-y-auto">
      <header className="flex items-center gap-2">
        <BarChart3 className="size-5 text-primary" />
        <h2 className="text-lg font-bold">Статистика</h2>
      </header>

      <SummaryCards
        gambling={data.gambling}
        inventory={data.inventory}
        games={data.games}
      />

      <div className="grid grid-cols-1 gap-3">
        <InventoryGrowthChart data={data.inventoryHistory.dailyActivity} />
        <InventoryTypesChart data={data.inventory.itemsByType} />
        <TopItemsChart data={data.inventory.topItems} />
        <GameCompletionChart data={data.games} />
        <MarketActivityChart data={data.inventoryHistory} />
      </div>
    </main>
  );
}
