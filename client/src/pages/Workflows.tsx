import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkflowComparison } from "@/components/workflow/WorkflowComparison";
import { WorkflowMetricsRow } from "@/components/workflow/WorkflowMetricsRow";
import { UseCaseBenefitSummary } from "@/components/workflow/UseCaseBenefitSummary";
import {
  calculateWorkflowMetrics,
  destroyCalculator,
} from "@/lib/workflow-calculator";
import {
  Sparkles,
  Save,
  Loader2,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type {
  WorkflowMap,
  WorkflowNode,
  TargetWorkflowNode,
  InteractiveWorkflowNode,
  InteractiveWorkflowMap,
  WorkflowLiveMetrics,
  UseCase,
} from "@shared/types";
import AIHintPanel from "@/components/AIHintPanel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectResponse {
  id: string;
  name: string;
  companyName: string;
  industry: string;
  description?: string;
  status: string;
  activeScenario?: ScenarioData;
  scenarios?: ScenarioData[];
}

interface ScenarioData {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  useCases: UseCase[] | null;
  workflowMaps: WorkflowMap[] | null;
  completedSteps: number[];
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Helpers: Convert legacy nodes to interactive format
// ---------------------------------------------------------------------------

function toInteractiveNode(
  node: WorkflowNode | TargetWorkflowNode,
  index: number,
): InteractiveWorkflowNode {
  const target = node as TargetWorkflowNode;
  const interactive = node as InteractiveWorkflowNode;
  return {
    ...node,
    isAIEnabled: target.isAIEnabled ?? false,
    isHumanInTheLoop: target.isHumanInTheLoop ?? false,
    aiCapabilities: target.aiCapabilities ?? [],
    automationLevel: target.automationLevel ?? "manual",
    employeeCount: interactive.employeeCount ?? 1,
    avgHourlyCost: interactive.avgHourlyCost ?? 75,
    hoursPerTask: interactive.hoursPerTask ?? 1,
    tasksPerMonth: interactive.tasksPerMonth ?? 20,
    position: interactive.position ?? { x: 0, y: index * 150 },
    // Enhanced fields — pass through if present, no defaults needed (optional)
    stepCategory: interactive.stepCategory,
    department: interactive.department,
    isDepartmentHandoff: interactive.isDepartmentHandoff,
    systemDetails: interactive.systemDetails,
    outputType: interactive.outputType,
    epochCategory: interactive.epochCategory,
    hitlDetails: interactive.hitlDetails,
    desiredAIOutputType: interactive.desiredAIOutputType,
    aiApproach: interactive.aiApproach,
    aiApproachRationale: interactive.aiApproachRationale,
    burdenMultiplier: interactive.burdenMultiplier ?? 1.35,
  };
}

function workflowMapToInteractive(wm: WorkflowMap): InteractiveWorkflowMap {
  return {
    ...wm,
    builderVersion: 1,
    lastEditedAt: new Date().toISOString(),
    isUserModified: false,
    currentStateInteractive: (wm.currentState || [])
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((n, i) => toInteractiveNode(n, i)),
    targetStateInteractive: (wm.targetState || [])
      .sort((a, b) => a.stepNumber - b.stepNumber)
      .map((n, i) => toInteractiveNode(n, i)),
  };
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Workflows() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Data fetching
  const { data: project } = useQuery<ProjectResponse>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const scenario = project?.activeScenario;
  const workflowMaps: WorkflowMap[] =
    (scenario?.workflowMaps as WorkflowMap[]) || [];
  const useCases: UseCase[] = (scenario?.useCases as UseCase[]) || [];

  // Local state
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(
    null,
  );
  const [liveMetrics, setLiveMetrics] = useState<WorkflowLiveMetrics | null>(
    null,
  );

  // Convert workflow maps to interactive format
  const [interactiveMaps, setInteractiveMaps] = useState<
    Map<string, InteractiveWorkflowMap>
  >(new Map());

  // Sync imported workflow data to interactive maps
  useEffect(() => {
    if (workflowMaps.length > 0 && interactiveMaps.size === 0) {
      const entries = new Map<string, InteractiveWorkflowMap>();
      for (const wm of workflowMaps) {
        entries.set(wm.useCaseId, workflowMapToInteractive(wm));
      }
      setInteractiveMaps(entries);
    }
  }, [workflowMaps, interactiveMaps.size]);

  // Effective selection
  const effectiveSelectedId =
    selectedUseCaseId ||
    workflowMaps[0]?.useCaseId ||
    useCases[0]?.id ||
    null;

  const selectedUseCase = useCases.find((uc) => uc.id === effectiveSelectedId);
  const selectedInteractiveMap = effectiveSelectedId
    ? interactiveMaps.get(effectiveSelectedId)
    : undefined;

  const selectedWorkflowMap = workflowMaps.find(
    (wm) => wm.useCaseId === effectiveSelectedId,
  );

  const currentNodes =
    selectedInteractiveMap?.currentStateInteractive || [];
  const targetNodes =
    selectedInteractiveMap?.targetStateInteractive || [];

  // Recalculate metrics when nodes change
  useEffect(() => {
    if (currentNodes.length > 0 || targetNodes.length > 0) {
      const metrics = calculateWorkflowMetrics(currentNodes, targetNodes);
      setLiveMetrics(metrics);
    } else {
      setLiveMetrics(null);
    }
  }, [currentNodes, targetNodes]);

  // Cleanup calculator on unmount
  useEffect(() => {
    return () => destroyCalculator();
  }, []);

  // -----------------------------------------------------------------------
  // Save mutation
  // -----------------------------------------------------------------------

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!scenario) throw new Error("No active scenario");
      // Use 'any' for the save payload since we include enhanced fields
      // beyond what WorkflowMap strictly types (they're stored in JSONB)
      const mapsToSave: any[] = [];

