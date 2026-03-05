import { Settings, ArrowRight, Target, Database, Plug } from "lucide-react";
import type { WorkflowLiveMetrics } from "@shared/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseCaseBenefitSummaryProps {
  metrics: WorkflowLiveMetrics | null;
  desiredOutcomes?: string[];
  dataTypes?: string[];
  integrations?: string[];
  primaryKpi?: string;
  kpiBefore?: string;
  kpiAfter?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UseCaseBenefitSummary({
  metrics,
  desiredOutcomes,
  dataTypes,
  integrations,
  primaryKpi,
  kpiBefore,
  kpiAfter,
}: UseCaseBenefitSummaryProps) {
  const hasKpi = primaryKpi && kpiBefore && kpiAfter;
  const hasOutcomes = desiredOutcomes && desiredOutcomes.length > 0;
  const hasData = dataTypes && dataTypes.length > 0;
  const hasIntegrations = integrations && integrations.length > 0;
  const hasMetadata = hasOutcomes || hasData || hasIntegrations;

  // Nothing to show
  if (!hasKpi && !hasMetadata && !metrics) return null;

  return (
    <div className="space-y-4">
      {/* ---- KPI Impact bar ---- */}
      {hasKpi && (
        <Card className="p-4">
          <div className="flex items-center flex-wrap gap-3">
            <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">
              Primary KPI Impact:
            </span>
            <span className="text-sm font-semibold">{primaryKpi}</span>
            <div className="flex items-center gap-2 ml-auto">
              <Badge
                variant="outline"
                className="text-xs font-mono text-muted-foreground"
              >
                {kpiBefore}
              </Badge>
              <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-mono hover:bg-emerald-100">
                {kpiAfter}
              </Badge>
            </div>
          </div>
          {/* Inline metrics summary */}
          {metrics && (
            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
              <span>
                Time saved:{" "}
                <strong className="text-emerald-600">
                  {metrics.timeReductionPct}%
                </strong>
              </span>
              <span>
                Cost saved:{" "}
                <strong className="text-emerald-600">
                  {formatCurrency(metrics.costSaved)}
                </strong>
              </span>
              <span>
                Automation:{" "}
                <strong className="text-blue-600">
                  {metrics.automationPct}%
                </strong>
              </span>
              {metrics.hitlCheckpointCount > 0 && (
                <span>
                  HITL gates:{" "}
                  <strong className="text-amber-600">
                    {metrics.hitlCheckpointCount}
                  </strong>
                </span>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ---- Three metadata cards ---- */}
      {hasMetadata && (
        <div
          className={cn(
            "grid gap-4",
            // Adapt grid columns to how many sections have data
            [hasOutcomes, hasData, hasIntegrations].filter(Boolean).length === 3
              ? "grid-cols-1 md:grid-cols-3"
              : [hasOutcomes, hasData, hasIntegrations].filter(Boolean)
                    .length === 2
                ? "grid-cols-1 md:grid-cols-2"
                : "grid-cols-1",
          )}
        >
          {/* Desired Outcomes */}
          {hasOutcomes && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Desired Outcomes
                </span>
              </div>
              <ul className="space-y-1.5">
                {desiredOutcomes!.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Data Types */}
          {hasData && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Data Types
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dataTypes!.map((dt) => (
                  <Badge
                    key={dt}
                    variant="secondary"
                    className="text-xs"
                  >
                    {dt}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Integrations */}
          {hasIntegrations && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Plug className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  Integrations
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {integrations!.map((integ) => (
                  <Badge
                    key={integ}
                    variant="outline"
                    className="text-xs"
                  >
                    {integ}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Fallback: metrics only (no KPI or metadata) */}
      {!hasKpi && !hasMetadata && metrics && (
        <Card className="p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
                Time Saved
              </span>
              <span className="text-lg font-bold text-emerald-600">
                {metrics.timeReductionPct}%
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
                Cost Saved
              </span>
              <span className="text-lg font-bold text-emerald-600">
                {formatCurrency(metrics.costSaved)}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
                Automation
              </span>
              <span className="text-lg font-bold text-blue-600">
                {metrics.automationPct}%
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground block mb-1">
                Hours Saved
              </span>
              <span className="text-lg font-bold text-foreground">
                {metrics.hoursSaved.toFixed(0)}/mo
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
