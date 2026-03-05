// =========================================================================
// NodePropertiesPanel — Slide-out right panel for editing workflow node properties
// =========================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  STANDARDIZED_ROLES,
  EPOCH_CATEGORIES,
  DATA_TYPES,
} from "@shared/assumptions";
import type {
  InteractiveWorkflowNode,
  EpochCategory,
  HITLCheckpoint,
} from "@shared/types";
import { cn } from "@/lib/utils";

// -------------------------------------------------------------------------
// Props
// -------------------------------------------------------------------------

interface NodePropertiesPanelProps {
  node: InteractiveWorkflowNode | null;
  onUpdate: (nodeId: string, updates: Partial<InteractiveWorkflowNode>) => void;
  onClose: () => void;
}

// -------------------------------------------------------------------------
// Debounce Hook
// -------------------------------------------------------------------------

function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return useCallback(
    ((...args: any[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
    }) as T,
    [delay],
  );
}

// -------------------------------------------------------------------------
// EPOCH Color map
// -------------------------------------------------------------------------

const EPOCH_COLORS: Record<EpochCategory, string> = {
  ethical: "#8B5CF6",
  political: "#EF4444",
  operational: "#F59E0B",
  creative: "#06B6D4",
  human: "#36bf78",
};

// -------------------------------------------------------------------------
// Component
// -------------------------------------------------------------------------

