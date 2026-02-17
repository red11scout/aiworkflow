import { useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  GitBranch,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Plus,
  Trash2,
  ArrowRight,
  Clock,
  User,
  Bot,
  ShieldCheck,
  AlertCircle,
  TrendingDown,
  DollarSign,
  Award,
  Zap,
  GripVertical,
} from "lucide-react";

// --- Types ---

interface WorkflowNode {
  id: string;
  label: string;
  role: string;
  duration: string;
  description: string;
  order: number;
}

interface TargetWorkflowNode {
  id: string;
  label: string;
  actor: string;
  duration: string;
  description: string;
  aiCapability: string;
  timeSavings: string;
  order: number;
}

interface WorkflowMap {
  useCaseId: string;
  useCaseName: string;
  currentState: WorkflowNode[];
  targetState: TargetWorkflowNode[];
  comparisonMetrics?: {
    timeReduction: string;
    costReduction: string;
    qualityImprovement: string;
    throughputIncrease: string;
  };
}

interface UseCase {
  id: string;
  name: string;
}

// --- Helpers ---

function getActorIcon(actor: string) {
  switch (actor) {
    case "AI":
      return Bot;
    case "Human":
      return User;
    case "HITL":
      return ShieldCheck;
    default:
      return User;
  }
}

function getActorColor(actor: string) {
  switch (actor) {
    case "AI":
      return "bg-[#02a2fd]/10 text-[#02a2fd] border-[#02a2fd]/30";
    case "Human":
      return "bg-[#001278]/10 text-[#001278] border-[#001278]/30 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600/30";
    case "HITL":
      return "bg-[#36bf78]/10 text-[#36bf78] border-[#36bf78]/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// --- Metric Card ---

function MetricCard({
  icon: Icon,
  iconColor,
  label,
  value,
}: {
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${iconColor}15` }}
      >
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold text-foreground">{value}</div>
      </div>
    </div>
  );
}

// --- Current State Step ---

function CurrentStateStep({
  node,
  onUpdate,
  onDelete,
}: {
  node: WorkflowNode;
  onUpdate: (updated: WorkflowNode) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card group">
      <div className="flex flex-col items-center gap-1 pt-1">
        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
        <span className="text-xs text-muted-foreground font-mono">
          {node.order}
        </span>
      </div>
      <div className="flex-1 space-y-2">
        <Input
          value={node.label}
          onChange={(e) => onUpdate({ ...node, label: e.target.value })}
          className="font-medium text-sm h-7 border-none shadow-none px-0 focus-visible:ring-0"
          placeholder="Step name"
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Role</Label>
            <Input
              value={node.role}
              onChange={(e) => onUpdate({ ...node, role: e.target.value })}
              className="text-xs h-7"
              placeholder="e.g. Analyst"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <Input
              value={node.duration}
              onChange={(e) => onUpdate({ ...node, duration: e.target.value })}
              className="text-xs h-7"
              placeholder="e.g. 2 hours"
            />
          </div>
        </div>
        <Input
          value={node.description}
          onChange={(e) => onUpdate({ ...node, description: e.target.value })}
          className="text-xs h-7"
          placeholder="Step description..."
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// --- Target State Step ---

function TargetStateStep({
  node,
  onUpdate,
  onDelete,
}: {
  node: TargetWorkflowNode;
  onUpdate: (updated: TargetWorkflowNode) => void;
  onDelete: () => void;
}) {
  const ActorIcon = getActorIcon(node.actor);
  const actorColor = getActorColor(node.actor);

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card group">
      <div className="flex flex-col items-center gap-1 pt-1">
        <GripVertical className="w-4 h-4 text-muted-foreground/40" />
        <span className="text-xs text-muted-foreground font-mono">
          {node.order}
        </span>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={node.label}
            onChange={(e) => onUpdate({ ...node, label: e.target.value })}
            className="font-medium text-sm h-7 border-none shadow-none px-0 focus-visible:ring-0 flex-1"
            placeholder="Step name"
          />
          <Badge className={`text-xs gap-1 ${actorColor}`}>
            <ActorIcon className="w-3 h-3" />
            {node.actor}
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Actor</Label>
            <select
              value={node.actor}
              onChange={(e) => onUpdate({ ...node, actor: e.target.value })}
              className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="AI">AI</option>
              <option value="Human">Human</option>
              <option value="HITL">HITL</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Duration</Label>
            <Input
              value={node.duration}
              onChange={(e) => onUpdate({ ...node, duration: e.target.value })}
              className="text-xs h-7"
              placeholder="e.g. 5 min"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Time Savings
            </Label>
            <Input
              value={node.timeSavings}
              onChange={(e) =>
                onUpdate({ ...node, timeSavings: e.target.value })
              }
              className="text-xs h-7"
              placeholder="e.g. 1h 55m"
            />
          </div>
        </div>
        <Input
          value={node.description}
          onChange={(e) => onUpdate({ ...node, description: e.target.value })}
          className="text-xs h-7"
          placeholder="Step description..."
        />
        <Input
          value={node.aiCapability}
          onChange={(e) =>
            onUpdate({ ...node, aiCapability: e.target.value })
          }
          className="text-xs h-7"
          placeholder="AI capability used..."
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// --- Workflow Panel for a single use case ---

function WorkflowPanel({
  workflowMap,
  onUpdate,
}: {
  workflowMap: WorkflowMap;
  onUpdate: (updated: WorkflowMap) => void;
}) {
  const updateCurrentStep = (index: number, updated: WorkflowNode) => {
    const newSteps = [...workflowMap.currentState];
    newSteps[index] = updated;
    onUpdate({ ...workflowMap, currentState: newSteps });
  };

  const deleteCurrentStep = (index: number) => {
    const newSteps = workflowMap.currentState
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i + 1 }));
    onUpdate({ ...workflowMap, currentState: newSteps });
  };

  const addCurrentStep = () => {
    const newStep: WorkflowNode = {
      id: generateNodeId(),
      label: "",
      role: "",
      duration: "",
      description: "",
      order: workflowMap.currentState.length + 1,
    };
    onUpdate({
      ...workflowMap,
      currentState: [...workflowMap.currentState, newStep],
    });
  };

  const updateTargetStep = (index: number, updated: TargetWorkflowNode) => {
    const newSteps = [...workflowMap.targetState];
    newSteps[index] = updated;
    onUpdate({ ...workflowMap, targetState: newSteps });
  };

  const deleteTargetStep = (index: number) => {
    const newSteps = workflowMap.targetState
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i + 1 }));
    onUpdate({ ...workflowMap, targetState: newSteps });
  };

  const addTargetStep = () => {
    const newStep: TargetWorkflowNode = {
      id: generateNodeId(),
      label: "",
      actor: "AI",
      duration: "",
      description: "",
      aiCapability: "",
      timeSavings: "",
      order: workflowMap.targetState.length + 1,
    };
    onUpdate({
      ...workflowMap,
      targetState: [...workflowMap.targetState, newStep],
    });
  };

  const metrics = workflowMap.comparisonMetrics;

  return (
    <div className="space-y-4">
      {/* Side-by-side panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current State */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <CardTitle className="text-sm">Current State</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {workflowMap.currentState.length} steps
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Existing manual/semi-automated workflow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workflowMap.currentState
              .sort((a, b) => a.order - b.order)
              .map((node, i) => (
                <div key={node.id}>
                  <CurrentStateStep
                    node={node}
                    onUpdate={(updated) => updateCurrentStep(i, updated)}
                    onDelete={() => deleteCurrentStep(i)}
                  />
                  {i < workflowMap.currentState.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowRight className="w-4 h-4 text-muted-foreground/40 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={addCurrentStep}
              className="w-full mt-2 text-muted-foreground hover:text-foreground gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Step
            </Button>
          </CardContent>
        </Card>

        {/* Target State (AI-Powered) */}
        <Card className="border-[#02a2fd]/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: "#02a2fd" }}
                />
                <CardTitle className="text-sm">AI-Powered State</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                {workflowMap.targetState.length} steps
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Target workflow with AI augmentation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {workflowMap.targetState
              .sort((a, b) => a.order - b.order)
              .map((node, i) => (
                <div key={node.id}>
                  <TargetStateStep
                    node={node}
                    onUpdate={(updated) => updateTargetStep(i, updated)}
                    onDelete={() => deleteTargetStep(i)}
                  />
                  {i < workflowMap.targetState.length - 1 && (
                    <div className="flex justify-center py-1">
                      <ArrowRight className="w-4 h-4 text-[#02a2fd]/40 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={addTargetStep}
              className="w-full mt-2 text-muted-foreground hover:text-foreground gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Step
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            icon={TrendingDown}
            iconColor="#02a2fd"
            label="Time Reduction"
            value={metrics.timeReduction}
          />
          <MetricCard
            icon={DollarSign}
            iconColor="#36bf78"
            label="Cost Reduction"
            value={metrics.costReduction}
          />
          <MetricCard
            icon={Award}
            iconColor="#001278"
            label="Quality Improvement"
            value={metrics.qualityImprovement}
          />
          <MetricCard
            icon={Zap}
            iconColor="#02a2fd"
            label="Throughput Increase"
            value={metrics.throughputIncrease}
          />
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

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

  const [selectedUseCaseId, setSelectedUseCaseId] = useState<string | null>(
    null,
  );

  // Default to first use case if not selected
  const effectiveSelectedId =
    selectedUseCaseId || workflowMaps[0]?.useCaseId || useCases[0]?.id || null;
  const selectedWorkflow = workflowMaps.find(
    (wm) => wm.useCaseId === effectiveSelectedId,
  );

  const saveMutation = useMutation({
    mutationFn: async (updatedMaps: WorkflowMap[]) => {
      const res = await apiRequest("PUT", `/api/scenarios/${activeScenario.id}`, {
        workflowMaps: updatedMaps,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ai/generate-workflow", {
        scenarioId: activeScenario.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  const updateWorkflowMap = useCallback(
    (updated: WorkflowMap) => {
      const newMaps = workflowMaps.map((wm) =>
        wm.useCaseId === updated.useCaseId ? updated : wm,
      );
      saveMutation.mutate(newMaps);
    },
    [workflowMaps, saveMutation],
  );

  const markComplete = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/scenarios/${activeScenario.id}/complete-step`,
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GitBranch className="w-6 h-6" style={{ color: "#02a2fd" }} />
            Workflow Visualization
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compare current state workflows with AI-powered target states for
            each use case.
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="gap-2"
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
        >
          <Sparkles
            className={`w-4 h-4 ${generateMutation.isPending ? "animate-pulse" : ""}`}
          />
          {generateMutation.isPending
            ? "Generating..."
            : "Generate Workflows"}
        </Button>
      </div>

      {/* Use Case Selector */}
      {workflowMaps.length > 0 && (
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
          {workflowMaps.map((wm) => {
            const isActive = wm.useCaseId === effectiveSelectedId;
            return (
              <button
                key={wm.useCaseId}
                onClick={() => setSelectedUseCaseId(wm.useCaseId)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#02a2fd]/10 text-[#02a2fd] border border-[#02a2fd]/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent"
                }`}
              >
                <span className="font-mono text-xs">{wm.useCaseId}</span>
                <span>{wm.useCaseName || wm.useCaseId}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Workflow Content */}
      {workflowMaps.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
            >
              <GitBranch className="w-6 h-6 text-white" />
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
              disabled={generateMutation.isPending}
              className="mt-2 gap-2"
              style={{
                background: "linear-gradient(135deg, #001278, #02a2fd)",
              }}
            >
              <Sparkles className="w-4 h-4" />
              Generate Workflows
            </Button>
          </div>
        </Card>
      ) : selectedWorkflow ? (
        <WorkflowPanel
          workflowMap={selectedWorkflow}
          onUpdate={updateWorkflowMap}
        />
      ) : (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Select a use case to view its workflow comparison.
          </p>
        </Card>
      )}

      {/* Saving / Error indicators */}
      {saveMutation.isPending && (
        <div className="fixed bottom-20 right-6 bg-card border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles
            className="w-4 h-4 animate-pulse"
            style={{ color: "#02a2fd" }}
          />
          Saving...
        </div>
      )}

      {(saveMutation.isError || generateMutation.isError) && (
        <div className="fixed bottom-20 right-6 bg-destructive/10 border border-destructive/30 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          {generateMutation.isError
            ? "Failed to generate workflows. Please try again."
            : "Failed to save. Please try again."}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
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
          className="gap-2"
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
