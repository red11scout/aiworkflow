import { Users, Database, Server, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_METADATA, ASSESSMENT_STATUS_THRESHOLDS } from "@shared/assessment-questions";
import type { CategoryScore } from "@shared/types";

const ICONS: Record<string, typeof Users> = { Users, Database, Server, Shield };

interface CategoryScoreCardProps {
  score: CategoryScore;
}

export default function CategoryScoreCard({ score }: CategoryScoreCardProps) {
  const meta = CATEGORY_METADATA[score.category];
  const threshold = ASSESSMENT_STATUS_THRESHOLDS.find(t => score.percentage >= t.min);
  const Icon = ICONS[meta.icon] || Users;
  const pct = Math.round(score.percentage * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ backgroundColor: meta.color + "20" }}>
            <Icon className="w-4 h-4" style={{ color: meta.color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
            <p className="text-xs text-muted-foreground">
              {score.answeredCount}/{score.questionCount} answered
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold" style={{ color: threshold?.color }}>{pct}%</p>
          <Badge className="text-[10px]" style={{ backgroundColor: threshold?.color, color: "white" }}>
            {threshold?.label}
          </Badge>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: threshold?.color }}
        />
      </div>

      {/* Sub-category breakdown */}
      <div className="space-y-1.5">
        {score.subCategories.map(sub => {
          const subPct = Math.round(sub.percentage * 100);
          const subThreshold = ASSESSMENT_STATUS_THRESHOLDS.find(t => sub.percentage >= t.min);
          return (
            <div key={sub.subCategory} className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground flex-1 truncate">{sub.subCategory}</span>
              <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${subPct}%`, backgroundColor: subThreshold?.color }}
                />
              </div>
              <span className="font-mono w-8 text-right" style={{ color: subThreshold?.color }}>
                {subPct}%
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground italic">{score.statusDescription}</p>
    </div>
  );
}
