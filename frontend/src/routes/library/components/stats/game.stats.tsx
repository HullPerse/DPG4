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
import { Gamepad2 } from "lucide-react";
import type { UserStatsGames } from "@/types/stats";

const STATUS_COLORS: Record<string, string> = {
  completed: "#7fda72",
  playing: "#f6c177",
  dropped: "#eb6f92",
  rerolled: "#c4a7e7",
};

export function GameCompletionChart({ data }: { data: UserStatsGames }) {
  const chartData = [
    {
      status: "Пройдено",
      key: "completed",
      count: data.completed,
      color: STATUS_COLORS.completed,
    },
    {
      status: "В процессе",
      key: "playing",
      count: data.playing,
      color: STATUS_COLORS.playing,
    },
    {
      status: "Дропнуто",
      key: "dropped",
      count: data.dropped,
      color: STATUS_COLORS.dropped,
    },
    {
      status: "Реролл",
      key: "rerolled",
      count: data.rerolled,
      color: STATUS_COLORS.rerolled,
    },
  ].filter((d) => d.count > 0);

  if (chartData.length === 0) {
    return (
      <Panel title="Статусы игр" icon={Gamepad2}>
        <EmptyState message="Нет игр в библиотеке" icon={null} />
      </Panel>
    );
  }

  return (
    <Panel title="Статусы игр" icon={Gamepad2}>
      <ResponsiveContainer
        width="100%"
        height={Math.max(80, chartData.length * 40)}
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
            dataKey="status"
            width={98}
            tick={{ fill: CHART_THEME.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={
              <ChartTooltip formatter={(value: number) => `${value} игр`} />
            }
            cursor={{ fill: CHART_THEME.grid, opacity: 0.3 }}
          />
          <Bar
            dataKey="count"
            maxBarSize={20}
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
