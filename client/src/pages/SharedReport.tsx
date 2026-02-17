import { useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  DollarSign,
  Gauge,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from "lucide-react";

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

const QUADRANT_COLORS: Record<string, string> = {
  Champions: "#36bf78",
  Strategic: "#f59e0b",
  "Quick Wins": "#02a2fd",
  Foundation: "#94a3b8",
};

function getQuadrant(valueScore: number, readinessScore: number): string {
  const highValue = valueScore >= 6;
  const highReadiness = readinessScore >= 6;
  if (highValue && highReadiness) return "Champions";
  if (highValue && !highReadiness) return "Strategic";
  if (!highValue && highReadiness) return "Quick Wins";
  return "Foundation";
}

function getTierColor(tier: string): string {
  const tierLower = tier?.toLowerCase() || "";
  if (tierLower.includes("champion") || tierLower === "tier 1") return "#36bf78";
  if (tierLower.includes("strategic") || tierLower === "tier 2") return "#f59e0b";
  if (tierLower.includes("quick") || tierLower === "tier 3") return "#02a2fd";
  return "#94a3b8";
}

export default function SharedReport() {
  const { code } = useParams<{ code: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: [`/api/shared/${code}`],
  });

  const report = data as any;

  const useCases = (report?.useCases as any[]) || [];
  const priorities = (report?.priorities as any[]) || [];
  const readiness = (report?.readiness as any[]) || [];
  const dashboard = report?.dashboard as any;
  const projection = dashboard?.projection as any;
  const scenarios = (report?.scenarios as any[]) || [];
  const frictionItems = (report?.frictionMapping as any[]) || [];

  const getUseCaseName = (useCaseId: string) => {
    const uc = useCases.find((u: any) => u.id === useCaseId);
    return uc?.name || useCaseId;
  };

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

  // Friction summary
  const frictionSummary = useMemo(() => {
    const totalFrictionCost = frictionItems.reduce(
      (sum: number, f: any) => sum + (f.annualCost || f.estimatedCost || 0),
      0,
    );
    const recoverableAmount = dashboard?.recoverableAmount || totalFrictionCost * 0.6;
    return { totalFrictionCost, recoverableAmount };
  }, [frictionItems, dashboard]);

  // Top use cases sorted by priority
  const topUseCases = useMemo(() => {
    return [...priorities]
      .sort((a: any, b: any) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }, [priorities]);

  // SVG points for static matrix
  const svgPoints = useMemo(() => {
    return priorities.map((p: any, i: number) => {
      const uc = useCases.find((u: any) => u.id === p.useCaseId);
      return {
        ...p,
        cx: (p.readinessScore / 10) * 100,
        cy: 100 - (p.valueScore / 10) * 100,
        quadrant: getQuadrant(p.valueScore, p.readinessScore),
        code: uc?.code || `UC-${String(i + 1).padStart(2, "0")}`,
      };
    });
  }, [priorities, useCases]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: "#02a2fd" }} />
          <p className="text-lg text-muted-foreground">Loading report...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !report) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Report Not Found</h1>
          <p className="text-muted-foreground">
            This share link may have expired or is not valid. Please contact the report owner for a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* BlueAlly Branded Header */}
      <header
        className="text-white py-6"
        style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
              BA
            </div>
            <span className="text-xl font-semibold">BlueAlly AI Workflow Orchestration</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">
            {report.companyName || "AI Workflow Analysis"} Report
          </h1>
          <p className="text-white/70 text-sm">
            Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : ""}
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        {dashboard?.executiveSummary && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {dashboard.executiveSummary}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Use Case Table */}
        {topUseCases.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Use Cases by Priority</CardTitle>
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
                      <th className="pb-3 font-medium text-muted-foreground text-center">Priority</th>
                      <th className="pb-3 font-medium text-muted-foreground">Tier</th>
                      <th className="pb-3 font-medium text-muted-foreground">Phase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {topUseCases.map((p: any, i: number) => {
                      const tierColor = getTierColor(p.priorityTier);
                      return (
                        <tr key={p.id}>
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

        {/* Static Priority Matrix */}
        {svgPoints.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Value-Readiness Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full" style={{ maxWidth: 600, margin: "0 auto" }}>
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Value Score
                </div>
                <svg viewBox="-8 -4 116 112" className="w-full" style={{ maxHeight: 450 }}>
                  {/* Quadrant backgrounds */}
                  <rect x="0" y="40" width="60" height="60" fill="#94a3b8" opacity="0.08" />
                  <rect x="60" y="40" width="40" height="60" fill="#02a2fd" opacity="0.08" />
                  <rect x="0" y="0" width="60" height="40" fill="#f59e0b" opacity="0.08" />
                  <rect x="60" y="0" width="40" height="40" fill="#36bf78" opacity="0.08" />

                  {/* Threshold lines */}
                  <line x1="60" y1="0" x2="60" y2="100" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2,2" />
                  <line x1="0" y1="40" x2="100" y2="40" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2,2" />

                  {/* Axes */}
                  <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />
                  <line x1="0" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />

                  {/* Axis labels */}
                  {[0, 2, 4, 6, 8, 10].map((val) => (
                    <g key={`x-${val}`}>
                      <line x1={val * 10} y1="100" x2={val * 10} y2="101.5" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />
                      <text x={val * 10} y="104.5" textAnchor="middle" fontSize="3" fill="currentColor" opacity="0.5">
                        {val}
                      </text>
                    </g>
                  ))}
                  {[0, 2, 4, 6, 8, 10].map((val) => (
                    <g key={`y-${val}`}>
                      <line x1="-1.5" y1={100 - val * 10} x2="0" y2={100 - val * 10} stroke="currentColor" strokeWidth="0.3" opacity="0.3" />
                      <text x="-3" y={100 - val * 10 + 1} textAnchor="end" fontSize="3" fill="currentColor" opacity="0.5">
                        {val}
                      </text>
                    </g>
                  ))}

                  {/* Quadrant labels */}
                  <text x="30" y="6" textAnchor="middle" fontSize="3" fill="#f59e0b" opacity="0.6" fontWeight="600">
                    Strategic
                  </text>
                  <text x="80" y="6" textAnchor="middle" fontSize="3" fill="#36bf78" opacity="0.6" fontWeight="600">
                    Champions
                  </text>
                  <text x="30" y="97" textAnchor="middle" fontSize="3" fill="#94a3b8" opacity="0.6" fontWeight="600">
                    Foundation
                  </text>
                  <text x="80" y="97" textAnchor="middle" fontSize="3" fill="#02a2fd" opacity="0.6" fontWeight="600">
                    Quick Wins
                  </text>

                  {/* Data points */}
                  {svgPoints.map((pt: any) => {
                    const color = QUADRANT_COLORS[pt.quadrant];
                    return (
                      <g key={pt.id}>
                        <circle cx={pt.cx} cy={pt.cy} r="3" fill={color} opacity="0.8" stroke="white" strokeWidth="0.5" />
                        <text x={pt.cx} y={pt.cy + 0.8} textAnchor="middle" fontSize="2" fill="white" fontWeight="700">
                          {pt.code}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <div className="text-center text-xs font-medium text-muted-foreground mt-1">
                  Readiness Score
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scenario Comparison */}
        {scenarios.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Scenario Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {scenarios.map((scenario: any) => {
                  const sDashboard = scenario.dashboard || {};
                  const sUseCases = scenario.useCases || [];
                  const sReadiness = scenario.readiness || [];
                  const avgReady =
                    sReadiness.length > 0
                      ? (sReadiness.reduce((s: number, r: any) => s + (r.readinessScore || 0), 0) / sReadiness.length).toFixed(1)
                      : "N/A";
                  return (
                    <Card key={scenario.id}>
                      <CardContent className="pt-6">
                        <h4 className="font-semibold text-foreground mb-4">{scenario.name || "Scenario"}</h4>
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
          <Card>
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

        {/* Friction Recovery */}
        {frictionItems.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" style={{ color: "#f59e0b" }} />
                Friction Recovery
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
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Generated by{" "}
            <span className="font-semibold" style={{ color: "#001278" }}>
              BlueAlly
            </span>{" "}
            AI Workflow Orchestration
          </p>
        </div>
      </footer>
    </div>
  );
}
