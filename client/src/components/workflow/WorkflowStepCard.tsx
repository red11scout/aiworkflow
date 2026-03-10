import { useState, useMemo } from "react";
import {
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowUp,
  ArrowDown,
  User,
  Bot,
  Users,
  Tag,
  Database,
  Sparkles,
  Plus,
  X,
  Monitor,
} from "lucide-react";
import type { InteractiveWorkflowNode, SystemDetail } from "@shared/types";
import {
  STANDARDIZED_ROLES,
  FRICTION_TYPES,
  STEP_CATEGORIES,
  OUTPUT_TYPES,
  AI_APPROACHES,
  ACTOR_TYPES,
  INTEGRATION_TYPES,
  EPOCH_CATEGORIES,
  DATA_TYPES,
} from "@shared/assumptions";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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

const ACTOR_TYPE_ICONS: Record<string, typeof User> = {
  human: User,
  ai: Bot,
  hybrid: Users,
  system: Monitor,
  ai_agent: Bot,
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

const EMPTY_SYSTEM_DETAIL: SystemDetail = {
  name: "",
  dataType: "structured",
  integrationAvailable: false,
  integrationType: "none",
};

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
  const burdenMultiplier = node.burdenMultiplier ?? 1.35;

  const monthlyCost = useMemo(() => {
    const employees = node.employeeCount ?? 1;
    const rate = node.avgHourlyCost ?? 75;
    const hours = node.hoursPerTask ?? 1;
    const tasks = node.tasksPerMonth ?? 20;
    return employees * rate * burdenMultiplier * hours * tasks;
  }, [node.employeeCount, node.avgHourlyCost, node.hoursPerTask, node.tasksPerMonth, burdenMultiplier]);

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

  function handleAiCapRemove(cap: string) {
    patch({ aiCapabilities: (node.aiCapabilities || []).filter((c) => c !== cap) });
  }

  function handleAiCapAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val && !(node.aiCapabilities || []).includes(val)) {
        patch({ aiCapabilities: [...(node.aiCapabilities || []), val] });
        e.currentTarget.value = "";
      }
    }
  }

  // Pain point tag handlers
  function handlePainPointAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const val = e.currentTarget.value.trim();
      if (val && !(node.painPoints || []).includes(val)) {
        patch({ painPoints: [...(node.painPoints || []), val] });
        e.currentTarget.value = "";
      }
    }
  }

  function handlePainPointRemove(pp: string) {
    patch({ painPoints: (node.painPoints || []).filter((p) => p !== pp) });
  }

  // System detail handlers
  function handleSystemDetailChange(index: number, updates: Partial<SystemDetail>) {
    const current = node.systemDetails ? [...node.systemDetails] : [];
    current[index] = { ...current[index], ...updates };
    patch({ systemDetails: current });
  }

  function handleAddSystemDetail() {
    const current = node.systemDetails ? [...node.systemDetails] : [];
    current.push({ ...EMPTY_SYSTEM_DETAIL });
    patch({ systemDetails: current });
  }

  function handleRemoveSystemDetail(index: number) {
    const current = node.systemDetails ? [...node.systemDetails] : [];
    current.splice(index, 1);
    patch({ systemDetails: current });
  }

  // Legacy systems fallback
  function handleSystemsChange(value: string) {
    patch({ systems: value.split(",").map((s) => s.trim()).filter(Boolean) });
  }

  // ---------------------------------------------------------------------------
  // Badge helpers
  // ---------------------------------------------------------------------------

  function renderBadges() {
    const badges: React.ReactNode[] = [];

    // Actor type icon + name
    const actorType = node.actorType ?? "human";
    const ActorIcon = ACTOR_TYPE_ICONS[actorType] ?? User;
    if (node.actorName) {
      badges.push(
        <Badge key="actor-name" variant="outline" className="gap-1 text-muted-foreground">
          <ActorIcon className="h-3 w-3" />
          {node.actorName}
        </Badge>,
      );
    }

    // Department badge
    if (node.department) {
      badges.push(
        <Badge key="dept" variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 text-[10px]">
          {node.department}
        </Badge>,
      );
    }

    // Step category colored pill
    if (node.stepCategory) {
      const cat = STEP_CATEGORIES.find((c) => c.id === node.stepCategory);
      if (cat) {
        badges.push(
          <Badge
            key="step-cat"
            className="border text-[10px] font-medium"
            style={{ backgroundColor: `${cat.color}20`, color: cat.color, borderColor: `${cat.color}40` }}
          >
            {cat.label}
          </Badge>,
        );
      }
    }

    // Pain point count
    const ppCount = (node.painPoints ?? []).length;
    if (ppCount > 0) {
      badges.push(
        <Badge key="pp" className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">
          {ppCount} pain point{ppCount !== 1 ? "s" : ""}
        </Badge>,
      );
    }

    // AI-Powered / Manual
    if (isAI) {
      badges.push(
        <Badge key="ai" className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          AI-Powered
        </Badge>,
      );
    } else {
      badges.push(
        <Badge key="ai" variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-100">
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

          {/* Expand/Collapse indicator — bottom-left */}
          <div className="flex items-center gap-1 text-muted-foreground mt-1">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            <span className="text-xs">{isExpanded ? "Collapse" : "Expand"}</span>
          </div>
        </div>
      </div>

      {/* ------ Expanded editing form ------ */}
      {isExpanded && (
        <CardContent className="pt-0 pb-5 px-4 space-y-4 border-t border-border/50">
          <Tabs defaultValue="identity" className="pt-3">
            <TabsList className="h-8 w-full grid grid-cols-4">
              <TabsTrigger value="identity" className="text-xs gap-1 px-2">
                <User className="h-3 w-3" />
                Identity
              </TabsTrigger>
              <TabsTrigger value="classification" className="text-xs gap-1 px-2">
                <Tag className="h-3 w-3" />
                Classification
              </TabsTrigger>
              <TabsTrigger value="systems" className="text-xs gap-1 px-2">
                <Database className="h-3 w-3" />
                Systems
              </TabsTrigger>
              <TabsTrigger value="ai-config" className="text-xs gap-1 px-2">
                <Sparkles className="h-3 w-3" />
                AI Config
              </TabsTrigger>
            </TabsList>

            {/* ============================================================= */}
            {/* TAB 1 — Identity                                              */}
            {/* ============================================================= */}
            <TabsContent value="identity" className="space-y-3 mt-3">
              {/* Step Name */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Step Name</Label>
                <Input
                  value={node.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Step name"
                  className="text-xs"
                />
              </div>

              {/* Actor Type + Actor Name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Actor Type</Label>
                  <Select
                    value={node.actorType ?? "human"}
                    onValueChange={(val) => patch({ actorType: val as any })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select actor" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACTOR_TYPES.map((at) => (
                        <SelectItem key={at.id} value={at.id}>{at.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Actor Name</Label>
                  <Input
                    value={node.actorName ?? ""}
                    onChange={(e) => patch({ actorName: e.target.value })}
                    placeholder="e.g. Accounts Payable Clerk"
                    className="text-xs"
                  />
                </div>
              </div>

              {/* Department + Department Handoff */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <Input
                    value={node.department ?? ""}
                    onChange={(e) => patch({ department: e.target.value })}
                    placeholder="e.g. Finance, Operations"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Department Handoff</Label>
                  <div className="flex items-center gap-2 pt-1.5">
                    <Switch
                      checked={node.isDepartmentHandoff ?? false}
                      onCheckedChange={(checked) => patch({ isDepartmentHandoff: checked })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {node.isDepartmentHandoff ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Staffing row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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

              {/* Burden multiplier */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Burden Multiplier</Label>
                  <Input
                    type="number"
                    min={1}
                    max={3}
                    step={0.05}
                    value={burdenMultiplier}
                    onChange={(e) => patch({ burdenMultiplier: Math.max(1, parseFloat(e.target.value) || 1.35) })}
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

              {/* Enhanced cost display */}
              <div className="flex flex-col gap-1 bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rate:</span>
                  <span className="text-xs font-medium">
                    ${node.avgHourlyCost ?? 75}/hr &times; {burdenMultiplier} burden = ${((node.avgHourlyCost ?? 75) * burdenMultiplier).toFixed(2)}/hr
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Monthly cost:</span>
                  <span className="text-sm font-bold text-foreground">
                    {formatCurrencyFull(monthlyCost)}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    ({node.employeeCount ?? 1} &times; ${((node.avgHourlyCost ?? 75) * burdenMultiplier).toFixed(0)}/hr &times;{" "}
                    {node.hoursPerTask ?? 1}h &times; {node.tasksPerMonth ?? 20}/mo)
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* ============================================================= */}
            {/* TAB 2 — Classification                                        */}
            {/* ============================================================= */}
            <TabsContent value="classification" className="space-y-3 mt-3">
              {/* Step Category */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Step Category</Label>
                <Select
                  value={node.stepCategory ?? ""}
                  onValueChange={(val) => patch({ stepCategory: val as any })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {STEP_CATEGORIES.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: sc.color }}
                          />
                          {sc.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pain Points */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Pain Points</Label>
                <div className="flex flex-wrap gap-1.5">
                  {(node.painPoints || []).map((pp) => (
                    <Badge
                      key={pp}
                      className="cursor-pointer bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200"
                      onClick={() => handlePainPointRemove(pp)}
                      title="Click to remove"
                    >
                      {pp} <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Type a pain point and press Enter"
                  className="text-xs"
                  onKeyDown={handlePainPointAdd}
                />
              </div>

              {/* Friction Type (current state only) */}
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

              {/* Output Type */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Output Type</Label>
                <Select
                  value={node.outputType ?? ""}
                  onValueChange={(val) => patch({ outputType: val as any })}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select output type" />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPUT_TYPES.map((ot) => (
                      <SelectItem key={ot.id} value={ot.id}>{ot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bottleneck + Decision Point toggles */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Bottleneck</Label>
                  <div className="flex items-center gap-2 pt-1.5">
                    <Switch
                      checked={node.isBottleneck ?? false}
                      onCheckedChange={(checked) => patch({ isBottleneck: checked })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {node.isBottleneck ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Decision Point</Label>
                  <div className="flex items-center gap-2 pt-1.5">
                    <Switch
                      checked={node.isDecisionPoint ?? false}
                      onCheckedChange={(checked) => patch({ isDecisionPoint: checked })}
                    />
                    <span className="text-xs text-muted-foreground">
                      {node.isDecisionPoint ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ============================================================= */}
            {/* TAB 3 — Systems                                               */}
            {/* ============================================================= */}
            <TabsContent value="systems" className="space-y-3 mt-3">
              {(node.systemDetails && node.systemDetails.length > 0) ? (
                <>
                  <div className="space-y-2">
                    {node.systemDetails.map((sd, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end bg-muted/30 rounded-md p-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">System Name</Label>
                          <Input
                            value={sd.name}
                            onChange={(e) => handleSystemDetailChange(idx, { name: e.target.value })}
                            placeholder="e.g. SAP"
                            className="text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Data Type</Label>
                          <Select
                            value={sd.dataType}
                            onValueChange={(val) => handleSystemDetailChange(idx, { dataType: val as any })}
                          >
                            <SelectTrigger className="text-xs h-8 w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DATA_TYPES.map((dt) => (
                                <SelectItem key={dt.id} value={dt.id}>{dt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Integration</Label>
                          <div className="flex items-center gap-1 pt-1">
                            <Switch
                              checked={sd.integrationAvailable}
                              onCheckedChange={(checked) => handleSystemDetailChange(idx, { integrationAvailable: checked })}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground">Type</Label>
                          <Select
                            value={sd.integrationType}
                            onValueChange={(val) => handleSystemDetailChange(idx, { integrationType: val as any })}
                          >
                            <SelectTrigger className="text-xs h-8 w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {INTEGRATION_TYPES.map((it) => (
                                <SelectItem key={it.id} value={it.id}>{it.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => handleRemoveSystemDetail(idx)}
                          title="Remove system"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={handleAddSystemDetail}
                  >
                    <Plus className="h-3 w-3" /> Add System
                  </Button>
                </>
              ) : (
                <>
                  {/* Fallback: comma-separated systems input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Systems involved (comma-separated)</Label>
                    <Input
                      value={(node.systems || []).join(", ")}
                      onChange={(e) => handleSystemsChange(e.target.value)}
                      placeholder="e.g. SAP, Salesforce"
                      className="text-xs"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    onClick={handleAddSystemDetail}
                  >
                    <Plus className="h-3 w-3" /> Add Detailed System Entry
                  </Button>
                </>
              )}
            </TabsContent>

            {/* ============================================================= */}
            {/* TAB 4 — AI Config                                             */}
            {/* ============================================================= */}
            <TabsContent value="ai-config" className="space-y-3 mt-3">
              {variant === "current" ? (
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-4">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    AI configuration is available in the target state. Switch to the target workflow to configure AI approach, EPOCH category, and automation settings.
                  </p>
                </div>
              ) : (
                <>
                  {/* Automation Level */}
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

                  {/* EPOCH Category */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">EPOCH Category</Label>
                    <Select
                      value={node.epochCategory ?? ""}
                      onValueChange={(val) => patch({ epochCategory: val as any })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select EPOCH category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EPOCH_CATEGORIES.map((ec) => (
                          <SelectItem key={ec.id} value={ec.id}>
                            <span className="flex items-center gap-2">
                              <span
                                className="inline-flex items-center justify-center h-4 w-4 rounded text-[10px] font-bold text-white shrink-0"
                                style={{ backgroundColor: ec.color }}
                              >
                                {ec.letter}
                              </span>
                              {ec.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {node.epochCategory && (
                      <p className="text-[10px] text-muted-foreground pl-1">
                        {EPOCH_CATEGORIES.find((ec) => ec.id === node.epochCategory)?.description}
                      </p>
                    )}
                  </div>

                  {/* HITL Details */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">HITL Details</Label>
                    <Textarea
                      rows={2}
                      value={node.hitlDetails ?? ""}
                      onChange={(e) => patch({ hitlDetails: e.target.value })}
                      placeholder="When would a human review this step?"
                      className="text-xs resize-none"
                    />
                  </div>

                  {/* Desired AI Output Type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Desired AI Output Type</Label>
                    <Input
                      value={node.desiredAIOutputType ?? ""}
                      onChange={(e) => patch({ desiredAIOutputType: e.target.value })}
                      placeholder="e.g. Summarized report, Classification label"
                      className="text-xs"
                    />
                  </div>

                  {/* AI Approach */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">AI Approach</Label>
                    <Select
                      value={node.aiApproach ?? ""}
                      onValueChange={(val) => patch({ aiApproach: val as any })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select AI approach" />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_APPROACHES.map((ap) => (
                          <SelectItem key={ap.id} value={ap.id}>{ap.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {node.aiApproach && (
                      <p className="text-[10px] text-muted-foreground pl-1">
                        {AI_APPROACHES.find((ap) => ap.id === node.aiApproach)?.description}
                      </p>
                    )}
                  </div>

                  {/* AI Approach Rationale */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">AI Approach Rationale</Label>
                    <Textarea
                      rows={2}
                      value={node.aiApproachRationale ?? ""}
                      onChange={(e) => patch({ aiApproachRationale: e.target.value })}
                      placeholder="Why this approach was chosen..."
                      className="text-xs resize-none"
                    />
                  </div>

                  {/* AI Capabilities */}
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
                          {cap} <X className="h-3 w-3 ml-1" />
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
            </TabsContent>
          </Tabs>

          {/* Description — always visible when expanded, outside tabs */}
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
