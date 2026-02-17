import { useState, useMemo, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getOwnerToken } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  ArrowLeft,
  Download,
  FileSpreadsheet,
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

  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);
  const allScenarios = (scenarios as any[]) || [];

  // Initialize executive summary from scenario data
  const dashboard = activeScenario?.dashboard as any;
  if (dashboard?.executiveSummary && !summaryInitialized) {
    setExecutiveSummary(dashboard.executiveSummary);
    setSummaryInitialized(true);
  }

  const priorities = (activeScenario?.priorities as any[]) || [];
  const useCases = (activeScenario?.useCases as any[]) || [];
  const readiness = (activeScenario?.readiness as any[]) || [];
  const frictionItems = (activeScenario?.frictionMapping as any[]) || [];

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

  // Friction recovery
  const frictionSummary = useMemo(() => {
    const totalFrictionCost = frictionItems.reduce(
      (sum: number, f: any) => sum + (f.annualCost || f.estimatedCost || 0),
      0,
    );
    const recoverableAmount = dashboard?.recoverableAmount || totalFrictionCost * 0.6;
    return { totalFrictionCost, recoverableAmount };
  }, [frictionItems, dashboard]);

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

      {/* Friction Recovery Summary */}
      {frictionItems.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" style={{ color: "#f59e0b" }} />
              Friction Recovery Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Friction Cost</p>
                <p className="text-2xl font-bold" style={{ color: "#ef4444" }}>
                  {formatCurrency(frictionSummary.totalFrictionCost)}
                </p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Recoverable Amount</p>
                <p className="text-2xl font-bold" style={{ color: "#36bf78" }}>
                  {formatCurrency(frictionSummary.recoverableAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
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
            <Button variant="outline" onClick={handleExportExcel} className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Download Excel
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
