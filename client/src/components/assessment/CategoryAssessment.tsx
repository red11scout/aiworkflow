import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import AssessmentQuestionCard from "./AssessmentQuestionCard";
import { CATEGORY_METADATA, ASSESSMENT_STATUS_THRESHOLDS } from "@shared/assessment-questions";
import type { AssessmentQuestion, AssessmentAnswer, AssessmentCategory, MaturityLevel, CategoryScore } from "@shared/types";

interface CategoryAssessmentProps {
  category: AssessmentCategory;
  questions: AssessmentQuestion[];
  answers: AssessmentAnswer[];
  categoryScore: CategoryScore | undefined;
  onScoreChange: (questionId: string, score: MaturityLevel) => void;
  onNotesChange: (questionId: string, notes: string) => void;
}

export default function CategoryAssessment({
  category,
  questions,
  answers,
  categoryScore,
  onScoreChange,
  onNotesChange,
}: CategoryAssessmentProps) {
  const meta = CATEGORY_METADATA[category];
  const answerMap = new Map(answers.map(a => [a.questionId, a]));

  // Group by sub-category
  const subCategoryGroups = new Map<string, AssessmentQuestion[]>();
  for (const q of questions) {
    const group = subCategoryGroups.get(q.subCategory) || [];
    group.push(q);
    subCategoryGroups.set(q.subCategory, group);
  }

  const [expandedSubs, setExpandedSubs] = useState<Set<string>>(
    new Set(Array.from(subCategoryGroups.keys()))
  );

  const toggleSub = (sub: string) => {
    setExpandedSubs(prev => {
      const next = new Set(prev);
      next.has(sub) ? next.delete(sub) : next.add(sub);
      return next;
    });
  };

  let globalIndex = 0;

  return (
    <div className="space-y-4">
      {/* Category description */}
      <p className="text-sm text-muted-foreground">{meta.description}</p>

      {/* Sub-category groups */}
      {Array.from(subCategoryGroups.entries()).map(([subCat, subQuestions]) => {
        const isExpanded = expandedSubs.has(subCat);
        const subScore = categoryScore?.subCategories.find(s => s.subCategory === subCat);
        const subThreshold = subScore
          ? ASSESSMENT_STATUS_THRESHOLDS.find(t => subScore.percentage >= t.min)
          : null;
        const startIndex = globalIndex;
        globalIndex += subQuestions.length;

        return (
          <div key={subCat} className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Sub-category header */}
            <button
              onClick={() => toggleSub(subCat)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{subCat}</span>
                <Badge variant="outline" className="text-[10px]">
                  {subQuestions.length} question{subQuestions.length > 1 ? "s" : ""}
                </Badge>
                {subScore && subThreshold && (
                  <Badge className="text-[10px]" style={{ backgroundColor: subThreshold.color, color: "white" }}>
                    {Math.round(subScore.percentage * 100)}% — {subThreshold.label}
                  </Badge>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {/* Questions */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {subQuestions.map((q, i) => (
                  <AssessmentQuestionCard
                    key={q.id}
                    question={q}
                    answer={answerMap.get(q.id) || { questionId: q.id, score: null, notes: "" }}
                    questionNumber={startIndex + i + 1}
                    onScoreChange={(score) => onScoreChange(q.id, score)}
                    onNotesChange={(notes) => onNotesChange(q.id, notes)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
