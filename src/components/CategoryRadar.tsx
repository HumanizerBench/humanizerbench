import * as React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

const CATEGORY_NAMES: Record<string, string> = {
  academic_essay: "Academic Essay",
  application_essay: "Application Essay",
  blog_post: "Blog Post",
  marketing_copy: "Marketing Copy",
  business_email: "Business Email",
  lit_review: "Lit Review",
  landing_copy: "Landing Copy",
  product_desc: "Product Desc",
};

const ORDER: Array<keyof typeof CATEGORY_NAMES> = [
  "academic_essay",
  "application_essay",
  "blog_post",
  "marketing_copy",
  "business_email",
  "lit_review",
  "landing_copy",
  "product_desc",
];

interface Props {
  categoryScores: Record<string, number>;
  class?: string;
}

const ACCENT = "#818cf8"; // indigo-400

export default function CategoryRadar({
  categoryScores,
  class: className,
}: Props) {
  const data = ORDER.filter((k) => k in categoryScores).map((key) => ({
    category: CATEGORY_NAMES[key],
    value: categoryScores[key] ?? 0,
  }));

  return (
    <div className={className} style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis
            dataKey="category"
            tick={{
              fill: "var(--color-text-secondary)",
              fontSize: 11,
              fontFamily: "var(--font-sans)",
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 1]}
            tick={false}
            axisLine={false}
            tickCount={5}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke={ACCENT}
            strokeWidth={1.5}
            fill={ACCENT}
            fillOpacity={0.15}
            isAnimationActive={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
