import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Clock, DollarSign, Users, Zap, Eye, EyeOff } from "lucide-react";
import type { WorkflowLiveMetrics } from "@shared/types";

interface BeforeAfterTransitionProps {
  metrics: WorkflowLiveMetrics;
  currentStepCount: number;
  targetStepCount: number;
}

export function BeforeAfterTransition({ metrics, currentStepCount, targetStepCount }: BeforeAfterTransitionProps) {
  const [showDetail, setShowDetail] = useState(false);

  const aiSteps = targetStepCount - metrics.hitlCheckpointCount;
  const humanSteps = metrics.hitlCheckpointCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Transformation Overview</h4>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => setShowDetail(!showDetail)}
        >
          {showDetail ? <><EyeOff className="mr-1 h-3 w-3" /> Hide detail</> : <><Eye className="mr-1 h-3 w-3" /> Show detail</>}
        </Button>
      </div>

      {/* Compact comparison bar */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Current State */}
        <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-red-600 dark:text-red-400">Current</p>
            <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">{currentStepCount} steps</p>
            <div className="mt-1 flex justify-center gap-1">
              {Array.from({ length: Math.min(currentStepCount, 12) }).map((_, i) => (
                <div key={i} className="h-2 w-2 rounded-sm bg-red-400 dark:bg-red-600" />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              {metrics.currentTotalHours.toFixed(0)}h/mo
            </p>
          </CardContent>
        </Card>

        {/* Arrow */}
        <div className="flex flex-col items-center gap-1">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
            {metrics.timeReductionPct > 0 ? `-${metrics.timeReductionPct.toFixed(0)}%` : "—"}
          </Badge>
        </div>

        {/* Target State */}
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400">Target</p>
            <p className="mt-1 text-lg font-bold text-green-700 dark:text-green-300">{targetStepCount} steps</p>
            <div className="mt-1 flex justify-center gap-1">
              {Array.from({ length: Math.min(targetStepCount, 12) }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-sm ${i < aiSteps ? "bg-green-500" : "bg-amber-400"}`}
                />
              ))}
            </div>
            <p className="mt-1 flex justify-center gap-2 text-[10px]">
              <span className="text-green-600">{aiSteps} AI</span>
              <span className="text-amber-600">{humanSteps} human</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              <Clock className="mr-1 inline h-3 w-3" />
              {metrics.targetTotalHours.toFixed(0)}h/mo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detail metrics */}
      {showDetail && (
        <div className="grid grid-cols-4 gap-2">
          <MetricCard
            icon={Clock}
            label="Time Saved"
            value={`${metrics.hoursSaved.toFixed(0)}h`}
            sub={`${metrics.timeReductionPct.toFixed(0)}% reduction`}
            color="text-blue-600"
          />
          <MetricCard
            icon={DollarSign}
            label="Cost Saved"
            value={`$${(metrics.costSaved / 1000).toFixed(0)}K`}
            sub={`${metrics.costReductionPct.toFixed(0)}% reduction`}
            color="text-green-600"
          />
          <MetricCard
            icon={Users}
            label="FTE Equivalent"
            value={metrics.fteEquivalent.toFixed(1)}
            sub="full-time roles"
            color="text-purple-600"
          />
          <MetricCard
            icon={Zap}
            label="Automation"
            value={`${metrics.automationPct.toFixed(0)}%`}
            sub={`${metrics.hitlCheckpointCount} HITL gates`}
            color="text-amber-600"
          />
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-2.5 text-center">
        <Icon className={`mx-auto h-4 w-4 ${color}`} />
        <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