      for (const imap of Array.from(interactiveMaps.values())) {
        mapsToSave.push({
          useCaseId: imap.useCaseId,
          useCaseName: imap.useCaseName,
          agenticPattern: imap.agenticPattern,
          patternRationale: imap.patternRationale,
          currentState: (
            imap.currentStateInteractive ||
            (imap.currentState as InteractiveWorkflowNode[]) ||
            []
          ).map((n) => ({
            id: n.id,
            stepNumber: n.stepNumber,
            name: n.name,
            description: n.description,
            actorType: n.actorType,
            actorName: n.actorName,
            duration: n.duration,
            systems: n.systems,
            isBottleneck: n.isBottleneck,
            isDecisionPoint: n.isDecisionPoint,
            painPoints: n.painPoints,
            // Enhanced fields
            employeeCount: n.employeeCount,
            avgHourlyCost: n.avgHourlyCost,
            hoursPerTask: n.hoursPerTask,
            tasksPerMonth: n.tasksPerMonth,
            frictionType: n.frictionType,
            stepCategory: n.stepCategory,
            department: n.department,
            isDepartmentHandoff: n.isDepartmentHandoff,
            systemDetails: n.systemDetails,
            outputType: n.outputType,
            burdenMultiplier: n.burdenMultiplier,
          })),
          targetState: (
            imap.targetStateInteractive ||
            (imap.targetState as InteractiveWorkflowNode[]) ||
            []
          ).map((n) => ({
            id: n.id,
            stepNumber: n.stepNumber,
            name: n.name,
            description: n.description,
            actorType: n.actorType,
            actorName: n.actorName,
            duration: n.duration,
            systems: n.systems,
            isBottleneck: n.isBottleneck,
            isDecisionPoint: n.isDecisionPoint,
            painPoints: n.painPoints,
            isAIEnabled: n.isAIEnabled,
            isHumanInTheLoop: n.isHumanInTheLoop,
            aiCapabilities: n.aiCapabilities,
            automationLevel: n.automationLevel,
            hitlCheckpoint: n.hitlCheckpoint,
            // Enhanced fields
            employeeCount: n.employeeCount,
            avgHourlyCost: n.avgHourlyCost,
            hoursPerTask: n.hoursPerTask,
            tasksPerMonth: n.tasksPerMonth,
            stepCategory: n.stepCategory,
            department: n.department,
            isDepartmentHandoff: n.isDepartmentHandoff,
            systemDetails: n.systemDetails,
            outputType: n.outputType,
            epochCategory: n.epochCategory,
            hitlDetails: n.hitlDetails,
            desiredAIOutputType: n.desiredAIOutputType,
            aiApproach: n.aiApproach,
            aiApproachRationale: n.aiApproachRationale,
            burdenMultiplier: n.burdenMultiplier,
          })),
          comparisonMetrics: imap.comparisonMetrics,
          desiredOutcomes: imap.desiredOutcomes,
          dataTypes: imap.dataTypes,
          integrations: imap.integrations,
        });
      }