export function NodePropertiesPanel({
  node,
  onUpdate,
  onClose,
}: NodePropertiesPanelProps) {
  // Local draft state for the form — synced from `node` prop, emitted via debounce
  const [draft, setDraft] = useState<Partial<InteractiveWorkflowNode>>({});

  // Reset draft whenever selected node changes
  useEffect(() => {
    if (node) {
      setDraft({
        name: node.name,
        description: node.description,
        actorType: node.actorType,
        actorName: node.actorName,
        duration: node.duration,
        systems: node.systems,
        employeeCount: node.employeeCount,
        avgHourlyCost: node.avgHourlyCost,
        hoursPerTask: node.hoursPerTask,
        tasksPerMonth: node.tasksPerMonth,
        inputs: node.inputs,
        outputs: node.outputs,
        dataSources: node.dataSources,
        hitlCheckpoint: node.hitlCheckpoint,
      });
    }
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const debouncedUpdate = useDebouncedCallback(
    (updates: Partial<InteractiveWorkflowNode>) => {
      if (node) onUpdate(node.id, updates);
    },
    300,
  );

  // Merged update: update local state immediately, debounce upstream
  const updateField = useCallback(
    (updates: Partial<InteractiveWorkflowNode>) => {
      setDraft((prev) => ({ ...prev, ...updates }));
      debouncedUpdate(updates);
    },
    [debouncedUpdate],
  );

  // Computed monthly cost
  const monthlyCost = useMemo(() => {
    const emp = draft.employeeCount ?? 1;
    const rate = draft.avgHourlyCost ?? 75;
    const hrs = draft.hoursPerTask ?? 1;
    const tasks = draft.tasksPerMonth ?? 20;
    return emp * rate * hrs * tasks;
  }, [draft.employeeCount, draft.avgHourlyCost, draft.hoursPerTask, draft.tasksPerMonth]);

  // Current role (to pre-fill hourly cost)
  const selectedRole = useMemo(() => {
    if (!draft.actorName) return undefined;
    return STANDARDIZED_ROLES.find(
      (r) => r.name === draft.actorName || r.roleId === draft.actorName,
    );
  }, [draft.actorName]);

  // Slide out when no node selected
  if (!node) return null;

  // -----------------------------------------------------------------------
  // HITL checkpoint helpers
  // -----------------------------------------------------------------------

  const hitl = draft.hitlCheckpoint;

  function updateHitl(updates: Partial<HITLCheckpoint>) {
    const current = draft.hitlCheckpoint ?? {
      id: `hitl-${node!.id}`,
      epochCategory: "operational" as EpochCategory,
      description: "",
      approverRole: "",
      isRequired: true,
      estimatedMinutes: 5,
    };
    const updated = { ...current, ...updates };
    updateField({ hitlCheckpoint: updated });
  }

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderDataTypeCheckboxes(
    field: "inputs" | "outputs",
    current: InteractiveWorkflowNode["inputs"],
  ) {
    const currentTypes = (current ?? []).map((d) => d.type);

    return (
      <div className="grid grid-cols-2 gap-2">
        {DATA_TYPES.map((dt) => {
          const isChecked = currentTypes.includes(dt.id);
          return (
            <label
              key={dt.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm hover:bg-muted/50"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => {
                  let next = [...(current ?? [])];
                  if (e.target.checked) {
                    next.push({ name: dt.label, type: dt.id, source: "" });
                  } else {
                    next = next.filter((d) => d.type !== dt.id);
                  }
                  updateField({ [field]: next });
                }}
                className="rounded border-input"
              />
              <div>
                <div className="font-medium">{dt.label}</div>
                <div className="text-[11px] text-muted-foreground">{dt.description}</div>
              </div>
            </label>
          );
        })}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main Render
  // -----------------------------------------------------------------------

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-96 flex-col border-l bg-background shadow-xl animate-in slide-in-from-right-full duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Node Properties</h3>
          <Badge variant="outline" className="text-[10px]">
            {node.actorType}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b px-4">
          <TabsList className="h-9 w-full justify-start bg-transparent p-0">
            <TabsTrigger value="general" className="text-xs">
              General
            </TabsTrigger>
            <TabsTrigger value="staffing" className="text-xs">
              Staffing
            </TabsTrigger>
            <TabsTrigger value="data" className="text-xs">
              Data
            </TabsTrigger>
            {node.isHumanInTheLoop && (
              <TabsTrigger value="hitl" className="text-xs">
                HITL
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* ============================================================
              TAB 1: General
              ============================================================ */}
          <TabsContent value="general" className="px-4 pb-6 pt-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="node-name">Name</Label>
              <Input
                id="node-name"
                value={draft.name ?? ""}
                onChange={(e) => updateField({ name: e.target.value })}
                placeholder="Step name"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="node-desc">Description</Label>
              <Textarea
                id="node-desc"
                value={draft.description ?? ""}
                onChange={(e) => updateField({ description: e.target.value })}
                placeholder="What does this step do?"
                rows={3}
              />
            </div>

            {/* Actor Type */}
            <div className="space-y-1.5">
              <Label>Actor Type</Label>
              <Select
                value={draft.actorType ?? "human"}
                onValueChange={(v) =>
                  updateField({ actorType: v as "human" | "system" | "ai_agent" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="human">Human</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="ai_agent">AI Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role */}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={draft.actorName ?? ""}
                onValueChange={(v) => {
                  const role = STANDARDIZED_ROLES.find((r) => r.name === v);
                  updateField({
                    actorName: v,
                    avgHourlyCost: role?.hourlyRate ?? draft.avgHourlyCost,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent>
                  {(["operational", "professional", "specialized", "management"] as const).map(
                    (cat) => (
                      <div key={cat}>
                        <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {cat}
                        </div>
                        {STANDARDIZED_ROLES.filter((r) => r.category === cat).map((role) => (
                          <SelectItem key={role.roleId} value={role.name}>
                            {role.name} (${role.hourlyRate}/hr)
                          </SelectItem>
                        ))}
                      </div>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <Label htmlFor="node-duration">Duration</Label>
              <Input
                id="node-duration"
                value={draft.duration ?? ""}
                onChange={(e) => updateField({ duration: e.target.value })}
                placeholder="e.g., 30 minutes, 2 hours"
              />
            </div>

            {/* Systems */}
            <div className="space-y-1.5">
              <Label htmlFor="node-systems">Systems (comma-separated)</Label>
              <Input
                id="node-systems"
                value={(draft.systems ?? []).join(", ")}
                onChange={(e) =>
                  updateField({
                    systems: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="SAP, Salesforce, Slack"
              />
            </div>
          </TabsContent>

          {/* ============================================================
              TAB 2: Staffing & Cost
              ============================================================ */}
          <TabsContent value="staffing" className="px-4 pb-6 pt-4 space-y-4">
            {/* Employee Count */}
            <div className="space-y-1.5">
              <Label htmlFor="emp-count">Employee Count</Label>
              <Input
                id="emp-count"
                type="number"
                min={0}
                value={draft.employeeCount ?? 1}
                onChange={(e) =>
                  updateField({ employeeCount: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            {/* Hourly Cost */}
            <div className="space-y-1.5">
              <Label htmlFor="hourly-cost">
                Avg Hourly Cost ($)
                {selectedRole && (
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    pre-filled from {selectedRole.name}
                  </span>
                )}
              </Label>
              <Input
                id="hourly-cost"
                type="number"
                min={0}
                step={5}
                value={draft.avgHourlyCost ?? 75}
                onChange={(e) =>
                  updateField({ avgHourlyCost: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            {/* Hours per Execution */}
            <div className="space-y-1.5">
              <Label htmlFor="hours-exec">Hours / Execution</Label>
              <Input
                id="hours-exec"
                type="number"
                min={0}
                step={0.25}
                value={draft.hoursPerTask ?? 1}
                onChange={(e) =>
                  updateField({ hoursPerTask: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            {/* Executions per Month */}
            <div className="space-y-1.5">
              <Label htmlFor="tasks-month">Executions / Month</Label>
              <Input
                id="tasks-month"
                type="number"
                min={0}
                value={draft.tasksPerMonth ?? 20}
                onChange={(e) =>
                  updateField({ tasksPerMonth: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <Separator />

            {/* Calculated Monthly Cost */}
            <div className="rounded-lg border bg-muted/30 p-3">
              <Label className="text-xs text-muted-foreground">Calculated Monthly Cost</Label>
              <div className="mt-1 text-2xl font-bold text-[#36bf78]">
                ${monthlyCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {draft.employeeCount ?? 1} employees x ${draft.avgHourlyCost ?? 75}/hr x{" "}
                {draft.hoursPerTask ?? 1} hrs x {draft.tasksPerMonth ?? 20} exec/mo
              </div>
            </div>
          </TabsContent>

          {/* ============================================================
              TAB 3: Data
              ============================================================ */}
          <TabsContent value="data" className="px-4 pb-6 pt-4 space-y-5">
            {/* Input Data Types */}
            <div className="space-y-2">
              <Label>Input Data Types</Label>
              {renderDataTypeCheckboxes("inputs", draft.inputs)}
            </div>

            <Separator />

            {/* Output Data Types */}
            <div className="space-y-2">
              <Label>Output Data Types</Label>
              {renderDataTypeCheckboxes("outputs", draft.outputs)}
            </div>

            <Separator />

            {/* Data Sources */}
            <div className="space-y-1.5">
              <Label htmlFor="data-sources">Data Sources (comma-separated)</Label>
              <Input
                id="data-sources"
                value={(draft.dataSources ?? []).join(", ")}
                onChange={(e) =>
                  updateField({
                    dataSources: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="CRM, Data Warehouse, API"
              />
            </div>

            {/* Integrations */}
            <div className="space-y-1.5">
              <Label htmlFor="integrations">Integrations (comma-separated)</Label>
              <Input
                id="integrations"
                value={(node.systems ?? []).join(", ")}
                onChange={(e) =>
                  updateField({
                    systems: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Salesforce, Jira, ServiceNow"
              />
            </div>
          </TabsContent>

          {/* ============================================================
              TAB 4: HITL (only for human-in-the-loop nodes)
              ============================================================ */}
          {node.isHumanInTheLoop && (
            <TabsContent value="hitl" className="px-4 pb-6 pt-4 space-y-4">
              {/* EPOCH Category */}
              <div className="space-y-2">
                <Label>EPOCH Category</Label>
                <div className="space-y-2">
                  {EPOCH_CATEGORIES.map((cat) => {
                    const isSelected = (hitl?.epochCategory ?? "operational") === cat.id;
                    return (
                      <label
                        key={cat.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50",
                          isSelected && "border-2 bg-muted/50",
                        )}
                      >
                        <input
                          type="radio"
                          name="epoch-category"
                          checked={isSelected}
                          onChange={() => updateHitl({ epochCategory: cat.id as EpochCategory })}
                          className="sr-only"
                        />
                        <div
                          className="h-3.5 w-3.5 shrink-0 rounded-full"
                          style={{ backgroundColor: EPOCH_COLORS[cat.id as EpochCategory] }}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">{cat.label}</span>
                            <span className="rounded bg-muted px-1 text-[10px] font-bold text-muted-foreground">
                              {cat.letter}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {cat.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="hitl-desc">Checkpoint Description</Label>
                <Textarea
                  id="hitl-desc"
                  value={hitl?.description ?? ""}
                  onChange={(e) => updateHitl({ description: e.target.value })}
                  placeholder="Why is human review needed here?"
                  rows={3}
                />
              </div>

              {/* Approver Role */}
              <div className="space-y-1.5">
                <Label htmlFor="hitl-approver">Approver Role</Label>
                <Input
                  id="hitl-approver"
                  value={hitl?.approverRole ?? ""}
                  onChange={(e) => updateHitl({ approverRole: e.target.value })}
                  placeholder="e.g., Department Director"
                />
              </div>

              {/* Required Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Required Checkpoint</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Must be completed before proceeding
                  </p>
                </div>
                <Switch
                  checked={hitl?.isRequired ?? true}
                  onCheckedChange={(checked) => updateHitl({ isRequired: checked })}
                />
              </div>

              {/* Estimated Minutes */}
              <div className="space-y-1.5">
                <Label htmlFor="hitl-minutes">Estimated Minutes</Label>
                <Input
                  id="hitl-minutes"
                  type="number"
                  min={1}
                  value={hitl?.estimatedMinutes ?? 5}
                  onChange={(e) =>
                    updateHitl({ estimatedMinutes: parseInt(e.target.value) || 5 })
                  }
                />
              </div>
            </TabsContent>
          )}
        </ScrollArea>
      </Tabs>
    </div>
  );
}
