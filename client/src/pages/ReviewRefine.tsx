import { useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { parseCurrencyString, formatCurrencyFull } from "@/lib/utils";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Save,
  Loader2,
  Check,
  X,
  Target,
  Building2,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  Shield,
  ListOrdered,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import type {
  StrategicTheme,
  BusinessFunction,
  FrictionPoint,
  UseCase,
  BenefitQuantification,
  ReadinessModel,
  PriorityScore,
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
  strategicThemes: StrategicTheme[] | null;
  businessFunctions: BusinessFunction[] | null;
  frictionPoints: FrictionPoint[] | null;
  useCases: UseCase[] | null;
  benefits: BenefitQuantification[] | null;
  readiness: ReadinessModel[] | null;
  priorities: PriorityScore[] | null;
  completedSteps: number[];
  [key: string]: any;
}

type SectionName =
  | "strategic_themes"
  | "business_functions"
  | "friction_points"
  | "use_cases"
  | "benefits"
  | "readiness"
  | "priorities";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FRICTION_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  process: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800" },
  data: { bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800" },
  technology: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-700 dark:text-purple-400", border: "border-purple-200 dark:border-purple-800" },
  knowledge: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
};

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Champion: { bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700 dark:text-green-400", border: "border-green-200 dark:border-green-800" },
  "Quick Win": { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-700 dark:text-blue-400", border: "border-blue-200 dark:border-blue-800" },
  "Strategic Bet": { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" },
  Foundation: { bg: "bg-gray-50 dark:bg-gray-950/30", text: "text-gray-700 dark:text-gray-400", border: "border-gray-200 dark:border-gray-700" },
};

function readinessColor(score: number): string {
  if (score >= 8) return "#36bf78";
  if (score >= 6) return "#02a2fd";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

function readinessLabel(score: number): string {
  if (score >= 8) return "Strong";
  if (score >= 6) return "Moderate";
  if (score >= 4) return "Developing";
  return "Low";
}

// ---------------------------------------------------------------------------
// Section Header
// ---------------------------------------------------------------------------

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  isOpen: boolean;
  isEditing: boolean;
  isSaving: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  hasData: boolean;
}

function SectionHeader({
  icon,
  title,
  count,
  isOpen,
  isEditing,
  isSaving,
  onToggleEdit,
  onSave,
  onCancel,
  hasData,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-3">
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, #001278, #02a2fd)",
              }}
            >
              {icon}
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {title}
            </h3>
            <Badge variant="secondary" className="text-xs tabular-nums">
              {count}
            </Badge>
            <ChevronDown
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </CollapsibleTrigger>
      </div>

      {hasData && isOpen && (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancel}
                className="gap-1.5 text-muted-foreground"
                disabled={isSaving}
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving}
                className="gap-1.5 text-white"
                style={{
                  background: "linear-gradient(135deg, #001278, #02a2fd)",
                }}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleEdit}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable Field Helpers
// ---------------------------------------------------------------------------

function EditableText({
  value,
  editing,
  onChange,
  multiline = false,
  className = "",
}: {
  value: string;
  editing: boolean;
  onChange: (val: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  if (!editing) {
    return (
      <span className={`${className}`}>
        {value || <span className="text-muted-foreground italic">--</span>}
      </span>
    );
  }
  if (multiline) {
    return (
      <Textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className={`min-h-[60px] text-sm ${className}`}
      />
    );
  }
  return (
    <Input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={`h-8 text-sm ${className}`}
    />
  );
}

function EditableNumber({
  value,
  editing,
  onChange,
  className = "",
}: {
  value: number;
  editing: boolean;
  onChange: (val: number) => void;
  className?: string;
}) {
  if (!editing) {
    return <span className={className}>{value}</span>;
  }
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      className={`h-8 text-sm w-20 ${className}`}
    />
  );
}

// ---------------------------------------------------------------------------
// Section: Strategic Themes
// ---------------------------------------------------------------------------

function StrategicThemesSection({
  themes,
  editing,
  onChange,
}: {
  themes: StrategicTheme[];
  editing: boolean;
  onChange: (themes: StrategicTheme[]) => void;
}) {
  const update = (index: number, field: keyof StrategicTheme, value: string) => {
    const next = [...themes];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  if (themes.length === 0) {
    return <EmptyState label="No strategic themes found" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {themes.map((theme, i) => (
        <Card key={theme.id || i} className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              <EditableText
                value={theme.name}
                editing={editing}
                onChange={(v) => update(i, "name", v)}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Current State
              </label>
              <EditableText
                value={theme.currentState}
                editing={editing}
                onChange={(v) => update(i, "currentState", v)}
                multiline
                className="block mt-1 text-foreground"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Target State
              </label>
              <EditableText
                value={theme.targetState}
                editing={editing}
                onChange={(v) => update(i, "targetState", v)}
                multiline
                className="block mt-1 text-foreground"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Primary Driver
                </label>
                <EditableText
                  value={theme.primaryDriverImpact}
                  editing={editing}
                  onChange={(v) => update(i, "primaryDriverImpact", v)}
                  className="block mt-1 text-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Secondary Driver
                </label>
                <EditableText
                  value={theme.secondaryDriver}
                  editing={editing}
                  onChange={(v) => update(i, "secondaryDriver", v)}
                  className="block mt-1 text-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Business Functions
// ---------------------------------------------------------------------------

function BusinessFunctionsSection({
  functions,
  editing,
  onChange,
}: {
  functions: BusinessFunction[];
  editing: boolean;
  onChange: (fns: BusinessFunction[]) => void;
}) {
  const update = (index: number, field: keyof BusinessFunction, value: string) => {
    const next = [...functions];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  if (functions.length === 0) {
    return <EmptyState label="No business functions found" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Function</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Sub-Function</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">KPI</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Direction</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Baseline</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Target</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Timeframe</th>
          </tr>
        </thead>
        <tbody>
          {functions.map((fn, i) => (
            <tr key={fn.id || i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3">
                <EditableText value={fn.function} editing={editing} onChange={(v) => update(i, "function", v)} />
              </td>
              <td className="py-2 px-3">
                <EditableText value={fn.subFunction} editing={editing} onChange={(v) => update(i, "subFunction", v)} />
              </td>
              <td className="py-2 px-3">
                <EditableText value={fn.kpiName} editing={editing} onChange={(v) => update(i, "kpiName", v)} />
              </td>
              <td className="py-2 px-3">
                <EditableText value={fn.direction} editing={editing} onChange={(v) => update(i, "direction", v)} />
              </td>
              <td className="py-2 px-3">
                <EditableText value={fn.baselineValue} editing={editing} onChange={(v) => update(i, "baselineValue", v)} />
              </td>
              <td className="py-2 px-3">
                <EditableText value={fn.targetValue} editing={editing} onChange={(v) => update(i, "targetValue", v)} />
              </td>
              <td className="py-2 px-3">
                <EditableText value={fn.timeframe} editing={editing} onChange={(v) => update(i, "timeframe", v)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Friction Points
// ---------------------------------------------------------------------------

function FrictionPointsSection({
  points,
  editing,
  onChange,
}: {
  points: FrictionPoint[];
  editing: boolean;
  onChange: (pts: FrictionPoint[]) => void;
}) {
  const update = (index: number, field: string, value: any) => {
    const next = [...points];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  if (points.length === 0) {
    return <EmptyState label="No friction points found" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Function</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-[200px]">Friction Point</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Severity</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Annual Hrs</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rate/Hr</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Est. Annual Cost</th>
          </tr>
        </thead>
        <tbody>
          {points.map((fp, i) => {
            const typeStyle = FRICTION_TYPE_COLORS[fp.frictionType?.toLowerCase() || ""] || FRICTION_TYPE_COLORS.process;
            return (
              <tr key={fp.id || i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                <td className="py-2 px-3">
                  <EditableText value={fp.role} editing={editing} onChange={(v) => update(i, "role", v)} />
                </td>
                <td className="py-2 px-3">
                  <EditableText value={fp.function} editing={editing} onChange={(v) => update(i, "function", v)} />
                </td>
                <td className="py-2 px-3">
                  <EditableText value={fp.frictionPoint} editing={editing} onChange={(v) => update(i, "frictionPoint", v)} />
                </td>
                <td className="py-2 px-3">
                  {editing ? (
                    <EditableText
                      value={fp.frictionType || ""}
                      editing={editing}
                      onChange={(v) => update(i, "frictionType", v)}
                    />
                  ) : (
                    <Badge
                      variant="outline"
                      className={`text-xs ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
                    >
                      {fp.frictionType || "Unknown"}
                    </Badge>
                  )}
                </td>
                <td className="py-2 px-3">
                  <EditableText value={fp.severity} editing={editing} onChange={(v) => update(i, "severity", v)} />
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {editing ? (
                    <Input
                      type="number"
                      value={fp.annualHours}
                      onChange={(e) => update(i, "annualHours", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm w-24 ml-auto"
                    />
                  ) : (
                    fp.annualHours?.toLocaleString()
                  )}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {editing ? (
                    <Input
                      type="number"
                      value={fp.hourlyRate}
                      onChange={(e) => update(i, "hourlyRate", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm w-24 ml-auto"
                    />
                  ) : (
                    `$${fp.hourlyRate}`
                  )}
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-medium">
                  <EditableText
                    value={fp.estimatedAnnualCost}
                    editing={editing}
                    onChange={(v) => update(i, "estimatedAnnualCost", v)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Use Cases
// ---------------------------------------------------------------------------

function UseCasesSection({
  useCases,
  editing,
  onChange,
}: {
  useCases: UseCase[];
  editing: boolean;
  onChange: (ucs: UseCase[]) => void;
}) {
  const update = (index: number, field: keyof UseCase, value: any) => {
    const next = [...useCases];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  if (useCases.length === 0) {
    return <EmptyState label="No use cases found" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {useCases.map((uc, i) => (
        <Card key={uc.id || i} className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              <EditableText
                value={uc.name}
                editing={editing}
                onChange={(v) => update(i, "name", v)}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Description
              </label>
              <EditableText
                value={uc.description}
                editing={editing}
                onChange={(v) => update(i, "description", v)}
                multiline
                className="block mt-1 text-foreground"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Function
                </label>
                <EditableText
                  value={uc.function}
                  editing={editing}
                  onChange={(v) => update(i, "function", v)}
                  className="block mt-1 text-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Strategic Theme
                </label>
                <EditableText
                  value={uc.strategicTheme}
                  editing={editing}
                  onChange={(v) => update(i, "strategicTheme", v)}
                  className="block mt-1 text-foreground"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                AI Primitives
              </label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {(uc.aiPrimitives || []).map((prim, j) => (
                  <Badge key={j} variant="secondary" className="text-xs">
                    {prim}
                  </Badge>
                ))}
                {(!uc.aiPrimitives || uc.aiPrimitives.length === 0) && (
                  <span className="text-muted-foreground italic text-xs">None</span>
                )}
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Agentic Pattern
                </label>
                <EditableText
                  value={uc.agenticPattern || ""}
                  editing={editing}
                  onChange={(v) => update(i, "agenticPattern", v)}
                  className="block mt-1 text-foreground"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  HITL Checkpoint
                </label>
                <EditableText
                  value={uc.hitlCheckpoint}
                  editing={editing}
                  onChange={(v) => update(i, "hitlCheckpoint", v)}
                  className="block mt-1 text-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Benefits
// ---------------------------------------------------------------------------

function BenefitsSection({
  benefits,
  editing,
  onChange,
}: {
  benefits: BenefitQuantification[];
  editing: boolean;
  onChange: (b: BenefitQuantification[]) => void;
}) {
  const update = (index: number, field: keyof BenefitQuantification, value: string) => {
    const next = [...benefits];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  if (benefits.length === 0) {
    return <EmptyState label="No benefits data found" />;
  }

  const totalCost = benefits.reduce((s, b) => s + parseCurrencyString(b.costBenefit || "0"), 0);
  const totalRevenue = benefits.reduce((s, b) => s + parseCurrencyString(b.revenueBenefit || "0"), 0);
  const totalRisk = benefits.reduce((s, b) => s + parseCurrencyString(b.riskBenefit || "0"), 0);
  const totalCashFlow = benefits.reduce((s, b) => s + parseCurrencyString(b.cashFlowBenefit || "0"), 0);
  const totalAnnual = benefits.reduce((s, b) => s + parseCurrencyString(b.totalAnnualValue || "0"), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Use Case</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cost Benefit</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Revenue Benefit</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Benefit</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Cash Flow</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Annual</th>
          </tr>
        </thead>
        <tbody>
          {benefits.map((b, i) => (
            <tr key={b.id || i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
              <td className="py-2 px-3 font-medium">
                {b.useCaseName}
              </td>
              <td className="py-2 px-3 text-right tabular-nums">
                <EditableText value={b.costBenefit} editing={editing} onChange={(v) => update(i, "costBenefit", v)} className="text-right" />
              </td>
              <td className="py-2 px-3 text-right tabular-nums">
                <EditableText value={b.revenueBenefit} editing={editing} onChange={(v) => update(i, "revenueBenefit", v)} className="text-right" />
              </td>
              <td className="py-2 px-3 text-right tabular-nums">
                <EditableText value={b.riskBenefit} editing={editing} onChange={(v) => update(i, "riskBenefit", v)} className="text-right" />
              </td>
              <td className="py-2 px-3 text-right tabular-nums">
                <EditableText value={b.cashFlowBenefit} editing={editing} onChange={(v) => update(i, "cashFlowBenefit", v)} className="text-right" />
              </td>
              <td className="py-2 px-3 text-right tabular-nums font-semibold">
                <EditableText value={b.totalAnnualValue} editing={editing} onChange={(v) => update(i, "totalAnnualValue", v)} className="text-right" />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/30">
            <td className="py-3 px-3 font-bold text-foreground">Total</td>
            <td className="py-3 px-3 text-right tabular-nums font-bold">{formatCurrencyFull(totalCost)}</td>
            <td className="py-3 px-3 text-right tabular-nums font-bold">{formatCurrencyFull(totalRevenue)}</td>
            <td className="py-3 px-3 text-right tabular-nums font-bold">{formatCurrencyFull(totalRisk)}</td>
            <td className="py-3 px-3 text-right tabular-nums font-bold">{formatCurrencyFull(totalCashFlow)}</td>
            <td className="py-3 px-3 text-right tabular-nums font-bold text-[#36bf78]">{formatCurrencyFull(totalAnnual)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Readiness
// ---------------------------------------------------------------------------

function ReadinessSection({
  readiness,
  editing,
  onChange,
}: {
  readiness: ReadinessModel[];
  editing: boolean;
  onChange: (r: ReadinessModel[]) => void;
}) {
  const update = (index: number, field: string, value: number) => {
    const next = [...readiness];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  if (readiness.length === 0) {
    return <EmptyState label="No readiness data found" />;
  }

  const dimensions = [
    { key: "dataAvailability", label: "Data Availability" },
    { key: "technicalInfrastructure", label: "Technical Infrastructure" },
    { key: "organizationalCapacity", label: "Organizational Capacity" },
    { key: "governance", label: "Governance" },
  ] as const;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {readiness.map((r, i) => (
        <Card key={r.id || i} className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold truncate pr-2">
                {r.useCaseName}
              </CardTitle>
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: readinessColor(r.readinessScore) }}
                />
                <span className="text-sm font-bold tabular-nums" style={{ color: readinessColor(r.readinessScore) }}>
                  {r.readinessScore?.toFixed(1)}
                </span>
                <span className="text-xs text-muted-foreground">/ 10</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dimensions.map((dim) => {
              const score = r[dim.key] as number;
              return (
                <div key={dim.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">{dim.label}</span>
                    <div className="flex items-center gap-1">
                      {editing ? (
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={score}
                          onChange={(e) => update(i, dim.key, Math.min(10, Math.max(1, parseFloat(e.target.value) || 1)))}
                          className="h-6 w-14 text-xs text-right"
                        />
                      ) : (
                        <>
                          <span className="text-xs font-medium tabular-nums">{score}</span>
                          <span className="text-xs text-muted-foreground">/ 10</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(score / 10) * 100}%`,
                        backgroundColor: readinessColor(score),
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="pt-1 border-t border-border/30">
              <Badge variant="outline" className="text-xs" style={{ color: readinessColor(r.readinessScore) }}>
                {readinessLabel(r.readinessScore)}
              </Badge>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section: Priorities
// ---------------------------------------------------------------------------

function PrioritiesSection({
  priorities,
  editing,
  onChange,
}: {
  priorities: PriorityScore[];
  editing: boolean;
  onChange: (p: PriorityScore[]) => void;
}) {
  const update = (index: number, field: string, value: any) => {
    const next = [...priorities];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  };

  if (priorities.length === 0) {
    return <EmptyState label="No priority scores found" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Use Case</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Readiness</th>
            <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Priority</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tier</th>
            <th className="text-left py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Phase</th>
          </tr>
        </thead>
        <tbody>
          {priorities.map((p, i) => {
            const tierStyle = TIER_COLORS[p.priorityTier] || TIER_COLORS.Foundation;
            return (
              <tr key={p.id || i} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                <td className="py-2 px-3 font-medium">{p.useCaseName}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {editing ? (
                    <Input
                      type="number"
                      value={p.valueScore}
                      onChange={(e) => update(i, "valueScore", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm w-20 ml-auto"
                    />
                  ) : (
                    p.valueScore?.toFixed(1)
                  )}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {editing ? (
                    <Input
                      type="number"
                      value={p.readinessScore}
                      onChange={(e) => update(i, "readinessScore", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm w-20 ml-auto"
                    />
                  ) : (
                    p.readinessScore?.toFixed(1)
                  )}
                </td>
                <td className="py-2 px-3 text-right tabular-nums font-semibold">
                  {editing ? (
                    <Input
                      type="number"
                      value={p.priorityScore}
                      onChange={(e) => update(i, "priorityScore", parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm w-20 ml-auto"
                    />
                  ) : (
                    p.priorityScore?.toFixed(1)
                  )}
                </td>
                <td className="py-2 px-3">
                  {editing ? (
                    <EditableText
                      value={p.priorityTier}
                      editing={editing}
                      onChange={(v) => update(i, "priorityTier", v)}
                    />
                  ) : (
                    <Badge
                      variant="outline"
                      className={`text-xs ${tierStyle.bg} ${tierStyle.text} ${tierStyle.border}`}
                    >
                      {p.priorityTier}
                    </Badge>
                  )}
                </td>
                <td className="py-2 px-3">
                  <EditableText
                    value={p.recommendedPhase}
                    editing={editing}
                    onChange={(v) => update(i, "recommendedPhase", v)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-8 text-center text-sm text-muted-foreground italic">
      {label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section config
// ---------------------------------------------------------------------------

interface SectionConfig {
  key: SectionName;
  title: string;
  icon: React.ReactNode;
  dataKey: string;
}

const SECTIONS: SectionConfig[] = [
  {
    key: "strategic_themes",
    title: "Strategic Themes",
    icon: <Target className="w-4 h-4 text-white" />,
    dataKey: "strategicThemes",
  },
  {
    key: "business_functions",
    title: "Business Functions",
    icon: <Building2 className="w-4 h-4 text-white" />,
    dataKey: "businessFunctions",
  },
  {
    key: "friction_points",
    title: "Friction Points",
    icon: <AlertTriangle className="w-4 h-4 text-white" />,
    dataKey: "frictionPoints",
  },
  {
    key: "use_cases",
    title: "Use Cases",
    icon: <Lightbulb className="w-4 h-4 text-white" />,
    dataKey: "useCases",
  },
  {
    key: "benefits",
    title: "Benefits Quantification",
    icon: <DollarSign className="w-4 h-4 text-white" />,
    dataKey: "benefits",
  },
  {
    key: "readiness",
    title: "Readiness Assessment",
    icon: <Shield className="w-4 h-4 text-white" />,
    dataKey: "readiness",
  },
  {
    key: "priorities",
    title: "Priorities",
    icon: <ListOrdered className="w-4 h-4 text-white" />,
    dataKey: "priorities",
  },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ReviewRefine() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Fetch project
  const { data: project, isLoading } = useQuery<ProjectResponse>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const scenario = project?.activeScenario;

  // Per-section state: open, editing, local draft data
  const [openSections, setOpenSections] = useState<Set<SectionName>>(
    new Set<SectionName>(["strategic_themes", "use_cases", "priorities"]),
  );
  const [editingSections, setEditingSections] = useState<Set<SectionName>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, any>>({});

  const toggleOpen = useCallback((key: SectionName) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const startEditing = useCallback(
    (key: SectionName, dataKey: string) => {
      const data = scenario?.[dataKey];
      if (data) {
        setDrafts((prev) => ({ ...prev, [key]: structuredClone(data) }));
      }
      setEditingSections((prev) => new Set(prev).add(key));
    },
    [scenario],
  );

  const cancelEditing = useCallback((key: SectionName) => {
    setEditingSections((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const updateDraft = useCallback((key: SectionName, data: any) => {
    setDrafts((prev) => ({ ...prev, [key]: data }));
  }, []);

  // Save mutation (per section)
  const [savingSection, setSavingSection] = useState<SectionName | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({
      sectionName,
      data,
    }: {
      sectionName: SectionName;
      data: any;
    }) => {
      if (!scenario) throw new Error("No active scenario");
      setSavingSection(sectionName);
      const res = await apiRequest(
        "PUT",
        `/api/scenarios/${scenario.id}/section/${sectionName}`,
        { data },
      );
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${projectId}`],
      });
      setEditingSections((prev) => {
        const next = new Set(prev);
        next.delete(variables.sectionName);
        return next;
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[variables.sectionName];
        return next;
      });
      toast.success("Changes saved", {
        icon: <Check className="w-4 h-4 text-[#36bf78]" />,
      });
      setSavingSection(null);
    },
    onError: (error: Error) => {
      toast.error(`Save failed: ${error.message}`);
      setSavingSection(null);
    },
  });

  // Determine data for each section (draft if editing, otherwise live)
  const getSectionData = useCallback(
    (key: SectionName, dataKey: string): any[] => {
      if (editingSections.has(key) && drafts[key]) {
        return drafts[key];
      }
      return (scenario?.[dataKey] as any[]) || [];
    },
    [editingSections, drafts, scenario],
  );

  // Render section content by key
  const renderSectionContent = useCallback(
    (key: SectionName, dataKey: string) => {
      const data = getSectionData(key, dataKey);
      const isEditing = editingSections.has(key);

      switch (key) {
        case "strategic_themes":
          return (
            <StrategicThemesSection
              themes={data as StrategicTheme[]}
              editing={isEditing}
              onChange={(d) => updateDraft(key, d)}
            />
          );
        case "business_functions":
          return (
            <BusinessFunctionsSection
              functions={data as BusinessFunction[]}
              editing={isEditing}
              onChange={(d) => updateDraft(key, d)}
            />
          );
        case "friction_points":
          return (
            <FrictionPointsSection
              points={data as FrictionPoint[]}
              editing={isEditing}
              onChange={(d) => updateDraft(key, d)}
            />
          );
        case "use_cases":
          return (
            <UseCasesSection
              useCases={data as UseCase[]}
              editing={isEditing}
              onChange={(d) => updateDraft(key, d)}
            />
          );
        case "benefits":
          return (
            <BenefitsSection
              benefits={data as BenefitQuantification[]}
              editing={isEditing}
              onChange={(d) => updateDraft(key, d)}
            />
          );
        case "readiness":
          return (
            <ReadinessSection
              readiness={data as ReadinessModel[]}
              editing={isEditing}
              onChange={(d) => updateDraft(key, d)}
            />
          );
        case "priorities":
          return (
            <PrioritiesSection
              priorities={data as PriorityScore[]}
              editing={isEditing}
              onChange={(d) => updateDraft(key, d)}
            />
          );
        default:
          return null;
      }
    },
    [getSectionData, editingSections, updateDraft],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <Layout projectId={projectId} companyName="" activeTab="review">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#02a2fd]" />
        </div>
      </Layout>
    );
  }

  if (!scenario) {
    return (
      <Layout
        projectId={projectId}
        companyName={project?.companyName}
        activeTab="review"
      >
        <div className="rounded-xl border border-dashed border-border p-16 text-center">
          <div className="flex flex-col items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #001278, #02a2fd)",
              }}
            >
              <ClipboardCheck className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No data to review
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Import data and run the workshop steps first to generate content for review.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate(`/project/${projectId}`)}
              className="mt-2 gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Setup
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      projectId={projectId}
      companyName={project?.companyName}
      activeTab="review"
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
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            Review & Refine
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
            Review all imported and generated data before viewing the dashboard.
            Expand each section to inspect and edit the details.
          </p>
        </div>
      </div>

      {/* AI Hints */}
      <div className="mb-6">
        <AIHintPanel
          section="review"
          sectionLabel="Review & Refine"
          scenarioId={scenario?.id}
          projectId={projectId}
        />
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const data = getSectionData(section.key, section.dataKey);
          const count = Array.isArray(data) ? data.length : 0;
          const isOpen = openSections.has(section.key);
          const isEditing = editingSections.has(section.key);
          const isSaving = savingSection === section.key && saveMutation.isPending;

          return (
            <Collapsible
              key={section.key}
              open={isOpen}
              onOpenChange={() => toggleOpen(section.key)}
            >
              <Card className="border-border/50">
                <CardHeader className="py-3 px-4">
                  <SectionHeader
                    icon={section.icon}
                    title={section.title}
                    count={count}
                    isOpen={isOpen}
                    isEditing={isEditing}
                    isSaving={isSaving}
                    onToggleEdit={() => startEditing(section.key, section.dataKey)}
                    onSave={() =>
                      saveMutation.mutate({
                        sectionName: section.key,
                        data: drafts[section.key] || data,
                      })
                    }
                    onCancel={() => cancelEditing(section.key)}
                    hasData={count > 0}
                  />
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4 px-4">
                    {renderSectionContent(section.key, section.dataKey)}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={() => navigate(`/project/${projectId}/workshop`)}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Workshop
        </Button>
        <Button
          onClick={() => navigate(`/project/${projectId}/dashboard`)}
          className="gap-2 text-white"
          style={{
            background: "linear-gradient(135deg, #001278, #02a2fd)",
          }}
        >
          Dashboard
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Layout>
  );
}
