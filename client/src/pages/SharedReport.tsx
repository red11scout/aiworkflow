import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  DollarSign,
  Zap,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Loader2,
  AlertCircle,
  Users,
  Bot,
  Shield,
} from "lucide-react";
import {
  computeWorkflowMetrics,
  aggregateEnrichedSystemsSummary,
  type UseCaseRow,
} from "@/lib/workflow-metrics";
import { SystemsHeatMap } from "@/components/dashboard/SystemsHeatMap";
import CategoryScoreCard from "@/components/assessment/CategoryScoreCard";
import AssessmentRadarChart from "@/components/assessment/AssessmentRadarChart";
import { formatCurrency } from "@/lib/utils";
import { getPatternById } from "@shared/patterns";
import { ASSESSMENT_STATUS_THRESHOLDS, CATEGORY_METADATA } from "@shared/assessment-questions";
import type { WorkflowMap, AssessmentData, CompositeAssessmentScore } from "@shared/types";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const T = {
  navy: "#001278",
  blue: "#0339AF",
  lightBlue: "#02a2fd",
  darkNavy: "#0F172A",
  slate50: "#F8FAFC",
  green: "#36bf78",
  amber: "#f59e0b",
  white: "#FFFFFF",
};

// ─── Status Badge Colors ─────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  "High Impact": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Medium Impact": "bg-blue-100 text-blue-800 border-blue-200",
  "Low Impact": "bg-amber-100 text-amber-800 border-amber-200",
  Mapped: "bg-slate-100 text-slate-600 border-slate-200",
};

// ─── Metric Comparison Card ──────────────────────────────────────────────────
function cleanMetricValue(val: string): string {
  if (!val) return "";
  return val.replace(/[\n\r]+/g, " ").trim();
}

