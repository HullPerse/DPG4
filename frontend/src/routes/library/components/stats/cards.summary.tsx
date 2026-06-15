import { StatCard } from "@/routes/gambling/components/stats.shared";
import {
  TrendingUp,
  Gamepad2,
  Coins,
  Target,
  Trophy,
  Package,
  Star,
} from "lucide-react";
import { formatNet, netColorClass } from "@/lib/gambling/stats.constants";
import type {
  UserStatsGambling,
  UserStatsInventory,
  UserStatsGames,
} from "@/types/stats";

export function SummaryCards({
  gambling,
  inventory,
  games,
}: {
  gambling: UserStatsGambling;
  inventory: UserStatsInventory;
  games: UserStatsGames;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard
        label="Чистый доход"
        value={formatNet(gambling.totalNet)}
        color={netColorClass(gambling.totalNet)}
        icon={TrendingUp}
      />
      <StatCard
        label="Сыграно игр"
        value={String(gambling.totalPlayed)}
        icon={Gamepad2}
      />
      <StatCard
        label="Всего поставлено"
        value={String(gambling.totalWagered)}
        icon={Coins}
      />
      <StatCard
        label="Винрейт"
        value={`${gambling.winRate}%`}
        color={gambling.winRate >= 50 ? "text-emerald-400" : "text-red-400"}
        icon={Target}
      />
      <StatCard
        label="Лучший выигрыш"
        value={`+${gambling.biggestWin}`}
        color="text-emerald-400"
        icon={Trophy}
      />
      <StatCard
        label="Средняя ставка"
        value={String(gambling.avgBet)}
        icon={Coins}
      />
      <StatCard
        label="Предметов в инвентаре"
        value={String(inventory.totalItems)}
        icon={Package}
      />
      <StatCard
        label="Всего игр в библиотеке"
        value={String(games.total)}
        icon={Star}
      />
    </div>
  );
}
