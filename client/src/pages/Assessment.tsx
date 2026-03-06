import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import AssessmentProgress from "@/components/assessment/AssessmentProgress";
import CategoryAssessment from "@/components/assessment/CategoryAssessment";
import AssessmentResults from "@/components/assessment/AssessmentResults";
import { calculateAssessmentScores } from "@/lib/assessment-calculator";
import { ASSESSMENT_QUESTIONS, CATEGORY_METADATA } from "@shared/assessment-questions";
import { apiRequest } from "@/lib/queryClient";
import type { AssessmentData, AssessmentQuestion, AssessmentAnswer, AssessmentCategory, MaturityLevel, CompositeAssessmentScore, UseCase } from "@shared/types";

// ---------------------------------------------------------------------------
// Local response types (mirrors server shape)
// ---------------------------------------------------------------------------
interface ScenarioData {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  useCases: UseCase[] | null;
  assessment?: AssessmentData;
  [key: string]: any;
}

interface ProjectResponse {
  id: string;
  name: string;
  companyName: string;
  industry: string;
  description?: string;
  status: string;
  activeScenario?: ScenarioData;
}

const CATEGORIES: AssessmentCategory[] = ["skills", "data", "infrastructure", "governance"];

export default function Assessment() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();

  // Fetch project + scenario data
  const { data: projectData, isLoading } = useQuery<ProjectResponse>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const project = projectData;
  const scenario = projectData?.activeScenario;
  const useCases = scenario?.useCases || [];

  // Local state for assessment
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<AssessmentAnswer[]>([]);
  const [gapGuidance, setGapGuidance] = useState<Record<string, string>>({});
  const [mappingStatus, setMappingStatus] = useState<string>("pending");
  const [activeTab, setActiveTab] = useState<string>("skills");
  const [isLoadingGuidance, setIsLoadingGuidance] = useState(false);

  // Initialize assessment data from scenario or create new
  useEffect(() => {
    if (!scenario) return;

    if (scenario.assessment) {
      setQuestions(scenario.assessment.questions);
      setAnswers(scenario.assessment.answers);
      setGapGuidance(scenario.assessment.gapGuidance || {});
      setMappingStatus(scenario.assessment.useCaseMappingStatus);
    } else {
      // Initialize new assessment
      const newQuestions: AssessmentQuestion[] = ASSESSMENT_QUESTIONS.map(q => ({
        ...q,
        useCasesImpacted: [],
      }));
      const newAnswers: AssessmentAnswer[] = newQuestions.map(q => ({
        questionId: q.id,
        score: null,
        notes: "",
      }));
      setQuestions(newQuestions);
      setAnswers(newAnswers);
      setMappingStatus("pending");
    }
  }, [scenario?.id]);

  // Compute scores (deterministic via HyperFormula)
  const scores: CompositeAssessmentScore | null = useMemo(() => {
    if (questions.length === 0 || answers.length === 0) return null;
    const answeredCount = answers.filter(a => a.score != null).length;
    if (answeredCount === 0) return null;
    return calculateAssessmentScores(questions, answers);
  }, [questions, answers]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: AssessmentData) => {
      if (!scenario?.id) return;
      return apiRequest("PUT", `/api/scenarios/${scenario.id}/section/assessment`, { data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
    },
  });

  // Auto-save (debounced)
  const saveAssessment = useCallback(() => {
    if (!scenario?.id || questions.length === 0) return;
    const data: AssessmentData = {
      version: 1,
      startedAt: scenario.assessment?.startedAt || new Date().toISOString(),
      completedAt: answers.every(a => a.score != null) ? new Date().toISOString() : null,
      questions,
      answers,
      scores,
      useCaseMappingStatus: mappingStatus as any,
      gapGuidance,
    };
    saveMutation.mutate(data);
  }, [scenario?.id, questions, answers, scores, mappingStatus, gapGuidance]);

  // Auto-save on answer changes (debounced)
  useEffect(() => {
    if (answers.length === 0) return;
    const timeout = setTimeout(saveAssessment, 2000);
    return () => clearTimeout(timeout);
  }, [answers, saveAssessment]);

  // Handle score change
  const handleScoreChange = useCallback((questionId: string, score: MaturityLevel) => {
    setAnswers(prev => prev.map(a =>
      a.questionId === questionId ? { ...a, score } : a
    ));
  }, []);

  // Handle notes change
  const handleNotesChange = useCallback((questionId: string, notes: string) => {
    setAnswers(prev => prev.map(a =>
      a.questionId === questionId ? { ...a, notes } : a
    ));
  }, []);

  // AI Use Case Mapping
  const runMapping = async () => {
    if (useCases.length === 0) {
      toast.error("Add use cases in Setup first before running the mapping.");
      return;
    }
    setMappingStatus("running");
    try {
      const res = await apiRequest("POST", "/api/ai/assessment-mapping", {
        useCases,
        questions: questions.map(q => ({ id: q.id, category: q.category, subCategory: q.subCategory, questionText: q.questionText })),
      });
      const result = await res.json();

      if (result.mappings) {
        setQuestions(prev => prev.map(q => ({
          ...q,
          useCasesImpacted: result.mappings[q.id] || [],
        })));
        setMappingStatus("complete");
        toast.success("Use case mapping complete!");
      }
    } catch (e) {
      setMappingStatus("error");
      toast.error("Failed to map use cases. Try again.");
    }
  };

  // AI Gap Guidance
  const requestGuidance = async () => {
    if (!scores) return;
    setIsLoadingGuidance(true);
    try {
      const gaps = questions
        .map(q => {
          const a = answers.find(ans => ans.questionId === q.id);
          if (!a?.score || a.score >= 3) return null;
          return { questionId: q.id, questionText: q.questionText, category: q.category, subCategory: q.subCategory, currentScore: a.score, gapSize: 4 - a.score };
        })
        .filter(Boolean);

      const res = await apiRequest("POST", "/api/ai/assessment-guidance", {
        gaps,
        companyName: project?.companyName,
        industry: project?.industry,
      });
      const result = await res.json();

      if (result.guidance) {
        setGapGuidance(result.guidance);
        toast.success("AI guidance generated!");
      }
    } catch (e) {
      toast.error("Failed to generate guidance.");
    } finally {
      setIsLoadingGuidance(false);
    }
  };

  // Export JSON
  const handleExportJSON = async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/projects/${projectId}/assessment-export`, {
        headers: { "X-Owner-Token": localStorage.getItem("owner_token") || "" },
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project?.companyName || "assessment"}-ai-assessment.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Export failed.");
    }
  };

  const answeredCount = answers.filter(a => a.score != null).length;

  if (isLoading) {
    return (
      <Layout projectId={projectId} activeTab="assess">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout projectId={projectId} companyName={project?.companyName} activeTab="assess">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Readiness Assessment</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Evaluate your organization across 4 dimensions. Score each question 1-5.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {useCases.length > 0 && mappingStatus !== "complete" && (
              <Button
                onClick={runMapping}
                disabled={mappingStatus === "running"}
                variant="outline"
                size="sm"
              >
                {mappingStatus === "running" ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Map Use Cases
              </Button>
            )}
            <Button
              onClick={saveAssessment}
              variant="outline"
              size="sm"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Progress */}
        <AssessmentProgress
          scores={scores}
          totalQuestions={questions.length}
          answeredQuestions={answeredCount}
        />

        {/* Category Tabs + Results */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            {CATEGORIES.map(cat => {
              const meta = CATEGORY_METADATA[cat];
              const catAnswered = answers.filter(a => {
                const q = questions.find(q2 => q2.id === a.questionId);
                return q?.category === cat && a.score != null;
              }).length;
              const catTotal = questions.filter(q => q.category === cat).length;
              return (
                <TabsTrigger key={cat} value={cat} className="text-xs sm:text-sm">
                  {meta.label}
                  <span className="ml-1 text-[10px] text-muted-foreground">
                    ({catAnswered}/{catTotal})
                  </span>
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="results" className="text-xs sm:text-sm">
              Results
            </TabsTrigger>
          </TabsList>

          {CATEGORIES.map(cat => (
            <TabsContent key={cat} value={cat}>
              <CategoryAssessment
                category={cat}
                questions={questions.filter(q => q.category === cat)}
                answers={answers}
                categoryScore={scores?.categories.find(c => c.category === cat)}
                onScoreChange={handleScoreChange}
                onNotesChange={handleNotesChange}
              />
            </TabsContent>
          ))}

          <TabsContent value="results">
            {scores ? (
              <AssessmentResults
                scores={scores}
                questions={questions}
                answers={answers}
                gapGuidance={gapGuidance}
                projectId={projectId || ""}
                onExportJSON={handleExportJSON}
                onRequestGuidance={requestGuidance}
                isLoadingGuidance={isLoadingGuidance}
              />
            ) : (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <p className="text-muted-foreground">
                  Answer at least one question to see results.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
