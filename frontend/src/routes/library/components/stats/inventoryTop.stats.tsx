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
import { List } from "lucide-react";
import type { TopItem } from "@/types/stats";

const TOP_COLORS = [
  "#ffd700",
  "#c0c0c0",
  "#cd7f32",
  "#c4a7e7",
  "#f6c177",
  "#eb6f92",
  "#9ccfd8",
  "#7fda72",
  "#ea9a97",
  "#6e6a86",
];

export function TopItemsChart({ data }: { data: TopItem[] }) {
  const chartData = data.map((d, i) => ({
    ...d,
    color: TOP_COLORS[i % TOP_COLORS.length],
  }));

  if (chartData.length === 0) {
    return (
      <Panel title="Топ предметов" icon={List}>
        <EmptyState message="Нет предметов" icon={null} />
      </Panel>
    );
  }

  return (
    <Panel title="Топ предметов" icon={List}>
      <ResponsiveContainer
        width="100%"
        height={Math.max(100, chartData.length * 32)}
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
            width={120}
            tick={{ fill: CHART_THEME.text, fontSize: 9 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={
              <ChartTooltip formatter={(value: number) => `${value} шт.`} />
            }
            cursor={{ fill: CHART_THEME.grid, opacity: 0.3 }}
          />
          <Bar
            dataKey="count"
            maxBarSize={16}
            shape={(props: any) => {
              const { x, y, width, height, index } = props;
              const entry = chartData[index];
              return (
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={entry?.color}
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
