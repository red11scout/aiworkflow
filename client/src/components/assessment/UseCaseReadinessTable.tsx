import { Badge } from "@/components/ui/badge";
import { ASSESSMENT_STATUS_THRESHOLDS } from "@shared/assessment-questions";
import type { UseCaseAssessmentScore } from "@shared/types";

interface UseCaseReadinessTableProps {
  useCaseScores: UseCaseAssessmentScore[];
}

export default function UseCaseReadinessTable({ useCaseScores }: UseCaseReadinessTableProps) {
  if (useCaseScores.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No use cases mapped yet. Run the AI mapping to see per-use-case readiness scores.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Use Case Readiness</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">Use Case</th>
              <th className="text-center px-4 py-2 font-medium text-muted-foreground">Score</th>
              <th className="text-center px-4 py-2 font-medium text-muted-foreground">Status</th>
              <th className="text-center px-4 py-2 font-medium text-muted-foreground">Questions</th>
              <th className="text-center px-4 py-2 font-medium text-muted-foreground">Gaps</th>
            </tr>
          </thead>
          <tbody>
            {useCaseScores.map(uc => {
              const pct = Math.round(uc.percentage * 100);
              const threshold = ASSESSMENT_STATUS_THRESHOLDS.find(t => uc.percentage >= t.min);
              return (
                <tr key={uc.useCaseId} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <span className="font-medium text-foreground">{uc.useCaseName}</span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <span className="font-bold" style={{ color: threshold?.color }}>{pct}%</span>
                  </td>
                  <td className="text-center px-4 py-3">
                    <Badge className="text-[10px]" style={{ backgroundColor: threshold?.color, color: "white" }}>
                      {threshold?.label}
                    </Badge>
                  </td>
                  <td className="text-center px-4 py-3 text-muted-foreground">
                    {uc.mappedQuestionIds.length}
                  </td>
                  <td className="text-center px-4 py-3">
                    {uc.gaps.length > 0 ? (
                      <Badge variant="destructive" className="text-[10px]">
                        {uc.gaps.length}
                      </Badge>
                    ) : (
                      <span className="text-emerald-500 text-xs">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
