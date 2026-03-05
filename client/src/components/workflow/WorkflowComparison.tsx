import { useState, useCallback } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { InteractiveWorkflowNode } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { WorkflowStepCard } from "./WorkflowStepCard";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowComparisonProps {
  currentNodes: InteractiveWorkflowNode[];
  targetNodes: InteractiveWorkflowNode[];
  onCurrentChange: (nodes: InteractiveWorkflowNode[]) => void;
  onTargetChange: (nodes: InteractiveWorkflowNode[]) => void;
}

// ---------------------------------------------------------------------------
// New step creation form
// ---------------------------------------------------------------------------

interface AddStepFormProps {
  variant: "current" | "target";
  onAdd: (node: InteractiveWorkflowNode) => void;
  onCancel: () => void;
}

function AddStepForm({ variant, onAdd, onCancel }: AddStepFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const newNode: InteractiveWorkflowNode = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      stepNumber: 0, // will be reindexed by parent
      name: name.trim(),
      description: description.trim(),
      actorType: variant === "target" ? "ai_agent" : "human",
      actorName: variant === "target" ? "AI Agent" : "Employee",
      duration: "",
      systems: [],
      isBottleneck: false,
      isDecisionPoint: false,
      painPoints: [],
      isAIEnabled: variant === "target",
      isHumanInTheLoop: false,
      aiCapabilities: [],
      automationLevel: variant === "target" ? "assisted" : "manual",
      employeeCount: 1,
      avgHourlyCost: 75,
      hoursPerTask: 1,
      tasksPerMonth: 20,
    };

    onAdd(newNode);
    setName("");
    setDescription("");
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Step name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Review submitted documents"
              className="text-sm"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description (optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what happens"
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Add Step
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Column component
// ---------------------------------------------------------------------------

interface ColumnProps {
  title: string;
  badgeLabel: string;
  badgeClass: string;
  variant: "current" | "target";
  nodes: InteractiveWorkflowNode[];
  onNodesChange: (nodes: InteractiveWorkflowNode[]) => void;
  expandedId: string | null;
  onSetExpandedId: (id: string | null) => void;
}

function WorkflowColumn({
  title,
  badgeLabel,
  badgeClass,
  variant,
  nodes,
  onNodesChange,
  expandedId,
  onSetExpandedId,
}: ColumnProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  // Re-index stepNumbers after any mutation
  function reindex(list: InteractiveWorkflowNode[]): InteractiveWorkflowNode[] {
    return list.map((n, i) => ({ ...n, stepNumber: i + 1 }));
  }

  const handleChange = useCallback(
    (index: number, updated: InteractiveWorkflowNode) => {
      const next = [...nodes];
      next[index] = updated;
      onNodesChange(next);
    },
    [nodes, onNodesChange],
  );

  const handleDelete = useCallback(
    (index: number) => {
      const next = nodes.filter((_, i) => i !== index);
      onNodesChange(reindex(next));
      if (nodes[index]?.id === expandedId) {
        onSetExpandedId(null);
      }
    },
    [nodes, onNodesChange, expandedId, onSetExpandedId],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const next = [...nodes];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onNodesChange(reindex(next));
    },
    [nodes, onNodesChange],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= nodes.length - 1) return;
      const next = [...nodes];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      onNodesChange(reindex(next));
    },
    [nodes, onNodesChange],
  );

  const handleAdd = useCallback(
    (newNode: InteractiveWorkflowNode) => {
      const next = reindex([...nodes, newNode]);
      onNodesChange(next);
      setShowAddForm(false);
    },
    [nodes, onNodesChange],
  );

  return (
    <div className="flex-1 min-w-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge className={cn("text-xs", badgeClass)}>{badgeLabel}</Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {nodes.length} step{nodes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Cards list */}
      <div className="space-y-0">
        {nodes.map((node, index) => (
          <div key={node.id}>
            <WorkflowStepCard
              node={node}
              stepNumber={index + 1}
              variant={variant}
              isExpanded={expandedId === node.id}
              onToggleExpand={() =>
                onSetExpandedId(expandedId === node.id ? null : node.id)
              }
              onChange={(updated) => handleChange(index, updated)}
              onDelete={() => handleDelete(index)}
              onMoveUp={index > 0 ? () => handleMoveUp(index) : undefined}
              onMoveDown={
                index < nodes.length - 1
                  ? () => handleMoveDown(index)
                  : undefined
              }
            />
            {/* Arrow between cards */}
            {index < nodes.length - 1 && (
              <div className="flex justify-center py-1">
                <ChevronDown className="h-4 w-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add step */}
      {showAddForm ? (
        <div className="mt-3">
          <AddStepForm
            variant={variant}
            onAdd={handleAdd}
            onCancel={() => setShowAddForm(false)}
          />
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full border-dashed text-muted-foreground"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Step
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main comparison component
// ---------------------------------------------------------------------------

export function WorkflowComparison({
  currentNodes,
  targetNodes,
  onCurrentChange,
  onTargetChange,
}: WorkflowComparisonProps) {
  // Only one card expanded at a time across both columns
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      <WorkflowColumn
        title="Current Process"
        badgeLabel="Manual"
        badgeClass="bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
        variant="current"
        nodes={currentNodes}
        onNodesChange={onCurrentChange}
        expandedId={expandedId}
        onSetExpandedId={setExpandedId}
      />
      <WorkflowColumn
        title="AI-Powered Process"
        badgeLabel="Automated"
        badgeClass="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
        variant="target"
        nodes={targetNodes}
        onNodesChange={onTargetChange}
        expandedId={expandedId}
        onSetExpandedId={setExpandedId}
      />
    </div>
  );
}
