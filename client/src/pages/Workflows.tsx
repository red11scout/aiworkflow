import { useState, useCallback, useMemo, useEffect } from "react";
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
  Sparkles,
  Save,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { WorkflowCanvas, MetricsBar, NodePropertiesPanel } from "@/components/workflow";
import { calculateWorkflowMetrics, destroyCalculator } from "@/lib/workflow-calculator";
import type {
  WorkflowMap,
  WorkflowNode,
  TargetWorkflowNode,
  InteractiveWorkflowNode,
  InteractiveWorkflowMap,
  WorkflowLiveMetrics,
  UseCase,
} from "@shared/types";

// ---------------------------------------------------------------------------
// Helpers: Convert legacy nodes to interactive format
// ---------------------------------------------------------------------------

function toInteractiveNode(
  node: WorkflowNode | TargetWorkflowNode,
  index: number,
): InteractiveWorkflowNode {
  const target = node as TargetWorkflowNode;
  return {
    ...node,
    isAIEnabled: target.isAIEnabled ?? false,
    isHumanInTheLoop: target.isHumanInTheLoop ?? false,
    aiCapabilities: target.aiCapabilities ?? [],
    automationLevel: target.automationLevel ?? "manual",
    employeeCount: 1,
    avgHourlyCost: 75,
    hoursPerTask: 1,
    tasksPerMonth: 20,
    position: { x: 0, y: index * 150 },
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
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Data fetching
  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);

  const workflowMaps: WorkflowMap[] = activeScenario?.workflowMaps || [];
  const useCases: UseCase[] = activeScenario?.useCases || [];

  // Local state
  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<InteractiveWorkflowNode | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<WorkflowLiveMetrics | null>(null);

  // Convert workflow maps to interactive format
  const [interactiveMaps, setInteractiveMaps] = useState<Map<string, InteractiveWorkflowMap>>(new Map());

  // Sync imported workflow data → interactive maps
  useEffect(() => {
    if (workflowMaps.length > 0 && interactiveMaps.size === 0) {
      const mapEntries = new Map<string, InteractiveWorkflowMap>();
      for (const wm of workflowMaps) {
        mapEntries.set(wm.useCaseId, workflowMapToInteractive(wm));
      }
      setInteractiveMaps(mapEntries);
    }
  }, [workflowMaps, interactiveMaps.size]);

  // Effective selection
  const effectiveSelectedId =
    selectedUseCaseId || workflowMaps[0]?.useCaseId || useCases[0]?.id || null;

  const selectedInteractiveMap = effectiveSelectedId
    ? interactiveMaps.get(effectiveSelectedId)
    : undefined;

  const currentNodes = selectedInteractiveMap?.currentStateInteractive || [];
  const targetNodes = selectedInteractiveMap?.targetStateInteractive || [];

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

  // --- Node update handlers ---
  const handleCurrentNodesChange = useCallback(
    (nodes: InteractiveWorkflowNode[]) => {
      if (!effectiveSelectedId) return;
      setInteractiveMaps((prev) => {
        const next = new Map(prev);
        const existing = next.get(effectiveSelectedId);
        if (existing) {
          next.set(effectiveSelectedId, {
            ...existing,
            currentStateInteractive: nodes,
            isUserModified: true,
            lastEditedAt: new Date().toISOString(),
          });
        }
        return next;
      });
    },
    [effectiveSelectedId],
  );

  const handleTargetNodesChange = useCallback(
    (nodes: InteractiveWorkflowNode[]) => {
      if (!effectiveSelectedId) return;
      setInteractiveMaps((prev) => {
        const next = new Map(prev);
        const existing = next.get(effectiveSelectedId);
        if (existing) {
          next.set(effectiveSelectedId, {
            ...existing,
            targetStateInteractive: nodes,
            isUserModified: true,
            lastEditedAt: new Date().toISOString(),
          });
        }
        return next;
      });
    },
    [effectiveSelectedId],
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<InteractiveWorkflowNode>) => {
      if (!effectiveSelectedId) return;
      setInteractiveMaps((prev) => {
        const next = new Map(prev);
        const existing = next.get(effectiveSelectedId);
        if (!existing) return next;

        const updateNodes = (nodes: InteractiveWorkflowNode[]) =>
          nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n));

        next.set(effectiveSelectedId, {
          ...existing,
          currentStateInteractive: updateNodes(existing.currentStateInteractive || []),
          targetStateInteractive: updateNodes(existing.targetStateInteractive || []),
          isUserModified: true,
          lastEditedAt: new Date().toISOString(),
        });
        return next;
      });

      // Update selected node state too
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode((prev) => (prev ? { ...prev, ...updates } : null));
      }
    },
    [effectiveSelectedId, selectedNode],
  );

  // --- Save: convert interactive maps back to WorkflowMap[] ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      const mapsToSave: WorkflowMap[] = [];
      for (const imap of Array.from(interactiveMaps.values())) {
        mapsToSave.push({
          useCaseId: imap.useCaseId,
          useCaseName: imap.useCaseName,
          agenticPattern: imap.agenticPattern,
          patternRationale: imap.patternRationale,
          currentState: (imap.currentStateInteractive || imap.currentState || []).map((n: WorkflowNode | InteractiveWorkflowNode) => ({
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
          })),
          targetState: (imap.targetStateInteractive || imap.targetState || []).map((n: TargetWorkflowNode | InteractiveWorkflowNode) => ({
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
          })),
          comparisonMetrics: imap.comparisonMetrics,
          desiredOutcomes: imap.desiredOutcomes,
          dataTypes: imap.dataTypes,
          integrations: imap.integrations,
        });
      }

      const res = await apiRequest(
        "PUT",
        `/api/scenarios/${activeScenario?.id}/section/workflow_maps`,
        { data: mapsToSave },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  // --- Generate AI Workflows ---
  const generateMutation = useMutation({
    mutationFn: async () => {
      // If user has modified current state, send it as context
      const currentStateContext = effectiveSelectedId
        ? interactiveMaps.get(effectiveSelectedId)?.currentStateInteractive
        : undefined;

      const res = await apiRequest("POST", "/api/ai/generate-workflow", {
        scenarioId: activeScenario?.id,
        currentStateContext: currentStateContext && currentStateContext.length > 0
          ? currentStateContext
          : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      // Reset interactive maps so they re-sync from server
      setInteractiveMaps(new Map());
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

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

  const useCaseCount = useCases.length;

  return (
    <Layout
      projectId={id}
      companyName={(project as any)?.companyName}
      completedSteps={activeScenario?.completedSteps}
    >
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
            >
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            Interactive Workflow Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Edit current workflows and AI-powered alternatives. Drag nodes, adjust staffing, add HITL checkpoints — metrics update in real-time.
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
            style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          >
            <Sparkles className={`w-4 h-4 ${generateMutation.isPending ? "animate-pulse" : ""}`} />
            {generateMutation.isPending
              ? workflowMaps.length > 0
                ? "Regenerating..."
                : `Generating ${useCaseCount} workflows...`
              : workflowMaps.length > 0
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
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          {workflowMaps.map((wm) => {
            const isActive = wm.useCaseId === effectiveSelectedId;
            const iMap = interactiveMaps.get(wm.useCaseId);
            return (
              <button
                key={wm.useCaseId}
                onClick={() => {
                  setSelectedUseCaseId(wm.useCaseId);
                  setSelectedNode(null);
                }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? "bg-[#02a2fd]/10 text-[#02a2fd] border-[#02a2fd]/30 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80 border-transparent"
                }`}
              >
                {wm.useCaseName || wm.useCaseId}
                {iMap?.isUserModified && (
                  <span className="ml-1.5 text-amber-500 text-xs">*</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Live Metrics Bar */}
      <MetricsBar metrics={liveMetrics} />

      {/* Workflow Content */}
      <div className="relative mt-4">
        {workflowMaps.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-16 text-center">
            <div className="flex flex-col items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
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
                style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
              >
                <Sparkles className={`w-4 h-4 ${generateMutation.isPending ? "animate-pulse" : ""}`} />
                {generateMutation.isPending
                  ? `Generating ${useCaseCount} workflows...`
                  : "Generate Workflows"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-0">
            {/* Workflow Canvas */}
            <div className={`flex-1 ${selectedNode ? "mr-96" : ""} transition-all`}>
              <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ height: "600px" }}>
                <WorkflowCanvas
                  currentNodes={currentNodes}
                  targetNodes={targetNodes}
                  onCurrentNodesChange={handleCurrentNodesChange}
                  onTargetNodesChange={handleTargetNodesChange}
                  onNodeSelect={setSelectedNode}
                  metrics={liveMetrics}
                  isGenerating={generateMutation.isPending}
                />
              </div>

              {/* Workflow metadata */}
              {selectedInteractiveMap && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedInteractiveMap.agenticPattern && (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Agentic Pattern
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {selectedInteractiveMap.agenticPattern}
                      </Badge>
                      {selectedInteractiveMap.patternRationale && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
                          {selectedInteractiveMap.patternRationale}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedInteractiveMap.desiredOutcomes && selectedInteractiveMap.desiredOutcomes.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Desired Outcomes
                      </h4>
                      <ul className="space-y-1">
                        {selectedInteractiveMap.desiredOutcomes.map((o, i) => (
                          <li key={i} className="text-sm text-foreground flex items-start gap-2">
                            <span className="text-green-500 mt-0.5">&#8226;</span>
                            {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedInteractiveMap.dataTypes && selectedInteractiveMap.dataTypes.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Data Types & Integrations
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedInteractiveMap.dataTypes.map((d, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-normal">{d}</Badge>
                        ))}
                        {(selectedInteractiveMap.integrations || []).map((intg, i) => (
                          <Badge key={`i-${i}`} variant="outline" className="text-xs font-normal">{intg}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Node Properties Panel (slide-out) */}
            {selectedNode && (
              <NodePropertiesPanel
                node={selectedNode}
                onUpdate={handleNodeUpdate}
                onClose={() => setSelectedNode(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* Status indicators */}
      {saveMutation.isPending && (
        <div className="fixed bottom-20 right-6 bg-card border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground z-50">
          <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#02a2fd" }} />
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
