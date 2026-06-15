import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_THEME } from "@/lib/gambling/stats.constants";
import { Panel, EmptyState } from "@/routes/gambling/components/stats.shared";
import { ChartTooltip } from "@/routes/gambling/components/charts.stats";
import { Store } from "lucide-react";
import type { UserStatsInventoryHistory } from "@/types/stats";

export function MarketActivityChart({
  data,
}: {
  data: UserStatsInventoryHistory;
}) {
  const hasActivity =
    data.marketListed > 0 ||
    data.marketUnlisted > 0 ||
    data.totalBought > 0 ||
    data.totalSold > 0;

  if (!hasActivity) {
    return (
      <Panel title="Маркет" icon={Store}>
        <EmptyState message="Нет активности на маркете" icon={null} />
      </Panel>
    );
  }

  const chartData = [
    {
      label: "Выставлено",
      value: data.marketListed,
      fill: CHART_THEME.primary,
    },
    { label: "Продано", value: data.totalSold, fill: CHART_THEME.positive },
    { label: "Куплено", value: data.totalBought, fill: CHART_THEME.iris },
    { label: "Снято", value: data.marketUnlisted, fill: CHART_THEME.negative },
  ].filter((d) => d.value > 0);

  return (
    <Panel title="Маркет" icon={Store}>
      <ResponsiveContainer
        width="100%"
        height={Math.max(80, chartData.length * 36)}
      >
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
        >
          <CartesianGrid
            stroke={CHART_THEME.grid}
            strokeDasharray="3 3"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fill: CHART_THEME.muted, fontSize: 10 }}
            axisLine={{ stroke: CHART_THEME.border }}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={80}
            tick={{ fill: CHART_THEME.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={
              <ChartTooltip formatter={(value: number) => `${value} раз`} />
            }
            cursor={{ fill: CHART_THEME.grid, opacity: 0.3 }}
          />
          <Bar
            dataKey="value"
            maxBarSize={18}
            shape={(props: any) => {
              const { x, y, width, height, index } = props;
              const entry = chartData[index];
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={entry?.fill}
                  fillOpacity={0.85}
                  rx={2}
                />
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
