import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { Humanizer } from "@/lib/types";

interface Props {
  humanizerA: Humanizer;
  humanizerB: Humanizer;
}

const METRICS: Array<{ key: keyof Humanizer["scores"]; label: string }> = [
  { key: "composite", label: "Overall" },
  { key: "bypass_rate", label: "Bypass Rate" },
  { key: "meaning_preservation", label: "Meaning Pres." },
  { key: "readability", label: "Readability" },
  { key: "consistency_across_categories", label: "Consistency" },
];

const COLOR_A = "#818cf8"; // indigo-400
const COLOR_B = "#a1a1aa"; // zinc-400

function toPct(key: keyof Humanizer["scores"], raw: number): number {
  // Composite arrives on a 0–100 scale; everything else is 0–1.
  // Tolerate both by detecting magnitude on composite.
  if (key === "composite") {
    const v = raw > 1.5 ? raw : raw * 100;
    return Math.round(v * 10) / 10;
  }
  return Math.round(raw * 1000) / 10;
}

export default function HeadToHead({ humanizerA, humanizerB }: Props) {
  const data = METRICS.map(({ key, label }) => ({
    metric: label,
    [humanizerA.name]: toPct(key, humanizerA.scores[key]),
    [humanizerB.name]: toPct(key, humanizerB.scores[key]),
  }));

  // Zoom Y-axis to [50, 100] when every value is at least 50 — makes
  // differences readable when humanizers cluster high. Drop to [0, 100]
  // the moment anything falls below 50.
  const allValues = data.flatMap((d) => [
    d[humanizerA.name] as number,
    d[humanizerB.name] as number,
  ]);
  const yMin = allValues.every((v) => typeof v === "number" && v >= 50)
    ? 50
    : 0;

  return (
    <div className="w-full">
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
            barCategoryGap="20%"
          >
            <XAxis
              dataKey="metric"
              tick={{
                fill: "var(--color-text-secondary)",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
              }}
              axisLine={{ stroke: "var(--color-border)" }}
              tickLine={false}
            />
            <YAxis
              domain={[yMin, 100]}
              tick={{
                fill: "var(--color-text-secondary)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
              }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              cursor={{ fill: "var(--color-surface)", opacity: 0.4 }}
              contentStyle={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                color: "var(--color-text-primary)",
              }}
              labelStyle={{ color: "var(--color-text-secondary)" }}
              formatter={(v: number) => `${v.toFixed(1)}`}
            />
            <Legend
              wrapperStyle={{
                fontSize: 12,
                fontFamily: "var(--font-sans)",
                color: "var(--color-text-secondary)",
                paddingTop: 8,
              }}
            />
            <Bar
              dataKey={humanizerA.name}
              fill={COLOR_A}
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
            <Bar
              dataKey={humanizerB.name}
              fill={COLOR_B}
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
