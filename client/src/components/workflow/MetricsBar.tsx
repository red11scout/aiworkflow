// =========================================================================
// MetricsBar — Sticky top bar showing live before/after workflow metrics
// =========================================================================

import {
  Clock,
  DollarSign,
  Layers,
  Shield,
  Cpu,
  Users,
  ArrowDown,
  ArrowUp,
  Minus,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { formatWorkflowCost, formatWorkflowHours } from "@/lib/workflow-calculator";
import type { WorkflowLiveMetrics } from "@shared/types";

// -------------------------------------------------------------------------
// Props
// -------------------------------------------------------------------------

interface MetricsBarProps {
  metrics: WorkflowLiveMetrics | null;
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function TrendArrow({ value }: { value: number }) {
  if (value > 0) {
    return <ArrowDown className="h-3.5 w-3.5 text-emerald-500" />;
  }
  if (value < 0) {
    return <ArrowUp className="h-3.5 w-3.5 text-red-500" />;
  }
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function DeltaBadge({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const colorClass = isPositive
    ? "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950"
    : isNeutral
      ? "text-muted-foreground bg-muted"
      : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950";

  return (
    <span
      className={`ml-1.5 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold ${colorClass}`}
    >
      <TrendArrow value={value} />
      {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}

// -------------------------------------------------------------------------
// MetricCard — individual stat card inside the bar
// -------------------------------------------------------------------------

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary?: string;
  delta?: number;
  deltaSuffix?: string;
  progressValue?: number;
}

function MetricCard({
  icon,
  label,
  primary,
  secondary,
  delta,
  deltaSuffix,
  progressValue,
}: MetricCardProps) {
  return (
    <div className="flex h-16 min-w-[160px] flex-1 items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        {icon}
      </div>
      <div className="flex flex-col overflow-hidden">
        <span className="truncate text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-lg font-bold leading-tight">{primary}</span>
          {secondary && (
            <span className="text-xs text-muted-foreground">{secondary}</span>
          )}
          {delta !== undefined && <DeltaBadge value={delta} suffix={deltaSuffix} />}
        </div>
        {progressValue !== undefined && (
          <Progress value={progressValue} className="mt-1 h-1.5" />
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------
// MetricsBar Component
// -------------------------------------------------------------------------

export function MetricsBar({ metrics }: MetricsBarProps) {
  // Placeholder state when metrics haven't loaded yet
  if (!metrics) {
    return (
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex h-16 min-w-[160px] flex-1 animate-pulse items-center rounded-lg border bg-muted/40 px-3"
          />
        ))}
      </div>
    );
  }

  const {
    currentTotalHours,
    targetTotalHours,
    hoursSaved,
    costSaved,
    timeReductionPct,
    costReductionPct,
    fteEquivalent,
    automationPct,
    hitlCheckpointCount,
  } = metrics;

  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Total Time */}
      <MetricCard
        icon={<Clock className="h-4 w-4 text-[#02a2fd]" />}
        label="Total Time"
        primary={formatWorkflowHours(targetTotalHours)}
        secondary={`from ${formatWorkflowHours(currentTotalHours)}`}
        delta={timeReductionPct}
      />

      {/* Total Cost */}
      <MetricCard
        icon={<DollarSign className="h-4 w-4 text-[#36bf78]" />}
        label="Cost Saved"
        primary={formatWorkflowCost(costSaved)}
        delta={costReductionPct}
      />

      {/* Steps */}
      <MetricCard
        icon={<Layers className="h-4 w-4 text-[#001278]" />}
        label="Steps"
        primary={`${Math.round(currentTotalHours > 0 ? targetTotalHours : 0)}`}
        secondary={`from ${Math.round(currentTotalHours)}`}
      />

      {/* HITL Checkpoints */}
      <MetricCard
        icon={<Shield className="h-4 w-4 text-[#8B5CF6]" />}
        label="HITL Checkpoints"
        primary={`${hitlCheckpointCount}`}
      />

      {/* Automation */}
      <MetricCard
        icon={<Cpu className="h-4 w-4 text-[#F59E0B]" />}
        label="Automation"
        primary={`${automationPct.toFixed(0)}%`}
        progressValue={automationPct}
      />

      {/* FTE Saved */}
      <MetricCard
        icon={<Users className="h-4 w-4 text-[#EF4444]" />}
        label="FTE Saved"
        primary={fteEquivalent.toFixed(1)}
        secondary="FTE"
        delta={hoursSaved > 0 ? hoursSaved : 0}
        deltaSuffix=" hrs"
      />
    </div>
  );
}
