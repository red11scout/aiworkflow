import React, { useState, useMemo, useCallback, Fragment } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getOwnerToken } from "@/lib/queryClient";
import { parseCurrencyString, formatCurrency as formatCurrencyCompact } from "@/lib/utils";
import Layout from "@/components/Layout";
// Note: FRICTION_RECOVERY_RATE no longer needed — frictionUCMap computes actual recovery from benefits data
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileJson,
  Printer,
  Share2,
  Copy,
  Check,
  Brain,
  DollarSign,
  Gauge,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Calculator,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Sparkles,
  ShieldAlert,
  Target,
} from "lucide-react";
import { toast } from "sonner";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function Dashboard() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [executiveSummary, setExecutiveSummary] = useState("");
  const [summaryInitialized, setSummaryInitialized] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);
  const allScenarios = (scenarios as any[]) || [];

  // Initialize executive summary from scenario data
  const dashboard = activeScenario?.executiveDashboard as any;
  if (dashboard?.executiveSummary && !summaryInitialized) {
    setExecutiveSummary(dashboard.executiveSummary);
    setSummaryInitialized(true);
  }

  const priorities = (activeScenario?.priorities as any[]) || [];
  const useCases = (activeScenario?.useCases as any[]) || [];
  const readiness = (activeScenario?.readiness as any[]) || [];
  const frictionItems = (activeScenario?.frictionPoints as any[]) || [];
  const benefits = (activeScenario?.benefits as any[]) || [];

  const getUseCaseName = useCallback(
    (useCaseId: string) => {
      const uc = useCases.find((u: any) => u.id === useCaseId);
      return uc?.name || useCaseId;
    },
    [useCases],
  );

  // Key metrics
  const metrics = useMemo(() => {
    const totalUseCases = useCases.length;
    const totalAnnualValue = dashboard?.totalAnnualValue || 0;
    const avgReadiness =
      readiness.length > 0
        ? readiness.reduce((sum: number, r: any) => sum + (r.readinessScore || 0), 0) / readiness.length
        : 0;
    const topTierCount = priorities.filter(
      (p: any) => p.priorityTier?.toLowerCase().includes("champion") || p.priorityTier === "Tier 1",
    ).length;

    return {
      totalUseCases,
      totalAnnualValue,
      avgReadiness: +avgReadiness.toFixed(1),
      topTierCount,
    };
  }, [useCases, dashboard, readiness, priorities]);

  // Top use cases sorted by priority
  const topUseCases = useMemo(() => {
    return [...priorities]
      .sort((a: any, b: any) => (b.priorityScore || 0) - (a.priorityScore || 0))
      .slice(0, 10);
  }, [priorities]);

  // Multi-year projection
  const projection = dashboard?.projection as any;

  // Toggle expanded row
  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Friction-UC Recovery Map computation ──
  const frictionUCMap = useMemo(() => {
    const rows = frictionItems.map((fp: any) => {
      const frictionCost = parseCurrencyString(fp.estimatedAnnualCost || "$0");
      const matchedUC = useCases.find((uc: any) => uc.targetFriction === fp.frictionPoint);
      const matchedBenefit = matchedUC
        ? benefits.find((b: any) => b.useCaseId === matchedUC.id)
        : null;

      const expectedValue = matchedBenefit
        ? parseCurrencyString(matchedBenefit.expectedValue || "$0")
        : 0;
      const recoveryAmount = Math.min(expectedValue, frictionCost);
      const recoveryPct = frictionCost > 0 ? (recoveryAmount / frictionCost) * 100 : 0;
      const unrecoveredCost = Math.max(0, frictionCost - recoveryAmount);
      const additionalBenefits = Math.max(0, expectedValue - frictionCost);

      // Benefit breakdown for explanation
      const costBen = matchedBenefit ? parseCurrencyString(matchedBenefit.costBenefit || "$0") : 0;
      const revBen = matchedBenefit ? parseCurrencyString(matchedBenefit.revenueBenefit || "$0") : 0;
      const riskBen = matchedBenefit ? parseCurrencyString(matchedBenefit.riskBenefit || "$0") : 0;
      const cfBen = matchedBenefit ? parseCurrencyString(matchedBenefit.cashFlowBenefit || "$0") : 0;

      // Build explanation text
      let explanation = "";
      let methodology = "";
      const status: "full" | "partial" | "low" | "unmapped" = !matchedUC
        ? "unmapped"
        : recoveryPct >= 100
          ? "full"
          : recoveryPct >= 50
            ? "partial"
            : "low";

      if (!matchedUC) {
        explanation = "No use case currently addresses this friction point — potential gap. Consider adding a targeted AI use case.";
        methodology = "Unmapped — no direct use case mapping";
      } else {
        methodology = `${matchedUC.id}: ${formatCurrencyCompact(recoveryAmount)} (${recoveryPct.toFixed(1)}% of friction)`;
        if (additionalBenefits > 0) {
          const parts: string[] = [];
          if (revBen > 0) parts.push(`revenue uplift (${formatCurrencyCompact(revBen)})`);
          if (riskBen > 0) parts.push(`risk mitigation (${formatCurrencyCompact(riskBen)})`);
          if (cfBen > 0) parts.push(`cash flow improvement (${formatCurrencyCompact(cfBen)})`);
          explanation = parts.length > 0
            ? `Added benefits from ${parts.join(", ")} — these exceed the friction cost basis because they capture value beyond labor-hour recovery`
            : "Benefits exceed friction cost basis";
        } else {
          explanation = "Recovery amount is at or below friction cost — no additional benefits above friction basis";
        }
      }

      return {
        id: fp.id,
        frictionPoint: fp.frictionPoint,
        frictionCost,
        ucId: matchedUC?.id || null,
        ucName: matchedUC?.name || null,
        recoveryAmount,
        recoveryPct,
        unrecoveredCost,
        additionalBenefits,
        explanation,
        methodology,
        status,
        severity: fp.severity,
        function: fp.function,
        subFunction: fp.subFunction,
        strategicTheme: fp.strategicTheme,
        costBenefit: costBen,
        revenueBenefit: revBen,
        riskBenefit: riskBen,
        cashFlowBenefit: cfBen,
      };
    });

    // Sort by friction cost descending
    rows.sort((a, b) => b.frictionCost - a.frictionCost);

    // Totals
    const totalFrictionCost = rows.reduce((s, r) => s + r.frictionCost, 0);
    const totalRecovery = rows.reduce((s, r) => s + r.recoveryAmount, 0);
    const totalUnrecovered = rows.reduce((s, r) => s + r.unrecoveredCost, 0);
    const totalAdditional = rows.reduce((s, r) => s + r.additionalBenefits, 0);
    const overallRecoveryRate = totalFrictionCost > 0 ? (totalRecovery / totalFrictionCost) * 100 : 0;
    const mappedCount = rows.filter((r) => r.status !== "unmapped").length;
    const unmappedCount = rows.filter((r) => r.status === "unmapped").length;
    const fullyRecoveredCount = rows.filter((r) => r.status === "full").length;

    return {
      rows,
      totalFrictionCost,
      totalRecovery,
      totalUnrecovered,
      totalAdditional,
      overallRecoveryRate,
      mappedCount,
      unmappedCount,
      fullyRecoveredCount,
    };
  }, [frictionItems, useCases, benefits]);

  // Calculate dashboard
  const calculateMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/calculate/dashboard`, {
        scenarioId: activeScenario?.id,
        executiveSummary,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/scenarios`] });
      setSummaryInitialized(false);
      toast.success("Dashboard data calculated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate: ${error.message}`);
    },
  });

  // Export HTML
  const handleExportHtml = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/export/html`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Owner-Token": getOwnerToken(),
        },
        body: JSON.stringify({ scenarioId: activeScenario?.id }),
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(project as any)?.companyName || "report"}-ai-workflow-report.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("HTML report downloaded");
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/export/excel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Owner-Token": getOwnerToken(),
        },
        body: JSON.stringify({ scenarioId: activeScenario?.id }),
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(project as any)?.companyName || "report"}-ai-workflow-analysis.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel report downloaded");
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    }
  };

  // Save as PDF (opens HTML report in new window for print dialog)
  const handleSaveAsPdf = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/export/html`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Owner-Token": getOwnerToken(),
        },
        body: JSON.stringify({ scenarioId: activeScenario?.id }),
      });
      if (!response.ok) throw new Error("Export failed");
      const html = await response.text();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
      }
      toast.success("PDF print dialog opened");
    } catch (error: any) {
      toast.error(`PDF export failed: ${error.message}`);
    }
  };

  // Export JSON
  const handleExportJson = async () => {
    try {
      const response = await fetch(`/api/projects/${id}/export/json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Owner-Token": getOwnerToken(),
        },
        body: JSON.stringify({ scenarioId: activeScenario?.id }),
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(project as any)?.companyName || "report"}-ai-workflow-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON export downloaded");
    } catch (error: any) {
      toast.error(`JSON export failed: ${error.message}`);
    }
  };

  // Share link
  const shareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/projects/${id}/share`, {
        scenarioId: activeScenario?.id,
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      const url = data.url || `${window.location.origin}/shared/${data.code}`;
      setShareUrl(url);
      toast.success("Share link created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create share link: ${error.message}`);
    },
  });

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Layout
      projectId={id}
      companyName={(project as any)?.companyName}
      completedSteps={activeScenario?.completedSteps}
      showStepper
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          >
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard & Export</h1>
            <p className="text-sm text-muted-foreground">
              Review your AI workflow analysis and export the final report
            </p>
          </div>
        </div>
        <Button
          onClick={() => calculateMutation.mutate()}
          disabled={calculateMutation.isPending}
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          className="text-white hover:opacity-90"
        >
          <Calculator className="w-4 h-4" />
          {calculateMutation.isPending ? "Calculating..." : "Calculate Dashboard"}
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#02a2fd20" }}>
                <Brain className="w-5 h-5" style={{ color: "#02a2fd" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Use Cases</p>
                <p className="text-2xl font-bold text-foreground">{metrics.totalUseCases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#36bf7820" }}>
                <DollarSign className="w-5 h-5" style={{ color: "#36bf78" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Annual Value</p>
                <p className="text-2xl font-bold" style={{ color: "#36bf78" }}>
                  {formatCurrency(metrics.totalAnnualValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#02a2fd20" }}>
                <Gauge className="w-5 h-5" style={{ color: "#02a2fd" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Readiness</p>
                <p className="text-2xl font-bold text-foreground">
                  {metrics.avgReadiness}
                  <span className="text-sm font-normal text-muted-foreground"> / 10</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#f59e0b20" }}>
                <Trophy className="w-5 h-5" style={{ color: "#f59e0b" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Tier Count</p>
                <p className="text-2xl font-bold" style={{ color: "#f59e0b" }}>
                  {metrics.topTierCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Executive Summary */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={executiveSummary}
            onChange={(e) => setExecutiveSummary(e.target.value)}
            placeholder="Enter or edit the executive summary for this analysis..."
            rows={6}
            className="resize-y"
          />
          <p className="text-xs text-muted-foreground mt-2">
            This narrative will be included in the exported report. Use the Calculate button to auto-generate.
          </p>
        </CardContent>
      </Card>

      {/* Top Use Cases Ranked Table */}
      {topUseCases.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Top Use Cases by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Rank</th>
                    <th className="pb-3 font-medium text-muted-foreground">Use Case</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Value</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Readiness</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">TTV</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Priority</th>
                    <th className="pb-3 font-medium text-muted-foreground">Tier</th>
                    <th className="pb-3 font-medium text-muted-foreground">Phase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topUseCases.map((p: any, i: number) => {
                    const tierColor =
                      p.priorityTier?.toLowerCase().includes("champion") || p.priorityTier === "Tier 1"
                        ? "#36bf78"
                        : p.priorityTier?.toLowerCase().includes("strategic") || p.priorityTier === "Tier 2"
                          ? "#f59e0b"
                          : p.priorityTier?.toLowerCase().includes("quick") || p.priorityTier === "Tier 3"
                            ? "#02a2fd"
                            : "#94a3b8";
                    return (
                      <tr key={p.id} className="hover:bg-muted/50">
                        <td className="py-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {i + 1}
                          </Badge>
                        </td>
                        <td className="py-3 font-medium text-foreground">
                          {getUseCaseName(p.useCaseId)}
                        </td>
                        <td className="py-3 text-center font-mono">{p.valueScore?.toFixed(1)}</td>
                        <td className="py-3 text-center font-mono">{p.readinessScore?.toFixed(1)}</td>
                        <td className="py-3 text-center font-mono">{p.ttvScore?.toFixed(1)}</td>
                        <td className="py-3 text-center font-mono font-bold" style={{ color: tierColor }}>
                          {p.priorityScore?.toFixed(1)}
                        </td>
                        <td className="py-3">
                          <Badge
                            style={{
                              backgroundColor: tierColor + "20",
                              color: tierColor,
                              border: `1px solid ${tierColor}40`,
                            }}
                          >
                            {p.priorityTier}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">{p.recommendedPhase}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenario Comparison */}
      {allScenarios.length > 1 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Scenario Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {allScenarios.map((scenario: any) => {
                const sDashboard = scenario.dashboard || {};
                const sUseCases = scenario.useCases || [];
                const sReadiness = scenario.readiness || [];
                const avgReady =
                  sReadiness.length > 0
                    ? (sReadiness.reduce((s: number, r: any) => s + (r.readinessScore || 0), 0) / sReadiness.length).toFixed(1)
                    : "N/A";
                return (
                  <Card
                    key={scenario.id}
                    className={scenario.isActive ? "border-2" : ""}
                    style={scenario.isActive ? { borderColor: "#02a2fd40" } : {}}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-foreground">{scenario.name || "Scenario"}</h4>
                        {scenario.isActive && (
                          <Badge style={{ backgroundColor: "#02a2fd20", color: "#02a2fd" }}>Active</Badge>
                        )}
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Use Cases</span>
                          <span className="font-medium">{sUseCases.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Annual Value</span>
                          <span className="font-medium" style={{ color: "#36bf78" }}>
                            {formatCurrency(sDashboard.totalAnnualValue || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Readiness</span>
                          <span className="font-medium">{avgReady}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Year Projection */}
      {projection && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: "#02a2fd" }} />
              Multi-Year Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Net Present Value (NPV)</p>
                <p className="text-2xl font-bold" style={{ color: "#36bf78" }}>
                  {formatCurrency(projection.npv || 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Internal Rate of Return (IRR)</p>
                <p className="text-2xl font-bold" style={{ color: "#02a2fd" }}>
                  {formatPercent(projection.irr || 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Payback Period</p>
                <p className="text-2xl font-bold text-foreground">
                  {projection.paybackPeriod ? `${projection.paybackPeriod} months` : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════
          Friction-UC Recovery Map
          ══════════════════════════════════════════════════════════════ */}
      {frictionItems.length > 0 && (
        <TooltipProvider delayDuration={300}>
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}
                  >
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  Friction-UC Recovery Map
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs">
                      This analysis maps each organizational friction point to its targeted AI use case, showing how much of the friction cost is recovered and what additional value is generated beyond the friction basis.
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {frictionUCMap.mappedCount}/{frictionUCMap.rows.length} mapped
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">

              {/* ── Insight Callout ── */}
              <div
                className="p-4 rounded-lg border-l-4 bg-muted/30"
                style={{
                  borderLeftColor:
                    frictionUCMap.overallRecoveryRate >= 80 ? "#36bf78"
                    : frictionUCMap.overallRecoveryRate >= 50 ? "#f59e0b"
                    : "#ef4444",
                }}
              >
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#02a2fd" }} />
                  <div className="text-sm text-foreground leading-relaxed">
                    <strong>{frictionUCMap.fullyRecoveredCount}</strong> of{" "}
                    <strong>{frictionUCMap.rows.length}</strong> friction points are fully addressed by AI use cases,
                    recovering <strong style={{ color: "#36bf78" }}>{formatCurrencyCompact(frictionUCMap.totalRecovery)}</strong> and
                    generating <strong style={{ color: "#02a2fd" }}>{formatCurrencyCompact(frictionUCMap.totalAdditional)}</strong> in
                    additional value beyond friction recovery.
                    {frictionUCMap.unmappedCount > 0 && (
                      <span className="text-muted-foreground">
                        {" "}{frictionUCMap.unmappedCount} friction point{frictionUCMap.unmappedCount > 1 ? "s" : ""} remain
                        unaddressed, representing{" "}
                        <strong style={{ color: "#ef4444" }}>
                          {formatCurrencyCompact(
                            frictionUCMap.rows
                              .filter((r) => r.status === "unmapped")
                              .reduce((s, r) => s + r.frictionCost, 0),
                          )}
                        </strong>{" "}
                        in opportunity.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Summary Metric Cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  {
                    label: "Total Friction Cost",
                    value: formatCurrency(frictionUCMap.totalFrictionCost),
                    color: "#ef4444",
                    tip: "Sum of annualized cost across all identified friction points",
                    icon: AlertTriangle,
                  },
                  {
                    label: "Total Recovery",
                    value: formatCurrency(frictionUCMap.totalRecovery),
                    color: "#36bf78",
                    tip: "Amount of friction cost addressed by mapped use cases (capped at friction cost per point)",
                    icon: CheckCircle2,
                  },
                  {
                    label: "Recovery Rate",
                    value: `${frictionUCMap.overallRecoveryRate.toFixed(1)}%`,
                    color: "#02a2fd",
                    tip: "Percentage of total friction cost recovered by AI use cases",
                    icon: Gauge,
                  },
                  {
                    label: "Unrecovered",
                    value: formatCurrency(frictionUCMap.totalUnrecovered),
                    color: "#f59e0b",
                    tip: "Friction cost not yet addressed — represents remaining optimization opportunity",
                    icon: AlertCircle,
                  },
                  {
                    label: "Additional Value",
                    value: formatCurrency(frictionUCMap.totalAdditional),
                    color: "#36bf78",
                    tip: "Value generated ABOVE friction recovery — from revenue uplift, risk mitigation, and cash flow improvement",
                    icon: Sparkles,
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="p-3 rounded-lg bg-muted/40 border border-border/50"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <card.icon className="w-3.5 h-3.5" style={{ color: card.color }} />
                      <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px] text-xs">{card.tip}</TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-lg font-bold font-mono" style={{ color: card.color }}>
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* ── Detail Table ── */}
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="p-3 w-8"></th>
                      {[
                        { label: "Friction Point", tip: "The operational friction or inefficiency identified in the organization" },
                        { label: "Use Case", tip: "The AI use case designed to address this friction point" },
                        { label: "Friction Cost", tip: "Annualized cost of this friction point based on hours \u00d7 loaded rate" },
                        { label: "Recovery ($)", tip: "Amount of friction cost recovered by the mapped use case (capped at friction cost)" },
                        { label: "Recovery %", tip: "Percentage of friction cost recovered \u2014 shown as a visual progress bar" },
                        { label: "Unrecovered ($)", tip: "Remaining friction cost not addressed by the use case" },
                        { label: "Add'l Benefits", tip: "Value generated ABOVE friction recovery \u2014 revenue uplift, risk mitigation, cash flow improvements beyond the labor-hour recovery basis" },
                      ].map((col) => (
                        <th key={col.label} className="p-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          <div className="flex items-center gap-1">
                            {col.label}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-3 h-3 text-muted-foreground/40 cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[220px] text-xs">{col.tip}</TooltipContent>
                            </Tooltip>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {frictionUCMap.rows.map((row) => {
                      const isExpanded = expandedRows.has(row.id);
                      const borderColor =
                        row.status === "full" ? "#36bf78"
                        : row.status === "partial" ? "#f59e0b"
                        : row.status === "low" ? "#ef4444"
                        : "#64748b";
                      const barPct = Math.min(row.recoveryPct, 100);
                      const barColor =
                        row.recoveryPct >= 100 ? "#36bf78"
                        : row.recoveryPct >= 75 ? "#22c55e"
                        : row.recoveryPct >= 50 ? "#f59e0b"
                        : row.recoveryPct >= 25 ? "#f97316"
                        : "#ef4444";

                      return (
                        <Fragment key={row.id}>
                          {/* ── Main Row ── */}
                          <tr
                            className={`cursor-pointer transition-colors hover:bg-muted/40 ${
                              row.status === "unmapped" ? "bg-muted/20" : ""
                            }`}
                            style={{ borderLeft: `4px solid ${borderColor}` }}
                            onClick={() => toggleRow(row.id)}
                          >
                            <td className="p-3 text-center">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </td>
                            <td className="p-3">
                              <div className="max-w-[200px]">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="font-medium text-foreground truncate">{row.frictionPoint}</p>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm text-xs">{row.frictionPoint}</TooltipContent>
                                </Tooltip>
                                {row.status === "unmapped" && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <ShieldAlert className="w-3 h-3 text-amber-500" />
                                    <span className="text-xs text-amber-500 font-medium">Gap</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              {row.ucName ? (
                                <div>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs mb-0.5"
                                    style={{ borderColor: borderColor + "60", color: borderColor }}
                                  >
                                    {row.ucId}
                                  </Badge>
                                  <p className="text-xs text-muted-foreground truncate max-w-[160px]">{row.ucName}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Unmapped</span>
                              )}
                            </td>
                            <td className="p-3 font-mono text-foreground">{formatCurrency(row.frictionCost)}</td>
                            <td className="p-3 font-mono" style={{ color: row.recoveryAmount > 0 ? "#36bf78" : "#64748b" }}>
                              {row.recoveryAmount > 0 ? formatCurrency(row.recoveryAmount) : "—"}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                      width: `${barPct}%`,
                                      backgroundColor: barColor,
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-mono w-12 text-right" style={{ color: barColor }}>
                                  {row.recoveryPct > 0 ? `${row.recoveryPct.toFixed(0)}%` : "0%"}
                                </span>
                                {row.recoveryPct >= 100 && (
                                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#36bf78" }} />
                                )}
                              </div>
                            </td>
                            <td className="p-3 font-mono" style={{ color: row.unrecoveredCost > 0 ? "#f59e0b" : "#64748b" }}>
                              {row.unrecoveredCost > 0 ? formatCurrency(row.unrecoveredCost) : "—"}
                            </td>
                            <td className="p-3 font-mono font-semibold" style={{ color: row.additionalBenefits > 0 ? "#36bf78" : "#64748b" }}>
                              {row.additionalBenefits > 0 ? formatCurrency(row.additionalBenefits) : "—"}
                            </td>
                          </tr>

                          {/* ── Expanded Detail ── */}
                          {isExpanded && (
                            <tr key={`${row.id}-detail`}>
                              <td colSpan={8} className="p-0">
                                <div
                                  className="px-6 py-4 bg-muted/20 border-t border-border/30"
                                  style={{ borderLeft: `4px solid ${borderColor}` }}
                                >
                                  {/* Recovery Methodology */}
                                  <div className="mb-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                                      Recovery Methodology
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border/50">
                                      <span className="font-mono text-sm text-foreground">{row.methodology}</span>
                                    </div>
                                  </div>

                                  {/* Benefit Breakdown (4 mini cards) */}
                                  {row.ucName && (
                                    <div className="mb-4">
                                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                                        Benefit Composition
                                      </p>
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        {[
                                          { label: "Cost Savings", value: row.costBenefit, color: "#02a2fd", desc: "Labor-hour recovery" },
                                          { label: "Revenue Uplift", value: row.revenueBenefit, color: "#36bf78", desc: "New revenue enabled" },
                                          { label: "Risk Mitigation", value: row.riskBenefit, color: "#f59e0b", desc: "Risk reduction value" },
                                          { label: "Cash Flow", value: row.cashFlowBenefit, color: "#8b5cf6", desc: "Working capital freed" },
                                        ].map((b) => (
                                          <div
                                            key={b.label}
                                            className="p-2.5 rounded-md border border-border/40 bg-background"
                                          >
                                            <p className="text-xs text-muted-foreground">{b.label}</p>
                                            <p className="text-sm font-bold font-mono" style={{ color: b.value > 0 ? b.color : "#64748b" }}>
                                              {b.value > 0 ? formatCurrencyCompact(b.value) : "—"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground/60">{b.desc}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Explanation */}
                                  <div className="mb-3">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                                      {row.additionalBenefits > 0 ? "Why Benefits Exceed Friction" : "Analysis"}
                                    </p>
                                    <p className="text-sm text-foreground/80 leading-relaxed">{row.explanation}</p>
                                  </div>

                                  {/* Meta info chips */}
                                  <div className="flex flex-wrap gap-2">
                                    {row.severity && (
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                        style={{
                                          borderColor:
                                            row.severity === "Critical" ? "#ef444460" :
                                            row.severity === "High" ? "#f59e0b60" : "#02a2fd60",
                                          color:
                                            row.severity === "Critical" ? "#ef4444" :
                                            row.severity === "High" ? "#f59e0b" : "#02a2fd",
                                        }}
                                      >
                                        {row.severity}
                                      </Badge>
                                    )}
                                    {row.function && (
                                      <Badge variant="outline" className="text-xs text-muted-foreground">
                                        {row.function}{row.subFunction ? ` \u2192 ${row.subFunction}` : ""}
                                      </Badge>
                                    )}
                                    {row.strategicTheme && (
                                      <Badge variant="outline" className="text-xs" style={{ borderColor: "#02a2fd40", color: "#02a2fd" }}>
                                        {row.strategicTheme}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}

                    {/* ── Totals Row ── */}
                    <tr className="bg-muted/50 font-bold border-t-2 border-border">
                      <td className="p-3"></td>
                      <td className="p-3 text-foreground text-xs uppercase tracking-wide">Totals</td>
                      <td className="p-3"></td>
                      <td className="p-3 font-mono text-foreground">{formatCurrency(frictionUCMap.totalFrictionCost)}</td>
                      <td className="p-3 font-mono" style={{ color: "#36bf78" }}>{formatCurrency(frictionUCMap.totalRecovery)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(frictionUCMap.overallRecoveryRate, 100)}%`,
                                backgroundColor:
                                  frictionUCMap.overallRecoveryRate >= 80 ? "#36bf78"
                                  : frictionUCMap.overallRecoveryRate >= 50 ? "#f59e0b"
                                  : "#ef4444",
                              }}
                            />
                          </div>
                          <span
                            className="text-xs font-mono w-12 text-right"
                            style={{
                              color:
                                frictionUCMap.overallRecoveryRate >= 80 ? "#36bf78"
                                : frictionUCMap.overallRecoveryRate >= 50 ? "#f59e0b"
                                : "#ef4444",
                            }}
                          >
                            {frictionUCMap.overallRecoveryRate.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-mono" style={{ color: "#f59e0b" }}>
                        {formatCurrency(frictionUCMap.totalUnrecovered)}
                      </td>
                      <td className="p-3 font-mono" style={{ color: "#36bf78" }}>
                        {formatCurrency(frictionUCMap.totalAdditional)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Legend ── */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="font-medium">Status:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#36bf78" }} />
                  Fully recovered (\u2265100%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                  Partially recovered (50-99%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                  Low recovery (&lt;50%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "#64748b" }} />
                  Unmapped
                </span>
              </div>

            </CardContent>
          </Card>
        </TooltipProvider>
      )}

      {/* Export Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Export & Share</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleExportHtml} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download HTML Report
            </Button>
            <Button variant="outline" onClick={handleSaveAsPdf} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Save as PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel} className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Download Excel
            </Button>
            <Button variant="outline" onClick={handleExportJson} className="flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              Download JSON
            </Button>
            <Button
              variant="outline"
              onClick={() => shareMutation.mutate()}
              disabled={shareMutation.isPending}
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              {shareMutation.isPending ? "Creating..." : "Create Share Link"}
            </Button>
          </div>

          {/* Share URL Display */}
          {shareUrl && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center gap-3">
              <div className="flex-1 font-mono text-sm text-foreground truncate">{shareUrl}</div>
              <Button variant="outline" size="sm" onClick={copyShareUrl}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate(`/project/${id}/matrix`)}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        {/* Final step - no Next button */}
        <div />
      </div>
    </Layout>
  );
}
