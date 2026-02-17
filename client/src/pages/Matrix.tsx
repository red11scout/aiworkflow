import { useState, useMemo, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, ArrowLeft, ArrowRight, Calculator, Trophy, Zap, Target, Layers } from "lucide-react";
import { toast } from "sonner";

interface PriorityScore {
  id: string;
  useCaseId: string;
  valueScore: number;
  readinessScore: number;
  ttvScore: number;
  priorityScore: number;
  priorityTier: string;
  recommendedPhase: string;
}

interface UseCase {
  id: string;
  name: string;
  code?: string;
}

const QUADRANT_COLORS: Record<string, string> = {
  Champions: "#36bf78",
  Strategic: "#f59e0b",
  "Quick Wins": "#02a2fd",
  Foundation: "#94a3b8",
};

const QUADRANT_ICONS: Record<string, typeof Trophy> = {
  Champions: Trophy,
  Strategic: Target,
  "Quick Wins": Zap,
  Foundation: Layers,
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
  const tierLower = tier.toLowerCase();
  if (tierLower.includes("champion") || tierLower === "tier 1") return "#36bf78";
  if (tierLower.includes("strategic") || tierLower === "tier 2") return "#f59e0b";
  if (tierLower.includes("quick") || tierLower === "tier 3") return "#02a2fd";
  return "#94a3b8";
}

