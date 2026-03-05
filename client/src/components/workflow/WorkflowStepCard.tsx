import { useState, useMemo } from "react";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { InteractiveWorkflowNode } from "@shared/types";
import { STANDARDIZED_ROLES, FRICTION_TYPES } from "@shared/assumptions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrencyFull } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowStepCardProps {
  node: InteractiveWorkflowNode;
  stepNumber: number;
  variant: "current" | "target";
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChange: (updated: InteractiveWorkflowNode) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AUTOMATION_LEVELS = [
  { value: "full", label: "Full", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { value: "assisted", label: "Assisted", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "supervised", label: "Supervised", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "manual", label: "Manual", color: "bg-gray-100 text-gray-700 border-gray-300" },
] as const;

const FRICTION_BUTTON_COLORS: Record<string, string> = {
  process: "bg-red-100 text-red-800 border-red-300",
  data: "bg-yellow-100 text-yellow-800 border-yellow-300",
  technology: "bg-purple-100 text-purple-800 border-purple-300",
  knowledge: "bg-blue-100 text-blue-800 border-blue-300",
};

// Group roles by category for dropdown
const ROLE_GROUPS = STANDARDIZED_ROLES.reduce<
  Record<string, typeof STANDARDIZED_ROLES>
>((acc, role) => {
  const cat = role.category.charAt(0).toUpperCase() + role.category.slice(1);
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push(role);
  return acc;
}, {});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WorkflowStepCard({
  node,
  stepNumber,
  variant,
  isExpanded,
  onToggleExpand,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: WorkflowStepCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Derived display values
  const isAI = node.isAIEnabled || variant === "target";
  const hasHITL = !!node.hitlCheckpoint;

  const monthlyCost = useMemo(() => {
    const employees = node.employeeCount ?? 1;
    const rate = node.avgHourlyCost ?? 75;
    const hours = node.hoursPerTask ?? 1;
    const tasks = node.tasksPerMonth ?? 20;
    return employees * rate * hours * tasks;
  }, [node.employeeCount, node.avgHourlyCost, node.hoursPerTask, node.tasksPerMonth]);

  // Border & background by variant
  const borderClass = hasHITL
    ? "border-l-amber-500"
    : variant === "current"
      ? "border-l-red-400"
      : "border-l-green-500";

  const bgClass = hasHITL
    ? "bg-amber-50/40 dark:bg-amber-950/20"
    : variant === "current"
      ? "bg-red-50/30 dark:bg-red-950/20"
      : "bg-green-50/30 dark:bg-green-950/20";

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function patch(updates: Partial<InteractiveWorkflowNode>) {
    onChange({ ...node, ...updates });
  }

  function handleRoleSelect(roleId: string) {
    const role = STANDARDIZED_ROLES.find((r) => r.roleId === roleId);
    if (role) {
      patch({ avgHourlyCost: role.hourlyRate, actorName: role.name });
    }
  }

  function handleFrictionSelect(type: "process" | "data" | "technology" | "knowledge") {
    patch({ frictionType: node.frictionType === type ? undefined : type });
  }

  function handleAutomationSelect(level: "full" | "assisted" | "supervised" | "manual") {
    patch({ automationLevel: level });
  }

  function handleSystemsChange(value: string) {
    patch({ systems: value.split(",").map((s) => s.trim()).filter(Boolean) });
  }

  function handleAiCapRemove(cap: string) {
    patch({ aiCapabilities: (node.aiCapabilities || []).filter((c) => c !== cap) });
  }

  function handleAiCapAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const val = e.currentTarget.value.trim();
      if (val && !(node.aiCapabilities || []).includes(val)) {
        patch({ aiCapabilities: [...(node.aiCapabilities || []), val] });
        e.currentTarget.value = "";
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Badge helpers
  // ---------------------------------------------------------------------------

  function renderBadges() {
    const badges: React.ReactNode[] = [];

    // Actor type
    if (isAI) {
      badges.push(
        <Badge key="actor" className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          AI-Powered
        </Badge>,
      );
    } else {
      badges.push(
        <Badge key="actor" variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100">
          Manual
        </Badge>,
      );
    }

    // Duration
    if (node.duration) {
      badges.push(
        <Badge key="dur" variant="outline" className="text-muted-foreground">
          {node.duration}
        </Badge>,
      );
    }

    // Bottleneck
    if (node.isBottleneck) {
      badges.push(
        <Badge key="bn" className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
          Bottleneck
        </Badge>,
      );
    }

    // Pain points / error-prone
    if (node.painPoints && node.painPoints.length > 0) {
      badges.push(
        <Badge key="ep" className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">
          Error-prone
        </Badge>,
      );
    }

    // Automation level
    if (variant === "target") {
      if (node.automationLevel === "full") {
        badges.push(
          <Badge key="auto" className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
            Fully Automated
          </Badge>,
        );
      } else if (node.automationLevel === "assisted") {
        badges.push(
          <Badge key="auto" className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
            AI-Assisted
          </Badge>,
        );
      }
    }

    // HITL
    if (hasHITL) {
      badges.push(
        <Badge key="hitl" className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
          HITL
        </Badge>,
      );
    }

    return badges;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Card
      className={cn(
        "border-l-4 transition-shadow",
        borderClass,
        bgClass,
        isExpanded && "ring-1 ring-ring shadow-md",
      )}
    >
      {/* ------ Collapsed header (always visible) ------ */}
      <div
        className="flex items-start gap-2 p-4 cursor-pointer select-none"
        onClick={onToggleExpand}
      >
        {/* Drag handle */}
        <div className="mt-0.5 text-muted-foreground/50 shrink-0">
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Title + description + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm leading-snug">
              {stepNumber}. {node.name}
            </h4>
            <div className="flex items-center gap-1 shrink-0">
              {onMoveUp && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                  title="Move up"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
              )}
              {onMoveDown && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                  title="Move down"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-6 w-6",
                  confirmDelete
                    ? "text-red-600 bg-red-100"
                    : "text-muted-foreground hover:text-red-600",
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirmDelete) {
                    onDelete();
                  } else {
                    setConfirmDelete(true);
                    setTimeout(() => setConfirmDelete(false), 2000);
                  }
                }}
                title={confirmDelete ? "Click again to confirm" : "Delete step"}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <div className="ml-1">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {!isExpanded && node.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {node.description}
            </p>
          )}

          {/* Badge row */}
          <div className="flex flex-wrap gap-1.5 mt-2">{renderBadges()}</div>
        </div>
      </div>

      {/* ------ Expanded editing form ------ */}
      {isExpanded && (
        <CardContent className="pt-0 pb-5 px-4 space-y-4 border-t border-border/50">
          {/* ---- Staffing row ---- */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">How many people?</Label>
              <Input
                type="number"
                min={1}
                value={node.employeeCount ?? 1}
                onChange={(e) => patch({ employeeCount: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Hours per task?</Label>
              <Input
                type="number"
                min={0.1}
                step={0.5}
                value={node.hoursPerTask ?? 1}
                onChange={(e) => patch({ hoursPerTask: Math.max(0.1, parseFloat(e.target.value) || 0.1) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">How often? (per month)</Label>
              <Input
                type="number"
                min={1}
                value={node.tasksPerMonth ?? 20}
                onChange={(e) => patch({ tasksPerMonth: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Role & rate</Label>
              <Select
                value={
                  STANDARDIZED_ROLES.find((r) => r.hourlyRate === node.avgHourlyCost)?.roleId ?? ""
                }
                onValueChange={handleRoleSelect}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_GROUPS).map(([category, roles]) => (
                    <SelectGroup key={category}>
                      <SelectLabel>{category}</SelectLabel>
                      {roles.map((role) => (
                        <SelectItem key={role.roleId} value={role.roleId}>
                          {role.name} (${role.hourlyRate}/hr)
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Monthly cost display */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground">Monthly cost:</span>
            <span className="text-sm font-bold text-foreground">
              {formatCurrencyFull(monthlyCost)}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              ({node.employeeCount ?? 1} x ${node.avgHourlyCost ?? 75}/hr x{" "}
              {node.hoursPerTask ?? 1}h x {node.tasksPerMonth ?? 20}/mo)
            </span>
          </div>

          {/* ---- Variant-specific controls ---- */}
          {variant === "current" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Friction Type</Label>
              <div className="flex flex-wrap gap-2">
                {FRICTION_TYPES.map((ft) => (
                  <button
                    key={ft.id}
                    type="button"
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                      node.frictionType === ft.id
                        ? FRICTION_BUTTON_COLORS[ft.id]
                        : "bg-background text-muted-foreground border-border hover:border-foreground/30",
                    )}
                    onClick={() => handleFrictionSelect(ft.id as any)}
                    title={ft.description}
                  >
                    {ft.label.replace(" Friction", "")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {variant === "target" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Automation Level</Label>
                <div className="flex flex-wrap gap-2">
                  {AUTOMATION_LEVELS.map((al) => (
                    <button
                      key={al.value}
                      type="button"
                      className={cn(
                        "px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                        node.automationLevel === al.value
                          ? al.color
                          : "bg-background text-muted-foreground border-border hover:border-foreground/30",
                      )}
                      onClick={() => handleAutomationSelect(al.value)}
                    >
                      {al.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">AI Capabilities</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(node.aiCapabilities || []).map((cap) => (
                    <Badge
                      key={cap}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20"
                      onClick={() => handleAiCapRemove(cap)}
                      title="Click to remove"
                    >
                      {cap} &times;
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Type a capability and press Enter"
                  className="text-xs"
                  onKeyDown={handleAiCapAdd}
                />
              </div>
            </>
          )}

          {/* ---- Common fields ---- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Systems involved</Label>
              <Input
                value={(node.systems || []).join(", ")}
                onChange={(e) => handleSystemsChange(e.target.value)}
                placeholder="e.g. SAP, Salesforce"
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Duration</Label>
              <Input
                value={node.duration || ""}
                onChange={(e) => patch({ duration: e.target.value })}
                placeholder="e.g. 2 hours, 15 min"
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              rows={2}
              value={node.description || ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Describe what happens in this step..."
              className="text-xs resize-none"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
