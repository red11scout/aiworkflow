import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import CategoryScoreCard from "./CategoryScoreCard";
import AssessmentRadarChart from "./AssessmentRadarChart";
import UseCaseReadinessTable from "./UseCaseReadinessTable";
import GapAnalysisSection from "./GapAnalysisSection";
import type { CompositeAssessmentScore, AssessmentQuestion, AssessmentAnswer } from "@shared/types";
import { ASSESSMENT_STATUS_THRESHOLDS } from "@shared/assessment-questions";

interface AssessmentResultsProps {
  scores: CompositeAssessmentScore;
  questions: AssessmentQuestion[];
  answers: AssessmentAnswer[];
  gapGuidance: Record<string, string>;
  projectId: string;
  onExportJSON: () => void;
  onRequestGuidance: () => void;
  isLoadingGuidance: boolean;
}

export default function AssessmentResults({
  scores,
  questions,
  answers,
  gapGuidance,
  projectId,
  onExportJSON,
  onRequestGuidance,
  isLoadingGuidance,
}: AssessmentResultsProps) {
  const overallPct = Math.round(scores.overallPercentage * 100);
  const overallThreshold = ASSESSMENT_STATUS_THRESHOLDS.find(t => scores.overallPercentage >= t.min);

  return (
    <div className="space-y-6">
      {/* Overall Score Hero */}
      <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Overall AI Readiness</h2>
        <p className="text-5xl font-bold" style={{ color: overallThreshold?.color }}>
          {overallPct}%
        </p>
        <p className="text-lg font-medium" style={{ color: overallThreshold?.color }}>
          {overallThreshold?.label}
        </p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {scores.overallStatusDescription}
        </p>
        <p className="text-xs text-muted-foreground">
          {scores.answeredQuestions} of {scores.totalQuestions} questions answered
          ({Math.round(scores.completionPercentage * 100)}% complete)
        </p>
      </div>

      {/* Category Scores + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          {scores.categories.map(cat => (
            <CategoryScoreCard key={cat.category} score={cat} />
          ))}
        </div>
        <AssessmentRadarChart categories={scores.categories} />
      </div>

      {/* Use Case Readiness */}
      <UseCaseReadinessTable useCaseScores={scores.useCaseScores} />

      {/* Gap Analysis */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Gap Analysis</h3>
          {Object.keys(gapGuidance).length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRequestGuidance}
              disabled={isLoadingGuidance}
            >
              {isLoadingGuidance ? "Generating..." : "Get AI Guidance"}
            </Button>
          )}
        </div>
        <GapAnalysisSection
          questions={questions}
          answers={answers}
          gapGuidance={gapGuidance}
        />
      </div>

      {/* Export Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button onClick={onExportJSON} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export JSON
        </Button>
      </div>
    </div>
  );
}
