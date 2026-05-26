import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { HumanizerHistory } from "@/lib/types";

interface Props {
  history: HumanizerHistory | null;
  class?: string;
}

const ACCENT = "#818cf8"; // indigo-400

export default function TrendChart({ history, class: className }: Props) {
  if (!history || history.points.length < 2) {
    return (
      <div
        className={
          (className ?? "") +
          " bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 text-sm text-[var(--color-text-secondary)] flex items-center justify-center"
        }
        style={{ minHeight: 280 }}
      >
        Insufficient history yet: first full cycle.
      </div>
    );
  }

  const data = history.points.map((p) => {
    // Tolerate both 0-1 and 0-100 composite scales from the runner.
    const pct = p.composite > 1.5 ? p.composite : p.composite * 100;
    return {
      cycle: p.cycle,
      Overall: Math.round(pct * 10) / 10,
    };
  });

  return (
    <div className={className} style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
        >
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="cycle"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "var(--color-text-secondary)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            width={36}
            tick={{
              fill: "var(--color-text-secondary)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              color: "var(--color-text-primary)",
            }}
            labelStyle={{ color: "var(--color-text-secondary)" }}
            formatter={(v: number) => [`${v.toFixed(1)}`, "Overall"]}
          />
          <Line
            type="monotone"
            dataKey="Overall"
            stroke={ACCENT}
            strokeWidth={2}
            dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: ACCENT, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
