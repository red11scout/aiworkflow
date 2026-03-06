import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { CATEGORY_METADATA } from "@shared/assessment-questions";
import type { CategoryScore } from "@shared/types";

interface AssessmentRadarChartProps {
  categories: CategoryScore[];
}

export default function AssessmentRadarChart({ categories }: AssessmentRadarChartProps) {
  const data = categories.map(cat => ({
    category: CATEGORY_METADATA[cat.category].label,
    score: Math.round(cat.percentage * 100),
    fullMark: 100,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Readiness Profile</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="category"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#02a2fd"
            fill="#02a2fd"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