function MetricDelta({
  label,
  before,
  after,
  improvement,
}: {
  label: string;
  before: string;
  after: string;
  improvement: string;
}) {
  const b = cleanMetricValue(before);
  const a = cleanMetricValue(after);
  const imp = cleanMetricValue(improvement);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 min-h-[100px] flex flex-col">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <span className="text-slate-600 truncate" title={b}>{b || "—"}</span>
        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="font-semibold text-slate-900 truncate" title={a}>{a || "—"}</span>
      </div>
      {imp && imp !== "N/A" && (
        <p
          className="mt-auto pt-1 text-xs font-semibold"
          style={{ color: T.green }}
        >
          {imp.includes("improvement") ? imp : `${imp} improvement`}
        </p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SharedReport() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/shared/${code}`],
    enabled: !!code,
  });
  const report = data as any;

  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(
    new Set(),
  );
  const [expandedUCs, setExpandedUCs] = useState<Set<string>>(new Set());
  const toggleUC = (id: string) => {
    setExpandedUCs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const workflowMaps: WorkflowMap[] = report?.workflowMaps || [];

  // Build use case ID→name map for backward-compat (old data stored IDs as names)
  const ucNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const uc of (report?.useCases || []) as { id: string; name: string }[]) {
      if (uc.id && uc.name) map.set(uc.id, uc.name);
    }
    for (const wf of workflowMaps) {
      if (wf.useCaseId && wf.useCaseName) map.set(wf.useCaseId, wf.useCaseName);
    }
    return map;
  }, [report?.useCases, workflowMaps]);

  // Helper to resolve use case ID to name
  const resolveUcName = (nameOrId: string) => ucNameMap.get(nameOrId) || nameOrId;

  // Auto-expand all workflow cards when data loads
  useEffect(() => {
    if (workflowMaps.length > 0) {
      setExpandedWorkflows(new Set(workflowMaps.map(wf => wf.useCaseId)));
    }
  }, [workflowMaps.length]);

  const rows: UseCaseRow[] = useMemo(
    () => workflowMaps.map(computeWorkflowMetrics),
    [workflowMaps],
  );

  const totals = useMemo(() => {
    const totalHoursSaved = rows.reduce((s, r) => s + r.hoursSaved, 0);
    const totalCostSaved = rows.reduce((s, r) => s + r.costSaved, 0);
    const avgAutomation =
      rows.length > 0
        ? rows.reduce((s, r) => s + r.automationPct, 0) / rows.length
        : 0;
    return { totalHoursSaved, totalCostSaved, avgAutomation, count: rows.length };
  }, [rows]);

  const enrichedSummary = useMemo(
    () => aggregateEnrichedSystemsSummary(workflowMaps),
    [workflowMaps],
  );

  // ── Toggle helpers ────────────────────────────────────────────────────────
  function toggleWorkflow(id: string) {
    setExpandedWorkflows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Loading / Error ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
        <AlertCircle className="h-10 w-10 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-700">
          Report Not Found
        </h2>
        <p className="text-sm text-slate-500 max-w-md">
          This shared report link may have expired or the code is invalid.
          Please check the URL and try again.
        </p>
      </div>
    );
  }

  const companyName = report.companyName || "Company";
  const generatedAt = report.generatedAt
    ? new Date(report.generatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  // ────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* ── 1. Hero Header ─────────────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden px-6 py-14 text-white print:py-8"
        style={{
          background: `linear-gradient(135deg, ${T.navy} 0%, ${T.blue} 100%)`,
        }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -right-20 -top-20 h-72 w-72 rounded-full opacity-10 print:hidden"
          style={{ background: T.lightBlue }}
        />
        <div
          className="absolute -left-16 bottom-0 h-52 w-52 rounded-full opacity-[0.07] print:hidden"
          style={{ background: T.white }}
        />

        <div className="relative mx-auto max-w-5xl">
          <img
            src="/blueally-logo-white.png"
            alt="BlueAlly"
            className="mb-6 h-8 object-contain"
          />
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            AI Workflow Assessment
          </h1>
          <p className="mt-1 text-lg text-blue-200">for {companyName}</p>

          {/* Hero metrics */}
          <div className="mt-8 flex flex-wrap gap-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-blue-300">
                Total Hours Saved
              </p>
              <p className="mt-1 text-3xl font-bold">
                {Math.round(totals.totalHoursSaved).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-blue-300">
                Total Cost Saved
              </p>
              <p className="mt-1 text-3xl font-bold">
                {formatCurrency(totals.totalCostSaved)}
              </p>
            </div>
          </div>

          {/* Date & confidential */}
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-blue-300">
            <span>Generated {generatedAt}</span>
            <span className="hidden sm:inline">|</span>
            <span className="font-semibold uppercase tracking-widest">
              Confidential
            </span>
          </div>
        </div>
      </header>

      {/* ── Body container ─────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl space-y-10 px-6 py-10 print:py-6 print:space-y-6">
        {/* ── 2. KPI Summary Cards ───────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              icon={<Clock className="h-5 w-5" />}
              label="Hours Saved"
              value={Math.round(totals.totalHoursSaved).toLocaleString()}
              color={T.lightBlue}
            />
            <KpiCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Cost Saved"
              value={formatCurrency(totals.totalCostSaved)}
              color={T.green}
            />
            <KpiCard
              icon={<Zap className="h-5 w-5" />}
              label="Avg Automation"
              value={`${Math.round(totals.avgAutomation)}%`}
              color={T.amber}
            />
            <KpiCard
              icon={<BarChart3 className="h-5 w-5" />}
              label="Workflows Mapped"
              value={String(totals.count)}
              color={T.navy}
            />
          </div>
        </section>

        {/* ── 3. Per-Use-Case Benefits Table ─────────────────────────────── */}
        {rows.length > 0 && (
          <section>
            <SectionHeading title="Use Case Benefits" />
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Use Case</th>
                    <th className="px-4 py-3 text-right">Current Hrs</th>
                    <th className="px-4 py-3 text-right">Target Hrs</th>
                    <th className="px-4 py-3 text-right">Hours Saved</th>
                    <th className="px-4 py-3 text-right">Cost Saved</th>
                    <th className="px-4 py-3 text-right">Automation</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.useCaseId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {r.useCaseName}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {Math.round(r.currentHours).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {Math.round(r.targetHours).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">
                        {Math.round(r.hoursSaved).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">
                        {formatCurrency(r.costSaved)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {Math.round(r.automationPct)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status] || STATUS_STYLE.Mapped}`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold text-slate-900">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Math.round(rows.reduce((s, r) => s + r.currentHours, 0)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Math.round(rows.reduce((s, r) => s + r.targetHours, 0)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Math.round(totals.totalHoursSaved).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(totals.totalCostSaved)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Math.round(totals.avgAutomation)}%
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* ── 4. Workflow Transformations ─────────────────────────────────── */}
        {workflowMaps.length > 0 && (
          <section>
            <SectionHeading title="Workflow Transformations" />
            <div className="space-y-4">
              {workflowMaps.map((wf) => {
                const isOpen = expandedWorkflows.has(wf.useCaseId);
                const pattern = getPatternById(wf.agenticPattern);
                const cm = wf.comparisonMetrics;

                const currentSteps = (wf.currentState || []).length;
                const targetSteps = (wf.targetState || []).length;
                const aiSteps = (wf.targetState || []).filter(
                  (n) => n.isAIEnabled,
                ).length;
                const hitlSteps = (wf.targetState || []).filter(
                  (n) => n.isHumanInTheLoop,
                ).length;

                return (
                  <div
                    key={wf.useCaseId}
                    className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden print:break-inside-avoid"
                  >
                    {/* Header row */}
                    <button
                      onClick={() => toggleWorkflow(wf.useCaseId)}
                      className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors print:hover:bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-semibold text-slate-800 truncate">
                          {wf.useCaseName}
                        </span>
                        {pattern && (
                          <span
                            className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                            style={{ backgroundColor: T.lightBlue }}
                          >
                            {pattern.name.split("(")[0].trim()}
                          </span>
                        )}
                      </div>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                    </button>

                    {/* Expanded content */}
                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 py-5 space-y-5">
                        {/* Comparison metrics grid */}
                        {cm && (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <MetricDelta
                              label="Time"
                              before={cm.timeReduction?.before || ""}
                              after={cm.timeReduction?.after || ""}
                              improvement={cm.timeReduction?.improvement || ""}
                            />
                            <MetricDelta
                              label="Cost"
                              before={cm.costReduction?.before || ""}
                              after={cm.costReduction?.after || ""}
                              improvement={cm.costReduction?.improvement || ""}
                            />
                            <MetricDelta
                              label="Quality"
                              before={cm.qualityImprovement?.before || ""}
                              after={cm.qualityImprovement?.after || ""}
                              improvement={
                                cm.qualityImprovement?.improvement || ""
                              }
                            />
                            <MetricDelta
                              label="Throughput"
                              before={cm.throughputIncrease?.before || ""}
                              after={cm.throughputIncrease?.after || ""}
                              improvement={
                                cm.throughputIncrease?.improvement || ""
                              }
                            />
                          </div>
                        )}

                        {/* Step counts */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <StepStat
                            label="Current Steps"
                            value={currentSteps}
                            icon={
                              <Users className="h-4 w-4 text-slate-400" />
                            }
                          />
                          <StepStat
                            label="Target Steps"
                            value={targetSteps}
                            icon={
                              <Zap className="h-4 w-4 text-slate-400" />
                            }
                          />
                          <StepStat
                            label="AI-Enabled"
                            value={aiSteps}
                            icon={
                              <Bot className="h-4 w-4 text-slate-400" />
                            }
                          />
                          <StepStat
                            label="HITL Checkpoints"
                            value={hitlSteps}
                            icon={
                              <Users className="h-4 w-4 text-slate-400" />
                            }
                          />
                        </div>

                        {/* Workflow Process Comparison */}
                        {((wf.currentState || []).length > 0 ||
                          (wf.targetState || []).length > 0) && (
                          <div className="border-t border-slate-100 pt-5">
                            <h4 className="mb-4 text-sm font-semibold text-slate-700">
                              Process Comparison
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                              {/* Current Process */}
                              <div>
                                <div className="mb-3 flex items-center gap-2">
                                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                    Current Process
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {(wf.currentState || []).map((node, nIdx) => (
                                    <div key={node.id || nIdx}>
                                      <div className="flex items-start gap-2.5 rounded-md border border-slate-100 bg-slate-50 p-3 print:break-inside-avoid">
                                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                                          {node.stepNumber || nIdx + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium text-slate-800">
                                            {node.name}
                                          </p>
                                          <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-0.5">
                                              {node.actorType === "human" ? (
                                                <Users className="h-3 w-3" />
                                              ) : node.actorType === "system" ? (
                                                <Zap className="h-3 w-3" />
                                              ) : (
                                                <Bot className="h-3 w-3" />
                                              )}
                                              {node.actorName || node.actorType}
                                            </span>
                                            {node.duration && (
                                              <span>
                                                | {node.duration}
                                              </span>
                                            )}
                                            {node.systems?.length > 0 && (
                                              <span>
                                                | {node.systems.join(", ")}
                                              </span>
                                            )}
                                          </div>
                                          {node.isBottleneck && (
                                            <span className="mt-1.5 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                              Bottleneck
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      {nIdx < (wf.currentState || []).length - 1 && (
                                        <div className="flex justify-center py-0.5">
                                          <ChevronDown className="h-3 w-3 text-slate-300" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* AI-Powered Process */}
                              <div>
                                <div className="mb-3 flex items-center gap-2">
                                  <span
                                    className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                                    style={{ backgroundColor: T.green }}
                                  >
                                    AI-Powered Process
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {(wf.targetState || []).map((node, nIdx) => (
                                    <div key={node.id || nIdx}>
                                      <div className="flex items-start gap-2.5 rounded-md border border-slate-100 bg-white p-3 print:break-inside-avoid">
                                        <div
                                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                                          style={{
                                            backgroundColor: node.isAIEnabled
                                              ? T.green
                                              : "#94a3b8",
                                          }}
                                        >
                                          {node.stepNumber || nIdx + 1}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium text-slate-800">
                                            {node.name}
                                          </p>
                                          <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-slate-500">
                                            <span className="inline-flex items-center gap-0.5">
                                              {node.actorType === "ai_agent" ? (
                                                <Bot className="h-3 w-3" />
                                              ) : node.actorType === "human" ? (
                                                <Users className="h-3 w-3" />
                                              ) : (
                                                <Zap className="h-3 w-3" />
                                              )}
                                              {node.actorName || node.actorType}
                                            </span>
                                            {node.duration && (
                                              <span>
                                                | {node.duration}
                                              </span>
                                            )}
                                            {node.systems?.length > 0 && (
                                              <span>
                                                | {node.systems.join(", ")}
                                              </span>
                                            )}
                                          </div>
                                          <div className="mt-1.5 flex flex-wrap gap-1">
                                            {node.isAIEnabled && (
                                              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                                AI-Enabled
                                              </span>
                                            )}
                                            {node.automationLevel &&
                                              node.automationLevel !== "manual" && (
                                                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 capitalize">
                                                  {node.automationLevel}
                                                </span>
                                              )}
                                            {node.isHumanInTheLoop && (
                                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                HITL
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {nIdx < (wf.targetState || []).length - 1 && (
                                        <div className="flex justify-center py-0.5">
                                          <ChevronDown className="h-3 w-3 text-slate-300" />
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 5. Systems, Data & Integrations — Heat Map + Insights ──────── */}
        {enrichedSummary.enrichedSystems.length > 0 && (
          <section>
            <SystemsHeatMap summary={enrichedSummary} variant="report" />
          </section>
        )}

        {/* ── 6. AI Readiness Assessment ─────────────────────────────────── */}
        {(() => {
          const assessment = (report as any).assessment as AssessmentData | null;
          const scores = assessment?.scores;
          if (!scores) return null;

          const overallPct = Math.round(scores.overallPercentage * 100);
          const overallThreshold = ASSESSMENT_STATUS_THRESHOLDS.find(
            (t) => scores.overallPercentage >= t.min,
          );

          // Gather top 5 gaps across all use cases (resolve IDs to names for old data)
          const allGaps = scores.useCaseScores
            .flatMap((uc) =>
              uc.gaps.map((g) => ({ ...g, useCaseName: resolveUcName(uc.useCaseName) })),
            )
            .sort((a, b) => b.gapSize - a.gapSize)
            .slice(0, 5);

          return (
            <section className="print:break-before-page">
              <SectionHeading title="AI Readiness Assessment" />
              <p className="mb-6 -mt-2 text-sm text-slate-500">
                Organizational readiness across skills, data, infrastructure, and
                governance dimensions.
              </p>

              {/* Overall Score Hero */}
              <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm text-center mb-6">
                <p className="text-xs font-medium uppercase tracking-widest text-slate-500 mb-2">
                  Overall AI Readiness
                </p>
                <p
                  className="text-6xl font-bold"
                  style={{ color: overallThreshold?.color }}
                >
                  {overallPct}%
                </p>
                <span
                  className="mt-3 inline-block rounded-full px-3 py-1 text-sm font-semibold text-white"
                  style={{ backgroundColor: overallThreshold?.color }}
                >
                  {overallThreshold?.label}
                </span>
                {scores.overallStatusDescription && (
                  <p className="mt-3 text-sm text-slate-600 max-w-lg mx-auto">
                    {scores.overallStatusDescription}
                  </p>
                )}
                <p className="mt-2 text-xs text-slate-400">
                  {scores.answeredQuestions} of {scores.totalQuestions} questions
                  answered ({Math.round(scores.completionPercentage * 100)}%
                  complete)
                </p>
              </div>

              {/* Category Scores (2x2) + Radar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {scores.categories.map((cat) => (
                    <CategoryScoreCard key={cat.category} score={cat} />
                  ))}
                </div>
                <AssessmentRadarChart categories={scores.categories} />
              </div>

              {/* Top 5 Gaps */}
              {allGaps.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">
                    Top Readiness Gaps
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3">Area</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-center">Current</th>
                          <th className="px-4 py-3 text-center">Target</th>
                          <th className="px-4 py-3 text-center">Gap</th>
                          <th className="px-4 py-3">Use Case</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allGaps.map((gap, idx) => {
                          const gapColor =
                            gap.gapSize >= 3
                              ? "#ef4444"
                              : gap.gapSize >= 2
                                ? "#f59e0b"
                                : T.lightBlue;
                          const catMeta =
                            CATEGORY_METADATA[gap.category];
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="px-4 py-3 text-slate-800 max-w-[240px]">
                                <p className="text-sm leading-snug">
                                  {gap.questionText}
                                </p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {gap.subCategory}
                                </p>
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className="text-xs font-medium"
                                  style={{ color: catMeta?.color }}
                                >
                                  {catMeta?.label || gap.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                                {gap.currentScore}
                              </td>
                              <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                                {gap.targetScore}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className="inline-block rounded-full px-2 py-0.5 text-xs font-bold text-white"
                                  style={{ backgroundColor: gapColor }}
                                >
                                  {gap.gapSize}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-500 max-w-[160px] truncate">
                                {gap.useCaseName}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Use Case Readiness Table */}
              {scores.useCaseScores.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">
                    Use Case Readiness
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <th className="px-4 py-3">Use Case</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3 text-center">Questions</th>
                          <th className="px-4 py-3 text-center">Gaps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scores.useCaseScores.map((uc) => {
                          const ucPct = Math.round(uc.percentage * 100);
                          const ucThreshold =
                            ASSESSMENT_STATUS_THRESHOLDS.find(
                              (t) => uc.percentage >= t.min,
                            );
                          const hasGaps = uc.gaps.length > 0;
                          const isExpanded = expandedUCs.has(uc.useCaseId);
                          return (
                            <React.Fragment key={uc.useCaseId}>
                              <tr
                                className={`hover:bg-slate-50/60 ${hasGaps ? "cursor-pointer" : ""}`}
                                onClick={() => hasGaps && toggleUC(uc.useCaseId)}
                              >
                                <td className="px-4 py-3 font-medium text-slate-800">
                                  <span className="flex items-center gap-1.5">
                                    {hasGaps && (
                                      isExpanded
                                        ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    )}
                                    {resolveUcName(uc.useCaseName)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                                    style={{
                                      backgroundColor: ucThreshold?.color,
                                    }}
                                  >
                                    {ucThreshold?.label}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center tabular-nums text-slate-600">
                                  {uc.mappedQuestionIds.length}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  {hasGaps ? (
                                    <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                                      {uc.gaps.length}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-medium" style={{ color: T.green }}>
                                      OK
                                    </span>
                                  )}
                                </td>
                              </tr>
                              {isExpanded && hasGaps && (
                                <tr>
                                  <td colSpan={4} className="px-4 py-0 bg-slate-50/40">
                                    <div className="py-3 pl-5 space-y-2">
                                      {uc.gaps.map((gap, gi) => {
                                        const severityColor = gap.gapSize >= 3 ? "#ef4444" : gap.gapSize >= 2 ? "#f59e0b" : "#02a2fd";
                                        const tipText = gap.tip || assessment?.gapGuidance?.[gap.questionId] || "";
                                        return (
                                          <div key={gi} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                              <span
                                                className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                                                style={{ backgroundColor: severityColor }}
                                              >
                                                Gap: {gap.gapSize}
                                              </span>
                                              <span className="font-semibold text-slate-600 capitalize">
                                                {gap.category}
                                              </span>
                                              <span className="text-slate-400">|</span>
                                              <span className="text-slate-500">
                                                {gap.subCategory}
                                              </span>
                                              <span className="ml-auto text-slate-400 tabular-nums text-[10px]">
                                                Current: {gap.currentScore} → Target: {gap.targetScore}
                                              </span>
                                            </div>
                                            <p className="text-slate-600 mb-1">{gap.questionText}</p>
                                            {tipText && (
                                              <p className="text-slate-500 italic border-l-2 border-slate-300 pl-2 mt-1.5">
                                                {tipText}
                                              </p>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          );
        })()}
      </main>

      {/* ── 6. Footer ──────────────────────────────────────────────────────── */}
      <footer
        className="mt-4 px-6 py-8 text-center print:mt-0 print:py-4"
        style={{ backgroundColor: T.navy }}
      >
        <img
          src="/blueally-logo-white.png"
          alt="BlueAlly"
          className="mx-auto mb-3 h-6 object-contain"
        />
        <p className="text-xs text-blue-300">
          Confidential &mdash; BlueAlly Technology Solutions
        </p>
      </footer>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeading({ title }: { title: string }) {
  return (
    <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-800">
      {title}
    </h2>
  );
}

function KpiCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}18`, color }}
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function StepStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      {icon}
      <div>
        <p className="text-lg font-bold tabular-nums text-slate-800">
          {value}
        </p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
