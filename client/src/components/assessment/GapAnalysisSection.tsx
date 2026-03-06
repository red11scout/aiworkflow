import { AlertTriangle, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MATURITY_LEVELS, CATEGORY_METADATA } from "@shared/assessment-questions";
import type { AssessmentQuestion, AssessmentAnswer, AssessmentCategory } from "@shared/types";

interface GapAnalysisSectionProps {
  questions: AssessmentQuestion[];
  answers: AssessmentAnswer[];
  gapGuidance: Record<string, string>;
}

export default function GapAnalysisSection({ questions, answers, gapGuidance }: GapAnalysisSectionProps) {
  const answerMap = new Map(answers.map(a => [a.questionId, a]));

  // Find gaps: answered questions with score < 3
  const gaps = questions
    .map(q => {
      const a = answerMap.get(q.id);
      if (!a?.score || a.score >= 3) return null;
      return { question: q, score: a.score, gapSize: 4 - a.score };
    })
    .filter(Boolean) as Array<{ question: AssessmentQuestion; score: number; gapSize: number }>;

  // Sort by gap size desc, then weight desc
  gaps.sort((a, b) => {
    if (b.gapSize !== a.gapSize) return b.gapSize - a.gapSize;
    return b.question.weight - a.question.weight;
  });

  // Group by category
  const grouped = new Map<AssessmentCategory, typeof gaps>();
  for (const gap of gaps) {
    const cat = gap.question.category;
    const list = grouped.get(cat) || [];
    list.push(gap);
    grouped.set(cat, list);
  }

  if (gaps.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-6 text-center">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          No significant gaps identified -- your organization shows strong readiness!
        </p>
      </div>
    );
  }

  const severityColor = (gapSize: number) => {
    if (gapSize >= 3) return "#ef4444"; // red
    if (gapSize >= 2) return "#f59e0b"; // amber
    return "#02a2fd"; // blue
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-foreground">
          Gap Analysis -- {gaps.length} area{gaps.length !== 1 ? "s" : ""} need improvement
        </h3>
      </div>

      {Array.from(grouped.entries()).map(([cat, catGaps]) => (
        <div key={cat} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide" style={{ color: CATEGORY_METADATA[cat].color }}>
            {CATEGORY_METADATA[cat].label}
          </h4>
          {catGaps.map(gap => (
            <div
              key={gap.question.id}
              className="rounded-lg border border-border bg-card p-3 space-y-2"
              style={{ borderLeftWidth: 3, borderLeftColor: severityColor(gap.gapSize) }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground">{gap.question.questionText}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className="text-[10px]">
                    Level {gap.score} -&gt; 4
                  </Badge>
                  <Badge
                    className="text-[10px]"
                    style={{ backgroundColor: severityColor(gap.gapSize), color: "white" }}
                  >
                    Gap: {gap.gapSize}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {gap.question.subCategory} -- Currently: {MATURITY_LEVELS[gap.score as 1 | 2 | 3 | 4 | 5].label}
              </p>
              {gapGuidance[gap.question.id] && (
                <div className="flex items-start gap-2 bg-muted/30 rounded-md p-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-foreground">{gapGuidance[gap.question.id]}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
