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
import { Package } from "lucide-react";
import type { ItemsByType } from "@/types/stats";

const TYPE_LABELS: Record<string, string> = {
  effect: "Эффект",
  item: "Предмет",
  roll: "Бросок",
  other: "Прочее",
  rat: "Крыса",
  ticket: "Билет",
};

const TYPE_COLORS: Record<string, string> = {
  effect: "#c4a7e7",
  item: "#f6c177",
  roll: "#eb6f92",
  other: "#9ccfd8",
  rat: "#7fda72",
  ticket: "#ea9a97",
};

export function InventoryTypesChart({ data }: { data: ItemsByType[] }) {
  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      ...d,
      label: TYPE_LABELS[d.type] ?? d.type,
      color: TYPE_COLORS[d.type] ?? CHART_THEME.iris,
    }));

  if (chartData.length === 0) {
    return (
      <Panel title="Предметы по типам" icon={Package}>
        <EmptyState message="Нет предметов" icon={null} />
      </Panel>
    );
  }

  return (
    <Panel title="Предметы по типам" icon={Package}>
      <ResponsiveContainer
        width="100%"
        height={Math.max(100, chartData.length * 36)}
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
            width={72}
            tick={{ fill: CHART_THEME.text, fontSize: 10 }}
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