      const res = await apiRequest(
        "PUT",
        `/api/scenarios/${scenario.id}/section/workflow_maps`,
        { data: mapsToSave },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
      toast.success("Workflows saved");
    },
    onError: (error: Error) => {
      toast.error(`Save failed: ${error.message}`);
    },
  });

  // -----------------------------------------------------------------------
  // Unsaved changes warning
  // -----------------------------------------------------------------------

  const hasUnsavedChanges = useCallback(() => {
    return Array.from(interactiveMaps.values()).some((m) => m.isUserModified);
  }, [interactiveMaps]);

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasUnsavedChanges()) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // -----------------------------------------------------------------------
  // Generate AI Workflows
  // -----------------------------------------------------------------------

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!scenario) throw new Error("No active scenario");
      const res = await apiRequest("POST", "/api/ai/generate-workflow", {
        scenarioId: scenario.id,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      // Log debug info if available
      if (data?.debug) {
        console.log("[Workflow Gen Debug]", JSON.stringify(data.debug, null, 2));
      }
      // Reset interactive maps so they re-sync from server
      setInteractiveMaps(new Map());
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
      const totalSteps = data?.workflowMaps?.reduce(
        (sum: number, m: any) => sum + (m.currentState?.length || 0) + (m.targetState?.length || 0),
        0
      ) || 0;
      if (totalSteps > 0) {
        toast.success(`Workflows generated — ${totalSteps} steps created`);
      } else {
        toast.error("Generation completed but no steps were created. Check console for details.");
        console.error("[Workflow Gen] Response:", JSON.stringify(data, null, 2).substring(0, 2000));
      }
    },
    onError: (error: Error) => {
      toast.error(`Generation failed: ${error.message}`);
    },
  });

  const useCaseCount = useCases.length;
  const hasWorkflows = workflowMaps.length > 0;
  const hasWorkflowForSelected = !!selectedWorkflowMap;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <Layout
      projectId={projectId}
      companyName={project?.companyName}
      activeTab="workshop"
    >
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
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
            Compare current workflows against AI-powered alternatives. Edit
            staffing and metrics to see real-time cost impact.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || interactiveMaps.size === 0}
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
              ? hasWorkflows
                ? "Regenerating..."
                : `Generating ${useCaseCount} workflows...`
              : hasWorkflows
                ? "Regenerate"
                : "Generate Workflows"}
          </Button>
        </div>
      </div>

      {/* Generation progress banner */}
      {generateMutation.isPending && (
        <div className="rounded-xl border border-[#02a2fd]/30 bg-[#02a2fd]/5 dark:bg-[#02a2fd]/10 px-6 py-4 mb-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#02a2fd]" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Generating workflows for {useCaseCount} use case
              {useCaseCount !== 1 ? "s" : ""}...
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Each use case gets a current-state vs AI-powered process
              comparison. This may take a minute.
            </p>
          </div>
        </div>
      )}

      {/* Use Case Tabs */}
      {useCases.length > 0 && (
        <div className="flex items-center gap-1.5 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
          {useCases.map((uc) => {
            const isActive = uc.id === effectiveSelectedId;
            const hasWf = workflowMaps.some(
              (wm) => wm.useCaseId === uc.id,
            );
            const iMap = interactiveMaps.get(uc.id);
            return (
              <button
                key={uc.id}
                onClick={() => setSelectedUseCaseId(uc.id)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? "bg-[#02a2fd]/10 text-[#02a2fd] border-[#02a2fd]/30 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80 border-transparent"
                }`}
              >
                {uc.name}
                {!hasWf && (
                  <span className="ml-1.5 text-xs text-muted-foreground">
                    (no workflow)
                  </span>
                )}
                {iMap?.isUserModified && (
                  <span className="ml-1.5 text-amber-500 text-xs">*</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected Use Case Description */}
      {selectedUseCase && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-lg font-bold text-foreground">
              {selectedUseCase.name}
            </h2>
            {selectedUseCase.agenticPattern && (
              <Badge
                variant="outline"
                className="text-xs font-normal"
              >
                {selectedUseCase.agenticPattern}
              </Badge>
            )}
          </div>
          {selectedUseCase.description && (
            <p className="text-sm text-muted-foreground max-w-3xl">
              {selectedUseCase.description}
            </p>
          )}
        </div>
      )}

      {/* AI Hints */}
      <div className="mb-6">
        <AIHintPanel
          section="workflows"
          sectionLabel="Workflow Mapping"
          context={selectedUseCase?.name}
          scenarioId={scenario?.id}
          projectId={projectId}
        />
      </div>

      {/* Main Content Area */}
      {hasWorkflowForSelected ? (
        <div className="space-y-6">
          {/* Live Metrics Row */}
          <WorkflowMetricsRow
            metrics={liveMetrics}
            currentStepCount={currentNodes.length}
            targetStepCount={targetNodes.length}
          />

          {/* Side-by-side Workflow Comparison */}
          <WorkflowComparison
            currentNodes={currentNodes}
            targetNodes={targetNodes}
            onCurrentChange={(nodes) => {
              if (!effectiveSelectedId) return;
              setInteractiveMaps((prev) => {
                const next = new Map(prev);
                const existing = next.get(effectiveSelectedId);
                if (!existing) return next;
                next.set(effectiveSelectedId, {
                  ...existing,
                  currentStateInteractive: nodes,
                  isUserModified: true,
                  lastEditedAt: new Date().toISOString(),
                });
                return next;
              });
            }}
            onTargetChange={(nodes) => {
              if (!effectiveSelectedId) return;
              setInteractiveMaps((prev) => {
                const next = new Map(prev);
                const existing = next.get(effectiveSelectedId);
                if (!existing) return next;
                next.set(effectiveSelectedId, {
                  ...existing,
                  targetStateInteractive: nodes,
                  isUserModified: true,
                  lastEditedAt: new Date().toISOString(),
                });
                return next;
              });
            }}
          />

          {/* Benefit Summary */}
          <UseCaseBenefitSummary
            metrics={liveMetrics}
            desiredOutcomes={selectedWorkflowMap?.desiredOutcomes || []}
            dataTypes={selectedWorkflowMap?.dataTypes || []}
            integrations={selectedWorkflowMap?.integrations || []}
            primaryKpi={selectedWorkflowMap?.comparisonMetrics?.qualityImprovement?.before ? "Quality Improvement" : undefined}
            kpiBefore={selectedWorkflowMap?.comparisonMetrics?.qualityImprovement?.before}
            kpiAfter={selectedWorkflowMap?.comparisonMetrics?.qualityImprovement?.after}
          />
        </div>
      ) : (
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
            {useCaseCount === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-foreground">
                  No use cases defined
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Go back to Setup to import or add use cases before generating
                  workflows.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/project/${projectId}`)}
                  className="mt-2 gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Setup
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-foreground">
                  No workflows yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Click "Generate Workflows" to create AI-powered workflow
                  comparisons for this use case.
                </p>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
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
              </>
            )}
          </div>
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
      {(saveMutation.isError || generateMutation.isError) && (
        <div className="fixed bottom-20 right-6 bg-destructive/10 border border-destructive/30 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-destructive z-50">
          <AlertCircle className="w-4 h-4" />
          {generateMutation.isError
            ? "Failed to generate workflows. Try again."
            : "Failed to save. Try again."}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={() => navigate(`/project/${projectId}`)}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Setup
        </Button>
        <Button
          onClick={() => navigate(`/project/${projectId}/review`)}
          className="gap-2 text-white"
          style={{
            background: "linear-gradient(135deg, #001278, #02a2fd)",
          }}
        >
          Review
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Layout>
  );
}
