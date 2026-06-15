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
import { TrendingUp } from "lucide-react";
import type { DailyActivity } from "@/types/stats";

export function InventoryGrowthChart({ data }: { data: DailyActivity[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.date.slice(5),
  }));

  if (chartData.length === 0) {
    return (
      <Panel title="Активность предметов" icon={TrendingUp}>
        <EmptyState message="Нет истории предметов" icon={null} />
      </Panel>
    );
  }

  return (
    <Panel title="Активность предметов" icon={TrendingUp}>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            stroke={CHART_THEME.grid}
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: CHART_THEME.muted, fontSize: 10 }}
            axisLine={{ stroke: CHART_THEME.border }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: CHART_THEME.muted, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            content={
              <ChartTooltip
                formatter={(_value: number, payload: Record<string, unknown>) =>
                  `+${payload.received ?? 0} / -${payload.sent ?? 0} / ${payload.used ?? 0} использовано`
                }
              />
            }
            cursor={{ fill: CHART_THEME.grid, opacity: 0.4 }}
          />
          <Bar
            dataKey="received"
            fill={CHART_THEME.positive}
            fillOpacity={0.7}
            radius={[2, 2, 0, 0]}
            maxBarSize={12}
            stackId="a"
          />
          <Bar
            dataKey="sent"
            fill={CHART_THEME.negative}
            fillOpacity={0.7}
            radius={[2, 2, 0, 0]}
            maxBarSize={12}
            stackId="a"
          />
          <Bar
            dataKey="used"
            fill={CHART_THEME.primary}
            fillOpacity={0.5}
            radius={[2, 2, 0, 0]}
            maxBarSize={12}
            stackId="a"
          />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
