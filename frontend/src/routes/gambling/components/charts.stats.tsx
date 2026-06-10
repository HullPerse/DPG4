import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyNet, GameDistribution, BetDistribution } from "@/api/stats.api";
import {
  CHART_THEME,
  GAME_CHART_COLORS,
  GAME_TYPE_LABELS,
  formatNet,
} from "@/lib/gambling/stats.constants";
import { Panel } from "./stats.shared";
import { TrendingUp, PieChart, Coins } from "lucide-react";

type TooltipPayload = { value: number; payload?: Record<string, unknown> };

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  formatter?: (value: number, payload: Record<string, unknown>) => string;
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  const extra = entry.payload ?? {};

  return (
    <div className="border-2 border-highlight-high bg-card px-2.5 py-1.5 text-xs shadow-sharp-sm">
      {label && <p className="mb-0.5 font-bold text-muted">{label}</p>}
      <p className="font-bold text-text tabular-nums">
        {formatter ? formatter(entry.value, extra) : entry.value}
      </p>
    </div>
  );
}

function formatShortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${day}.${month}`;
}

export function DailyNetChart({ data }: { data: DailyNet[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatShortDate(d.date),
  }));

  return (
    <Panel title="Доход по дням" icon={TrendingUp}>
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted">Нет данных за последние 30 дней</p>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid stroke={CHART_THEME.grid} strokeDasharray="3 3" vertical={false} />
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
            />
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(value, payload) =>
                    `${formatNet(value)} · ${payload.gamesPlayed ?? 0} игр`
                  }
                />
              }
              cursor={{ fill: CHART_THEME.grid, opacity: 0.4 }}
            />
            <Bar dataKey="net" radius={[2, 2, 0, 0]} maxBarSize={28}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.date}
                  fill={entry.net >= 0 ? CHART_THEME.positive : CHART_THEME.negative}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

export function GameDistributionChart({ data }: { data: GameDistribution[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: GAME_TYPE_LABELS[d.type] ?? d.type,
    color: GAME_CHART_COLORS[d.type] ?? CHART_THEME.iris,
  }));

  return (
    <Panel title="По играм" icon={PieChart}>
      {chartData.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted">Нет сыгранных игр</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(120, chartData.length * 36)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 8, left: 4, bottom: 0 }}
          >
            <CartesianGrid stroke={CHART_THEME.grid} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: CHART_THEME.muted, fontSize: 10 }}
              axisLine={{ stroke: CHART_THEME.border }}
              tickLine={false}
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
                <ChartTooltip
                  formatter={(value, payload) =>
                    `${value} игр · ${formatNet(Number(payload.totalNet ?? 0))}`
                  }
                />
              }
              cursor={{ fill: CHART_THEME.grid, opacity: 0.3 }}
            />
            <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={18}>
              {chartData.map((entry) => (
                <Cell key={entry.type} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

export function BetDistributionChart({ data }: { data: BetDistribution[] }) {
  const filtered = data.filter((d) => d.count > 0);

  return (
    <Panel title="Размер ставок" icon={Coins}>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted">Нет ставок</p>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={filtered} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={CHART_THEME.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fill: CHART_THEME.muted, fontSize: 10 }}
              axisLine={{ stroke: CHART_THEME.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: CHART_THEME.muted, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={
                <ChartTooltip formatter={(value) => `${value} ставок`} />
              }
              cursor={{ fill: CHART_THEME.grid, opacity: 0.4 }}
            />
            <Bar
              dataKey="count"
              fill={CHART_THEME.primary}
              fillOpacity={0.75}
              radius={[2, 2, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Panel>
  );
}

export function LeaderboardNetChart({
  entries,
}: {
  entries: { username: string; totalNet: number }[];
}) {
  const top = entries.slice(0, 8).map((e) => ({
    name: e.username.length > 8 ? `${e.username.slice(0, 7)}…` : e.username,
    net: e.totalNet,
  }));

  if (top.length === 0) return null;

  return (
    <Panel title="Топ по доходу" icon={TrendingUp}>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={top} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={CHART_THEME.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_THEME.muted, fontSize: 9 }}
            axisLine={{ stroke: CHART_THEME.border }}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tick={{ fill: CHART_THEME.muted, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<ChartTooltip formatter={(value) => formatNet(value)} />}
            cursor={{ fill: CHART_THEME.grid, opacity: 0.4 }}
          />
          <Bar dataKey="net" radius={[2, 2, 0, 0]} maxBarSize={24}>
            {top.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.net >= 0 ? CHART_THEME.positive : CHART_THEME.negative}
                fillOpacity={i < 3 ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}
