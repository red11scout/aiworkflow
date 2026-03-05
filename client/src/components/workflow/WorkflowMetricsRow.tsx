import {
  Clock,
  DollarSign,
  Timer,
  Cpu,
  ShieldCheck,
  ArrowRightLeft,
} from "lucide-react";
import type { WorkflowLiveMetrics } from "@shared/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowMetricsRowProps {
  metrics: WorkflowLiveMetrics | null;
  currentStepCount: number;
  targetStepCount: number;
}

// ---------------------------------------------------------------------------
// Individual metric card
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  subtitle?: string;
  /** 0-100 progress bar (optional) */
  progress?: number;
}

function MetricCard({ label, value, icon, accent, subtitle, progress }: MetricCardProps) {
  return (
    <Card className="p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <div className="text-muted-foreground/60">{icon}</div>
      </div>
      <div className={cn("text-2xl font-bold", accent || "text-foreground")}>
        {value}
      </div>
      {progress !== undefined && (
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
      {subtitle && (
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      )}
    </Card>
  );
}

function MetricSkeleton() {
  return (
    <Card className="p-4 flex flex-col gap-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-16" />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function WorkflowMetricsRow({
  metrics,
  currentStepCount,
  targetStepCount,
}: WorkflowMetricsRowProps) {
  // Skeleton placeholders while metrics are computing
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MetricSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <MetricCard
        label="Time Reduction"
        value={`${metrics.timeReductionPct}%`}
        icon={<Clock className="h-4 w-4" />}
        accent="text-emerald-600"
        subtitle={`${metrics.currentTotalHours.toFixed(0)} → ${metrics.targetTotalHours.toFixed(0)} hrs/mo`}
      />
      <MetricCard
        label="Cost Savings"
        value={formatCurrency(metrics.costSaved)}
        icon={<DollarSign className="h-4 w-4" />}
        accent="text-emerald-600"
        subtitle={`${metrics.costReductionPct}% reduction`}
      />
      <MetricCard
        label="Hours Saved"
        value={`${metrics.hoursSaved.toFixed(0)}`}
        icon={<Timer className="h-4 w-4" />}
        accent="text-emerald-600"
        subtitle="per month"
      />
      <MetricCard
        label="Automation"
        value={`${metrics.automationPct}%`}
        icon={<Cpu className="h-4 w-4" />}
        accent="text-blue-600"
        progress={metrics.automationPct}
        subtitle={`${metrics.fteEquivalent} FTE equivalent`}
      />
      <MetricCard
        label="HITL Checkpoints"
        value={metrics.hitlCheckpointCount}
        icon={<ShieldCheck className="h-4 w-4" />}
        accent={metrics.hitlCheckpointCount > 0 ? "text-amber-600" : "text-foreground"}
        subtitle="human decision gates"
      />
      <MetricCard
        label="Steps"
        value={`${currentStepCount} → ${targetStepCount}`}
        icon={<ArrowRightLeft className="h-4 w-4" />}
        subtitle={
          targetStepCount < currentStepCount
            ? `${currentStepCount - targetStepCount} steps eliminated`
            : targetStepCount === currentStepCount
              ? "same count"
              : `${targetStepCount - currentStepCount} steps added`
        }
      />
    </div>
  );
}
