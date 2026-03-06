import { CATEGORY_METADATA, ASSESSMENT_STATUS_THRESHOLDS } from "@shared/assessment-questions";
import type { CompositeAssessmentScore, AssessmentCategory } from "@shared/types";

interface AssessmentProgressProps {
  scores: CompositeAssessmentScore | null;
  totalQuestions: number;
  answeredQuestions: number;
}

export default function AssessmentProgress({ scores, totalQuestions, answeredQuestions }: AssessmentProgressProps) {
  const completion = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          {answeredQuestions} of {totalQuestions} questions answered
        </span>
        <span className="text-muted-foreground">{Math.round(completion)}% complete</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-[#02a2fd] rounded-full transition-all duration-500"
          style={{ width: `${completion}%` }}
        />
      </div>

      {/* Per-category mini bars */}
      {scores && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["skills", "data", "infrastructure", "governance"] as AssessmentCategory[]).map(cat => {
            const catScore = scores.categories.find(c => c.category === cat);
            const meta = CATEGORY_METADATA[cat];
            const pct = catScore ? Math.round(catScore.percentage * 100) : 0;
            const threshold = ASSESSMENT_STATUS_THRESHOLDS.find(t => catScore && catScore.percentage >= t.min);

            return (
              <div key={cat} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate" style={{ color: meta.color }}>
                    {meta.label}
                  </span>
                  <span className="text-xs font-bold">{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: threshold?.color || "#6b7280" }}
                  />
                </div>
                {catScore && (
                  <p className="text-[10px] mt-1" style={{ color: threshold?.color }}>
                    {threshold?.label} ({catScore.answeredCount}/{catScore.questionCount})
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
