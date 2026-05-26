import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

const DETECTOR_NAMES: Record<string, string> = {
  gptzero: "GPTZero",
  originality: "Originality.ai",
  copyleaks: "Copyleaks",
  winston: "Winston AI",
  sapling: "Sapling",
  zerogpt: "ZeroGPT",
};

interface Props {
  detectorScores: Record<string, number>;
  class?: string;
}

const ACCENT = "#818cf8"; // indigo-400

export default function DetectorBreakdownChart({
  detectorScores,
  class: className,
}: Props) {
  const data = Object.entries(detectorScores)
    .map(([slug, score]) => ({
      slug,
      name: DETECTOR_NAMES[slug] ?? slug,
      value: Math.round(score * 1000) / 10,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className={className} style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 48, bottom: 8, left: 8 }}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            hide
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "var(--color-text-secondary)",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
            }}
          />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={18} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.slug} fill={ACCENT} fillOpacity={0.85} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => `${v.toFixed(1)}`}
              style={{
                fill: "var(--color-text-primary)",
                fontSize: 12,
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
