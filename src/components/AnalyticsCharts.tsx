"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export interface AccuracyPoint {
  date: string;
  accuracy: number;
}

export interface GameCountEntry {
  gameType: string;
  count: number;
  minutes: number;
}

export function AccuracyTrendChart({ data }: { data: AccuracyPoint[] }) {
  if (data.length === 0) {
    return <EmptyState label="No accuracy data yet — play a math or reading game!" />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke="#0284c7"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GamesPlayedChart({ data }: { data: GameCountEntry[] }) {
  if (data.length === 0) {
    return <EmptyState label="No games played yet." />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="gameType" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" name="Sessions" fill="#0284c7" radius={[4, 4, 0, 0]} />
        <Bar dataKey="minutes" name="Minutes" fill="#7dd3fc" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
      {label}
    </div>
  );
}
