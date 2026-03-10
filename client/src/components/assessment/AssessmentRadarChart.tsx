import { CATEGORY_METADATA } from "@shared/assessment-questions";
import type { CategoryScore } from "@shared/types";

interface AssessmentRadarChartProps {
  categories: CategoryScore[];
}

const TARGET_PCT = 80; // "Ready" threshold

export default function AssessmentRadarChart({ categories }: AssessmentRadarChartProps) {
  const data = categories.map(cat => ({
    label: CATEGORY_METADATA[cat.category].label,
    score: Math.round(cat.percentage * 100),
    color: CATEGORY_METADATA[cat.category].color,
  }));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">Readiness Profile</h3>
      <div className="space-y-5 py-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            {/* Category label */}
            <span className="w-28 text-xs font-medium text-muted-foreground text-right shrink-0">
              {d.label}
            </span>

            {/* Lollipop track */}
            <div className="flex-1 relative h-6">
              {/* Background track */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-border -translate-y-1/2" />

              {/* Score line */}
              <div
                className="absolute top-1/2 left-0 h-0.5 -translate-y-1/2 rounded-full"
                style={{ width: `${d.score}%`, backgroundColor: d.color }}
              />

              {/* Score dot (solid) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full shadow-sm"
                style={{ left: `${d.score}%`, backgroundColor: d.color }}
              />

              {/* Target marker at 80% (outlined circle) */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full border-2 bg-card"
                style={{ left: `${TARGET_PCT}%`, borderColor: d.color }}
                title={`Target: ${TARGET_PCT}%`}
              />
            </div>

            {/* Score value */}
            <span
              className="w-10 text-xs font-bold tabular-nums text-right shrink-0"
              style={{ color: d.color }}
            >
              {d.score}%
            </span>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Current Score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-muted-foreground bg-card" />
          <span className="text-[10px] text-muted-foreground">Ready Target ({TARGET_PCT}%)</span>
        </div>
      </div>
    </div>
  );
}
