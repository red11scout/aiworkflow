import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Clock,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Target,
  Save,
  Loader2,
} from "lucide-react";
import type {
  WorkflowMap,
  WorkflowNode,
  TargetWorkflowNode,
  UseCase,
  BusinessFunction,
} from "@shared/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMetricValue(value: string | undefined, fallback: string): string {
  if (!value || value === "0" || value === "0%") return fallback;
  return value;
}

function getActorBadge(node: WorkflowNode) {
  if (node.actorType === "ai_agent") {
    return {
      label: "AI-Powered",
      className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    };
  }
  if (node.actorType === "system") {
    return {
      label: "System",
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    };
  }
  return {
    label: "Manual",
    className: "bg-zinc-800 text-zinc-100 dark:bg-zinc-700 dark:text-zinc-200",
  };
}

function getTargetActorBadge(node: TargetWorkflowNode) {
  if (node.isAIEnabled || node.actorType === "ai_agent") {
    return {
      label: "AI-Powered",
      className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    };
  }
  if (node.isHumanInTheLoop) {
    return {
      label: "Human-in-the-Loop",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    };
  }
  return {
    label: node.actorType === "human" ? "Manual" : "System",
    className: "bg-zinc-800 text-zinc-100 dark:bg-zinc-700 dark:text-zinc-200",
  };
}