export default function Matrix() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);

  const priorities = (activeScenario?.priorities as PriorityScore[]) || [];
  const useCases = (activeScenario?.useCases as UseCase[]) || [];

  const getUseCaseName = useCallback(
    (useCaseId: string) => {
      const uc = useCases.find((u) => u.id === useCaseId);
      return uc?.name || useCaseId;
    },
    [useCases],
  );

  const getUseCaseCode = useCallback(
    (useCaseId: string, fallbackIndex: number) => {
      const uc = useCases.find((u) => u.id === useCaseId);
      return uc?.id || `UC-${String(fallbackIndex + 1).padStart(2, "0")}`;
    },
    [useCases],
  );

  const selectedPriority = priorities.find((p) => p.id === selectedId);

  // Quadrant counts
  const quadrantCounts = useMemo(() => {
    const counts: Record<string, number> = { Champions: 0, Strategic: 0, "Quick Wins": 0, Foundation: 0 };
    priorities.forEach((p) => {
      const q = getQuadrant(p.valueScore, p.readinessScore);
      counts[q]++;
    });
    return counts;
  }, [priorities]);

  // Group by tier
  const groupedByTier = useMemo(() => {
    const groups: Record<string, PriorityScore[]> = {};
    priorities.forEach((p) => {
      const tier = p.priorityTier || "Unclassified";
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(p);
    });
    // Sort each group by priority score descending
    Object.values(groups).forEach((g) => g.sort((a, b) => b.priorityScore - a.priorityScore));
    return groups;
  }, [priorities]);

  const calculateMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/calculate/priorities`, { scenarioId: activeScenario?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/scenarios`] });
      toast.success("Priority scores recalculated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate: ${error.message}`);
    },
  });

  // SVG coordinates: x = readiness, y = value (inverted for SVG)
  const svgPoints = useMemo(() => {
    return priorities.map((p, i) => ({
      ...p,
      cx: (p.readinessScore / 10) * 100,
      cy: 100 - (p.valueScore / 10) * 100,
      quadrant: getQuadrant(p.valueScore, p.readinessScore),
      code: getUseCaseCode(p.useCaseId, i),
    }));
  }, [priorities, getUseCaseCode]);

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
            <Grid3X3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Value-Readiness Matrix</h1>
            <p className="text-sm text-muted-foreground">
              Prioritize use cases by plotting value against organizational readiness
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {priorities.length} {priorities.length === 1 ? "use case" : "use cases"}
          </Badge>
        </div>
        <Button
          onClick={() => calculateMutation.mutate()}
          disabled={calculateMutation.isPending}
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          className="text-white hover:opacity-90"
        >
          <Calculator className="w-4 h-4" />
          {calculateMutation.isPending ? "Calculating..." : "Recalculate"}
        </Button>
      </div>

      {/* Quadrant Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(["Champions", "Strategic", "Quick Wins", "Foundation"] as const).map((quadrant) => {
          const Icon = QUADRANT_ICONS[quadrant];
          const color = QUADRANT_COLORS[quadrant];
          return (
            <Card key={quadrant}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: color + "20" }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{quadrant}</p>
                    <p className="text-2xl font-bold" style={{ color }}>
                      {quadrantCounts[quadrant]}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Matrix SVG */}
      {priorities.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Grid3X3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No priority data yet</h3>
            <p className="text-sm text-muted-foreground">
              Complete the readiness assessment first, then run the priority calculation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Priority Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative w-full" style={{ maxWidth: 700, margin: "0 auto" }}>
              {/* Y-axis label */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-muted-foreground whitespace-nowrap">
                Value Score
              </div>
              <svg
                viewBox="-8 -4 116 112"
                className="w-full"
                style={{ maxHeight: 500 }}
              >
                {/* Quadrant backgrounds */}
                {/* Bottom-left: Foundation (low value, low readiness) */}
                <rect x="0" y="40" width="60" height="60" fill="#94a3b8" opacity="0.08" />
                {/* Bottom-right: Quick Wins (low value, high readiness) */}
                <rect x="60" y="40" width="40" height="60" fill="#02a2fd" opacity="0.08" />
                {/* Top-left: Strategic (high value, low readiness) */}
                <rect x="0" y="0" width="60" height="40" fill="#f59e0b" opacity="0.08" />
                {/* Top-right: Champions (high value, high readiness) */}
                <rect x="60" y="0" width="40" height="40" fill="#36bf78" opacity="0.08" />

                {/* Threshold lines */}
                <line x1="60" y1="0" x2="60" y2="100" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2,2" />
                <line x1="0" y1="40" x2="100" y2="40" stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="2,2" />

                {/* Axes */}
                <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />
                <line x1="0" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />

                {/* Axis tick marks and labels */}
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
                {svgPoints.map((pt) => {
                  const isSelected = pt.id === selectedId;
                  const color = QUADRANT_COLORS[pt.quadrant];
                  return (
                    <g
                      key={pt.id}
                      onClick={() => setSelectedId(isSelected ? null : pt.id)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Selection ring */}
                      {isSelected && (
                        <circle cx={pt.cx} cy={pt.cy} r="4.5" fill="none" stroke={color} strokeWidth="0.5" opacity="0.5" />
                      )}
                      {/* Data circle */}
                      <circle
                        cx={pt.cx}
                        cy={pt.cy}
                        r="3"
                        fill={color}
                        opacity={isSelected ? 1 : 0.8}
                        stroke="white"
                        strokeWidth="0.5"
                      />
                      {/* Label */}
                      <text
                        x={pt.cx}
                        y={pt.cy + 0.8}
                        textAnchor="middle"
                        fontSize="2"
                        fill="white"
                        fontWeight="700"
                      >
                        {pt.code}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {/* X-axis label */}
              <div className="text-center text-xs font-medium text-muted-foreground mt-1">
                Readiness Score
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Use Case Detail Panel */}
      {selectedPriority && (
        <Card className="mb-6 border-2" style={{ borderColor: getTierColor(selectedPriority.priorityTier) + "40" }}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {getUseCaseName(selectedPriority.useCaseId)}
              </CardTitle>
              <Badge
                style={{
                  backgroundColor: getTierColor(selectedPriority.priorityTier) + "20",
                  color: getTierColor(selectedPriority.priorityTier),
                  border: `1px solid ${getTierColor(selectedPriority.priorityTier)}40`,
                }}
              >
                {selectedPriority.priorityTier}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Value Score */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Value Score</p>
                <p className="text-xl font-bold text-foreground">{selectedPriority.valueScore.toFixed(1)}</p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(selectedPriority.valueScore / 10) * 100}%`,
                      backgroundColor: "#f59e0b",
                    }}
                  />
                </div>
              </div>
              {/* Readiness Score */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Readiness Score</p>
                <p className="text-xl font-bold text-foreground">{selectedPriority.readinessScore.toFixed(1)}</p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(selectedPriority.readinessScore / 10) * 100}%`,
                      backgroundColor: "#02a2fd",
                    }}
                  />
                </div>
              </div>
              {/* TTV Score */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">TTV Score</p>
                <p className="text-xl font-bold text-foreground">{selectedPriority.ttvScore.toFixed(1)}</p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(selectedPriority.ttvScore / 10) * 100}%`,
                      backgroundColor: "#36bf78",
                    }}
                  />
                </div>
              </div>
              {/* Priority Score */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Priority Score</p>
                <p className="text-xl font-bold" style={{ color: getTierColor(selectedPriority.priorityTier) }}>
                  {selectedPriority.priorityScore.toFixed(1)}
                </p>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(selectedPriority.priorityScore / 10) * 100}%`,
                      backgroundColor: getTierColor(selectedPriority.priorityTier),
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Recommended Phase: </span>
                <span className="text-sm font-medium text-foreground">{selectedPriority.recommendedPhase}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Quadrant: </span>
                <Badge
                  variant="outline"
                  style={{
                    color: QUADRANT_COLORS[getQuadrant(selectedPriority.valueScore, selectedPriority.readinessScore)],
                    borderColor: QUADRANT_COLORS[getQuadrant(selectedPriority.valueScore, selectedPriority.readinessScore)] + "40",
                  }}
                >
                  {getQuadrant(selectedPriority.valueScore, selectedPriority.readinessScore)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Use Cases Grouped by Tier */}
      {Object.keys(groupedByTier).length > 0 && (
        <div className="space-y-4 mb-6">
          <h2 className="text-lg font-semibold text-foreground">Use Cases by Priority Tier</h2>
          {Object.entries(groupedByTier).map(([tier, items]) => (
            <Card key={tier}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getTierColor(tier) }}
                    />
                    {tier}
                  </CardTitle>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border">
                  {items.map((p, i) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 rounded"
                      onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          {getUseCaseCode(p.useCaseId, i)}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {getUseCaseName(p.useCaseId)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Value: <span className="font-mono font-medium text-foreground">{p.valueScore.toFixed(1)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Ready: <span className="font-mono font-medium text-foreground">{p.readinessScore.toFixed(1)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Priority: <span className="font-mono font-bold" style={{ color: getTierColor(tier) }}>{p.priorityScore.toFixed(1)}</span>
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {p.recommendedPhase}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate(`/project/${id}/readiness`)}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={() => navigate(`/project/${id}/dashboard`)}
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          className="text-white hover:opacity-90"
        >
          Next: Dashboard
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Layout>
  );
}
