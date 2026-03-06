import { useState } from "react";
import { HelpCircle, MessageSquare, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MATURITY_LEVELS } from "@shared/assessment-questions";
import type { AssessmentQuestion, AssessmentAnswer, MaturityLevel } from "@shared/types";
import { cn } from "@/lib/utils";

interface AssessmentQuestionCardProps {
  question: AssessmentQuestion;
  answer: AssessmentAnswer;
  questionNumber: number;
  onScoreChange: (score: MaturityLevel) => void;
  onNotesChange: (notes: string) => void;
}

const SCORE_COLORS: Record<number, string> = {
  1: "bg-red-500 hover:bg-red-600",
  2: "bg-orange-500 hover:bg-orange-600",
  3: "bg-amber-500 hover:bg-amber-600",
  4: "bg-blue-500 hover:bg-blue-600",
  5: "bg-emerald-500 hover:bg-emerald-600",
};

export default function AssessmentQuestionCard({
  question,
  answer,
  questionNumber,
  onScoreChange,
  onNotesChange,
}: AssessmentQuestionCardProps) {
  const [showNotes, setShowNotes] = useState(!!answer.notes);

  return (
    <div className={cn(
      "rounded-lg border p-4 transition-colors",
      answer.score ? "border-border bg-card" : "border-dashed border-border/50 bg-card/50"
    )}>
      <div className="flex items-start gap-3">
        {/* Question number */}
        <span className="text-xs font-mono text-muted-foreground mt-1 min-w-[24px]">
          {questionNumber}.
        </span>

        <div className="flex-1 space-y-3">
          {/* Question text + hint */}
          <div className="flex items-start gap-2">
            <p className="text-sm font-medium text-foreground leading-relaxed flex-1">
              {question.questionText}
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5">
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs">
                  <p className="text-xs">{question.hint}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Weight + Use Cases */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono">
              {question.weight}x weight
            </Badge>
            {question.useCasesImpacted.length > 0 && (
              <>
                <Tag className="w-3 h-3 text-muted-foreground" />
                {question.useCasesImpacted.slice(0, 3).map(ucId => (
                  <Badge key={ucId} variant="secondary" className="text-[10px]">
                    {ucId}
                  </Badge>
                ))}
                {question.useCasesImpacted.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{question.useCasesImpacted.length - 3} more
                  </span>
                )}
              </>
            )}
          </div>

          {/* 1-5 Score buttons */}
          <div className="flex items-center gap-1.5">
            {([1, 2, 3, 4, 5] as MaturityLevel[]).map(level => (
              <button
                key={level}
                onClick={() => onScoreChange(level)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                  answer.score === level
                    ? `${SCORE_COLORS[level]} text-white shadow-sm`
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="font-bold">{level}</span>
                <span className="text-[9px] leading-tight opacity-80">
                  {MATURITY_LEVELS[level].label}
                </span>
              </button>
            ))}
          </div>

          {/* Notes toggle + textarea */}
          <div>
            {!showNotes ? (
              <button
                onClick={() => setShowNotes(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
                Add note
              </button>
            ) : (
              <Textarea
                value={answer.notes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder="Add context, supporting details, or observations..."
                className="text-xs min-h-[60px] resize-none"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