// ---------------------------------------------------------------------------
// Metric Card
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-2xl font-bold tracking-tight ${colorClass}`}>
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Current Process Step Card
// ---------------------------------------------------------------------------

function CurrentStepCard({ node }: { node: WorkflowNode }) {
  const actor = getActorBadge(node);
  const hasErrors = node.painPoints && node.painPoints.length > 0;
  const isBottleneck = node.isBottleneck;

  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        hasErrors || isBottleneck
          ? "border-red-500/50 bg-red-50 dark:bg-red-950/20"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-snug">
            {node.name}
          </p>
          {node.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {node.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-2 mt-3">
        <Badge variant="outline" className="gap-1 text-xs font-normal">
          <Clock className="w-3 h-3" />
          {node.duration}
        </Badge>
        <Badge className={`text-xs font-medium border-0 ${actor.className}`}>
          {actor.label}
        </Badge>
        {(hasErrors || isBottleneck) && (
          <Badge className="text-xs font-medium border border-red-400 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 dark:border-red-600">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {isBottleneck ? "Bottleneck" : "Error-prone"}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI-Powered Process Step Card
// ---------------------------------------------------------------------------

function TargetStepCard({ node }: { node: TargetWorkflowNode }) {
  const actor = getTargetActorBadge(node);

  return (
    <div className="rounded-xl border border-green-500/30 bg-green-50 dark:bg-green-950/20 p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm leading-snug">
            {node.name}
          </p>
          {node.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {node.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center flex-wrap gap-2 mt-3">
        <Badge variant="outline" className="gap-1 text-xs font-normal border-green-500/40">
          <Clock className="w-3 h-3" />
          {node.duration}
        </Badge>
        <Badge className={`text-xs font-medium border-0 ${actor.className}`}>
          {actor.label}
        </Badge>
        {node.automationLevel && node.automationLevel !== "manual" && (
          <Badge variant="outline" className="text-xs font-normal border-green-500/40 text-green-700 dark:text-green-300">
            {node.automationLevel === "full"
              ? "Fully Automated"
              : node.automationLevel === "assisted"
                ? "AI-Assisted"
                : "Supervised"}
          </Badge>
        )}
      </div>
      {node.aiCapabilities && node.aiCapabilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {node.aiCapabilities.map((cap: string, i: number) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
            >
              {cap}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step Connector Arrow
// ---------------------------------------------------------------------------

function StepArrow({ color = "text-muted-foreground/40" }: { color?: string }) {
  return (
    <div className="flex justify-center py-1">
      <ChevronDown className={`w-5 h-5 ${color}`} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workflow Panel for a single use case
// ---------------------------------------------------------------------------

function WorkflowPanel({
  workflowMap,
  useCase,
  businessFunctions,
}: {
  workflowMap: WorkflowMap;
  useCase?: UseCase;
  businessFunctions?: BusinessFunction[];
}) {
  const metrics = workflowMap.comparisonMetrics;

  const matchedFunction = useMemo(() => {
    if (!businessFunctions || !useCase) return null;
    return businessFunctions.find(
      (fn) =>
        fn.function === useCase.function ||
        fn.subFunction === useCase.subFunction,
    );
  }, [businessFunctions, useCase]);

  const currentSteps = [...(workflowMap.currentState || [])].sort(
    (a, b) => a.stepNumber - b.stepNumber,
  );
  const targetSteps = [...(workflowMap.targetState || [])].sort(
    (a, b) => a.stepNumber - b.stepNumber,
  );

  return (
    <div className="space-y-6">
      {/* Use Case Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {workflowMap.useCaseName}
        </h2>
        {useCase?.description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            {useCase.description}
          </p>
        )}
        {workflowMap.agenticPattern && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              Pattern: {workflowMap.agenticPattern}
            </Badge>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Time Reduction"
            value={formatMetricValue(
              typeof metrics.timeReduction === "string"
                ? metrics.timeReduction
                : metrics.timeReduction?.improvement,
              "--",
            )}
            colorClass="text-green-600 dark:text-green-400"
          />
          <MetricCard
            label="Error Reduction"
            value={formatMetricValue(
              typeof metrics.qualityImprovement === "string"
                ? metrics.qualityImprovement
                : metrics.qualityImprovement?.improvement,
              "--",
            )}
            colorClass="text-orange-500 dark:text-orange-400"
          />
          <MetricCard
            label="Annual Savings"
            value={formatMetricValue(
              typeof metrics.costReduction === "string"
                ? metrics.costReduction
                : metrics.costReduction?.improvement,
              "--",
            )}
            colorClass="text-[#02a2fd]"
          />
          <MetricCard
            label="Throughput Increase"
            value={formatMetricValue(
              typeof metrics.throughputIncrease === "string"
                ? metrics.throughputIncrease
                : metrics.throughputIncrease?.improvement,
              "--",
            )}
            colorClass="text-red-500 dark:text-red-400"
          />
        </div>
      )}

      {/* Side-by-Side Process Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Process */}
        <div className="space-y-0">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-semibold text-foreground">
              Current Process
            </h3>
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-0 text-xs">
              Manual
            </Badge>
          </div>
          <div className="space-y-0">
            {currentSteps.map((node, i) => (
              <div key={node.id}>
                <CurrentStepCard node={node} />
                {i < currentSteps.length - 1 && <StepArrow />}
              </div>
            ))}
            {currentSteps.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No current process steps generated yet.
              </div>
            )}
          </div>
        </div>

        {/* AI-Powered Process */}
        <div className="space-y-0">
          <div className="flex items-center gap-3 mb-4">
            <h3 className="text-base font-semibold text-foreground">
              AI-Powered Process
            </h3>
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-0 text-xs">
              Automated
            </Badge>
          </div>
          <div className="space-y-0">
            {targetSteps.map((node, i) => (
              <div key={node.id}>
                <TargetStepCard node={node} />
                {i < targetSteps.length - 1 && (
                  <StepArrow color="text-green-500/40" />
                )}
              </div>
            ))}
            {targetSteps.length === 0 && (
              <div className="rounded-xl border border-dashed border-green-500/30 p-8 text-center text-sm text-muted-foreground">
                No AI-powered process steps generated yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Impact Footer */}
      {matchedFunction && matchedFunction.kpiName && (
        <div className="rounded-xl border border-border bg-muted/50 px-6 py-4 flex items-center gap-3">
          <Target className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">
            Primary KPI Impact:
          </span>
          <span className="text-sm font-semibold text-foreground">
            {matchedFunction.kpiName}
          </span>
          {matchedFunction.targetValue && matchedFunction.baselineValue && (
            <Badge
              variant="outline"
              className="ml-auto text-xs font-semibold text-green-600 dark:text-green-400 border-green-500/40"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              {matchedFunction.baselineValue} &rarr; {matchedFunction.targetValue}
            </Badge>
          )}
        </div>
      )}

      {/* Desired Outcomes / Data / Integrations */}
      {(workflowMap.desiredOutcomes?.length || workflowMap.dataTypes?.length || workflowMap.integrations?.length) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {workflowMap.desiredOutcomes && workflowMap.desiredOutcomes.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Desired Outcomes
              </h4>
              <ul className="space-y-1">
                {workflowMap.desiredOutcomes.map((o: string, i: number) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">&#8226;</span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {workflowMap.dataTypes && workflowMap.dataTypes.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Data Types
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {workflowMap.dataTypes.map((d: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {d}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {workflowMap.integrations && workflowMap.integrations.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Integrations
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {workflowMap.integrations.map((intg: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {intg}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Workflows() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);

  const workflowMaps: WorkflowMap[] = activeScenario?.workflowMaps || [];
  const useCases: UseCase[] = activeScenario?.useCases || [];
  const businessFunctions: BusinessFunction[] =
    activeScenario?.businessFunctions || [];

  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(
    null,
  );

  const effectiveSelectedId =
    selectedUseCaseId || workflowMaps[0]?.useCaseId || useCases[0]?.id || null;
  const selectedWorkflow = workflowMaps.find(
    (wm) => wm.useCaseId === effectiveSelectedId,
  );
  const selectedUseCase = useCases.find(
    (uc) => uc.id === effectiveSelectedId,
  );

  // --- Save ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "PUT",
        `/api/scenarios/${activeScenario?.id}/section/workflow_maps`,
        { data: workflowMaps },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  // --- Generate ---
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/generate-workflow", {
        scenarioId: activeScenario?.id,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  const useCaseCount = useCases.length;

  // --- Mark Complete & Navigate ---
  const markComplete = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/scenarios/${activeScenario?.id}/complete-step`,
        { step: 6, section: "workflow_maps" },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  const handleNext = () => {
    markComplete.mutate();
    navigate(`/project/${id}/readiness`);
  };

  return (
    <Layout
      projectId={id}
      companyName={(project as any)?.companyName}
      completedSteps={activeScenario?.completedSteps}
    >
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #001278, #02a2fd)",
              }}
            >
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            Workflow Visualization
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Compare current manual processes with AI-powered workflows for each
            use case. See step-by-step how AI transforms your operations.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || workflowMaps.length === 0}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || useCaseCount === 0}
            className="gap-2 text-white"
            style={{
              background: "linear-gradient(135deg, #001278, #02a2fd)",
            }}
          >
            <Sparkles
              className={`w-4 h-4 ${generateMutation.isPending ? "animate-pulse" : ""}`}
            />
            {generateMutation.isPending
              ? `Generating ${useCaseCount} workflows...`
              : "Generate Workflows"}
          </Button>
        </div>
      </div>

      {/* Generation progress banner */}
      {generateMutation.isPending && (
        <div className="rounded-xl border border-[#02a2fd]/30 bg-[#02a2fd]/5 dark:bg-[#02a2fd]/10 px-6 py-4 mb-8 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#02a2fd]" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Generating AI-powered workflows for {useCaseCount} use case{useCaseCount !== 1 ? "s" : ""}...
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This may take a minute. Each use case gets a detailed current-state vs AI-powered process comparison.
            </p>
          </div>
        </div>
      )}

      {/* Use Case Selector Tabs */}
      {workflowMaps.length > 0 && (
        <div className="flex items-center gap-1.5 mb-8 overflow-x-auto pb-1 -mx-1 px-1">
          {workflowMaps.map((wm) => {
            const isActive = wm.useCaseId === effectiveSelectedId;
            return (
              <button
                key={wm.useCaseId}
                onClick={() => setSelectedUseCaseId(wm.useCaseId)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? "bg-[#02a2fd]/10 text-[#02a2fd] border-[#02a2fd]/30 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80 border-transparent"
                }`}
              >
                {wm.useCaseName || wm.useCaseId}
              </button>
            );
          })}
        </div>
      )}

      {/* Workflow Content */}
      {workflowMaps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #001278, #02a2fd)",
              }}
            >
              <GitBranch className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No workflows generated yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Click "Generate Workflows" to use AI to create current-state and
              AI-powered workflow maps from your defined use cases.
            </p>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || useCaseCount === 0}
              className="mt-2 gap-2 text-white"
              style={{
                background: "linear-gradient(135deg, #001278, #02a2fd)",
              }}
            >
              <Sparkles
                className={`w-4 h-4 ${generateMutation.isPending ? "animate-pulse" : ""}`}
              />
              {generateMutation.isPending
                ? `Generating ${useCaseCount} workflows...`
                : "Generate Workflows"}
            </Button>
          </div>
        </div>
      ) : selectedWorkflow ? (
        <WorkflowPanel
          workflowMap={selectedWorkflow}
          useCase={selectedUseCase}
          businessFunctions={businessFunctions}
        />
      ) : (
        <div className="rounded-xl border border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select a use case above to view its workflow comparison.
          </p>
        </div>
      )}

      {/* Status indicators */}
      {saveMutation.isPending && (
        <div className="fixed bottom-20 right-6 bg-card border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground z-50">
          <Loader2
            className="w-4 h-4 animate-spin"
            style={{ color: "#02a2fd" }}
          />
          Saving...
        </div>
      )}

      {saveMutation.isSuccess && !saveMutation.isPending && (
        <div className="fixed bottom-20 right-6 bg-green-50 dark:bg-green-950/30 border border-green-500/30 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-green-600 dark:text-green-400 z-50 animate-in fade-in duration-300">
          <Save className="w-4 h-4" />
          Saved successfully
        </div>
      )}

      {(saveMutation.isError || generateMutation.isError) && (
        <div className="fixed bottom-20 right-6 bg-destructive/10 border border-destructive/30 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-destructive z-50">
          <AlertCircle className="w-4 h-4" />
          {generateMutation.isError
            ? "Failed to generate workflows. Please try again."
            : "Failed to save. Please try again."}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={() => navigate(`/project/${id}/benefits`)}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Benefits
        </Button>
        <Button
          onClick={handleNext}
          className="gap-2 text-white"
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          disabled={markComplete.isPending}
        >
          Readiness
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Layout>
  );
}
