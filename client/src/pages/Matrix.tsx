import { useState, useMemo, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Grid3X3,
  ArrowLeft,
  ArrowRight,
  Calculator,
  BarChart3,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import type { PriorityScore, UseCase } from "@shared/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALUE_THRESHOLD = 5.5;
const READINESS_THRESHOLD = 5.5;

type QuadrantKey = "Champions" | "Strategic" | "Quick Wins" | "Foundation";

const QUADRANT_META: Record<
  QuadrantKey,
  { color: string; fill: string; subtitle: string }
> = {
  Champions: {
    color: "#1e293b",
    fill: "rgba(54, 191, 120, 0.08)",
    subtitle: "High Value + High Readiness",
  },
  Strategic: {
    color: "#6366f1",
    fill: "rgba(2, 162, 253, 0.06)",
    subtitle: "High Value + Low Readiness",
  },
  "Quick Wins": {
    color: "#3b82f6",
    fill: "rgba(54, 191, 120, 0.04)",
    subtitle: "Low Value + High Readiness",
  },
  Foundation: {
    color: "#94a3b8",
    fill: "rgba(148, 163, 184, 0.05)",
    subtitle: "Low Value + Low Readiness",
  },
};

const QUADRANT_LABEL_COLORS: Record<QuadrantKey, string> = {
  Champions: "#36bf78",
  Strategic: "#6366f1",
  "Quick Wins": "#3b82f6",
  Foundation: "#94a3b8",
};

const QUADRANT_CARD_ACCENTS: Record<QuadrantKey, string> = {
  Champions: "#36bf78",
  Strategic: "#6366f1",
  "Quick Wins": "#3b82f6",
  Foundation: "#94a3b8",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getQuadrant(valueScore: number, readinessScore: number): QuadrantKey {
  const highValue = valueScore >= VALUE_THRESHOLD;
  const highReadiness = readinessScore >= READINESS_THRESHOLD;
  if (highValue && highReadiness) return "Champions";
  if (highValue && !highReadiness) return "Strategic";
  if (!highValue && highReadiness) return "Quick Wins";
  return "Foundation";
}

function getTierColor(tier: string): string {
  const t = tier.toLowerCase();
  if (t.includes("champion") || t === "tier 1") return "#36bf78";
  if (t.includes("quick") || t === "tier 2") return "#3b82f6";
  if (t.includes("strategic") || t === "tier 3") return "#6366f1";
  return "#94a3b8";
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ---------------------------------------------------------------------------
// SVG Bubble Chart (inner component)
// ---------------------------------------------------------------------------

interface BubblePoint {
  id: string;
  useCaseId: string;
  name: string;
  valueScore: number;
  readinessScore: number;
  ttvScore: number;
  priorityScore: number;
  priorityTier: string;
  recommendedPhase: string;
  quadrant: QuadrantKey;
  cx: number;
  cy: number;
  r: number;
}

interface BubbleChartProps {
  points: BubblePoint[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

// Chart constants
const CHART_PAD = { top: 30, right: 30, bottom: 50, left: 60 };
const SVG_W = 800;
const SVG_H = 560;
const PLOT_W = SVG_W - CHART_PAD.left - CHART_PAD.right;
const PLOT_H = SVG_H - CHART_PAD.top - CHART_PAD.bottom;

function BubbleChart({
  points,
  selectedId,
  onSelect,
  xMin,
  xMax,
  yMin,
  yMax,
}: BubbleChartProps) {
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  const toX = (v: number) =>
    CHART_PAD.left + ((v - xMin) / xRange) * PLOT_W;
  const toY = (v: number) =>
    CHART_PAD.top + PLOT_H - ((v - yMin) / yRange) * PLOT_H;

  // Threshold pixel positions
  const threshX = toX(READINESS_THRESHOLD);
  const threshY = toY(VALUE_THRESHOLD);

  // Tick generation
  const xTicks: number[] = [];
  const xStep = xRange <= 5 ? 0.5 : 1;
  for (let v = Math.ceil(xMin); v <= Math.floor(xMax); v += xStep) xTicks.push(v);
  if (!xTicks.includes(Math.ceil(xMin))) xTicks.unshift(Math.ceil(xMin));

  const yTicks: number[] = [];
  const yStep = yRange <= 5 ? 0.5 : 1;
  for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v += yStep) yTicks.push(v);
  if (!yTicks.includes(Math.ceil(yMin))) yTicks.unshift(Math.ceil(yMin));

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      width="100%"
      className="select-none"
      style={{ maxHeight: 600 }}
    >
      <defs>
        <clipPath id="plot-area">
          <rect
            x={CHART_PAD.left}
            y={CHART_PAD.top}
            width={PLOT_W}
            height={PLOT_H}
          />
        </clipPath>
      </defs>

      {/* ---- Quadrant backgrounds (clipped) ---- */}
      <g clipPath="url(#plot-area)">
        {/* Top-left: Strategic */}
        <rect
          x={CHART_PAD.left}
          y={CHART_PAD.top}
          width={threshX - CHART_PAD.left}
          height={threshY - CHART_PAD.top}
          fill={QUADRANT_META.Strategic.fill}
        />
        {/* Top-right: Champions */}
        <rect
          x={threshX}
          y={CHART_PAD.top}
          width={CHART_PAD.left + PLOT_W - threshX}
          height={threshY - CHART_PAD.top}
          fill={QUADRANT_META.Champions.fill}
        />
        {/* Bottom-left: Foundation */}
        <rect
          x={CHART_PAD.left}
          y={threshY}
          width={threshX - CHART_PAD.left}
          height={CHART_PAD.top + PLOT_H - threshY}
          fill={QUADRANT_META.Foundation.fill}
        />
        {/* Bottom-right: Quick Wins */}
        <rect
          x={threshX}
          y={threshY}
          width={CHART_PAD.left + PLOT_W - threshX}
          height={CHART_PAD.top + PLOT_H - threshY}
          fill={QUADRANT_META["Quick Wins"].fill}
        />
      </g>

      {/* ---- Grid lines ---- */}
      <g clipPath="url(#plot-area)" opacity="0.15">
        {xTicks.map((v) => (
          <line
            key={`gx-${v}`}
            x1={toX(v)}
            y1={CHART_PAD.top}
            x2={toX(v)}
            y2={CHART_PAD.top + PLOT_H}
            stroke="currentColor"
            strokeWidth="0.7"
            strokeDasharray="4 4"
          />
        ))}
        {yTicks.map((v) => (
          <line
            key={`gy-${v}`}
            x1={CHART_PAD.left}
            y1={toY(v)}
            x2={CHART_PAD.left + PLOT_W}
            y2={toY(v)}
            stroke="currentColor"
            strokeWidth="0.7"
            strokeDasharray="4 4"
          />
        ))}
      </g>

      {/* ---- Threshold dashed lines ---- */}
      <g clipPath="url(#plot-area)">
        <line
          x1={threshX}
          y1={CHART_PAD.top}
          x2={threshX}
          y2={CHART_PAD.top + PLOT_H}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="6 4"
          opacity="0.25"
        />
        <line
          x1={CHART_PAD.left}
          y1={threshY}
          x2={CHART_PAD.left + PLOT_W}
          y2={threshY}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="6 4"
          opacity="0.25"
        />
      </g>

      {/* ---- Quadrant labels ---- */}
      <text
        x={CHART_PAD.left + 10}
        y={CHART_PAD.top + 18}
        fontSize="13"
        fontWeight="600"
        fill={QUADRANT_LABEL_COLORS.Strategic}
        opacity="0.7"
      >
        Strategic
      </text>
      <text
        x={CHART_PAD.left + PLOT_W - 10}
        y={CHART_PAD.top + 18}
        fontSize="13"
        fontWeight="600"
        fill={QUADRANT_LABEL_COLORS.Champions}
        opacity="0.7"
        textAnchor="end"
      >
        Champions
      </text>
      <text
        x={CHART_PAD.left + 10}
        y={CHART_PAD.top + PLOT_H - 8}
        fontSize="13"
        fontWeight="600"
        fill={QUADRANT_LABEL_COLORS.Foundation}
        opacity="0.7"
      >
        Foundation
      </text>
      <text
        x={CHART_PAD.left + PLOT_W - 10}
        y={CHART_PAD.top + PLOT_H - 8}
        fontSize="13"
        fontWeight="600"
        fill={QUADRANT_LABEL_COLORS["Quick Wins"]}
        opacity="0.7"
        textAnchor="end"
      >
        Quick Wins
      </text>

      {/* ---- Axes ---- */}
      <line
        x1={CHART_PAD.left}
        y1={CHART_PAD.top + PLOT_H}
        x2={CHART_PAD.left + PLOT_W}
        y2={CHART_PAD.top + PLOT_H}
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
      />
      <line
        x1={CHART_PAD.left}
        y1={CHART_PAD.top}
        x2={CHART_PAD.left}
        y2={CHART_PAD.top + PLOT_H}
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.3"
      />

      {/* ---- X-axis ticks + labels ---- */}
      {xTicks.map((v) => (
        <g key={`xt-${v}`}>
          <line
            x1={toX(v)}
            y1={CHART_PAD.top + PLOT_H}
            x2={toX(v)}
            y2={CHART_PAD.top + PLOT_H + 5}
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <text
            x={toX(v)}
            y={CHART_PAD.top + PLOT_H + 18}
            textAnchor="middle"
            fontSize="11"
            fill="currentColor"
            opacity="0.55"
          >
            {v % 1 === 0 ? v : v.toFixed(1)}
          </text>
        </g>
      ))}
      {/* X-axis title */}
      <text
        x={CHART_PAD.left + PLOT_W / 2}
        y={SVG_H - 6}
        textAnchor="middle"
        fontSize="13"
        fontWeight="500"
        fill="currentColor"
        opacity="0.6"
      >
        Readiness Score
      </text>

      {/* ---- Y-axis ticks + labels ---- */}
      {yTicks.map((v) => (
        <g key={`yt-${v}`}>
          <line
            x1={CHART_PAD.left - 5}
            y1={toY(v)}
            x2={CHART_PAD.left}
            y2={toY(v)}
            stroke="currentColor"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <text
            x={CHART_PAD.left - 10}
            y={toY(v) + 4}
            textAnchor="end"
            fontSize="11"
            fill="currentColor"
            opacity="0.55"
          >
            {v % 1 === 0 ? v : v.toFixed(1)}
          </text>
        </g>
      ))}
      {/* Y-axis title (rotated) */}
      <text
        x={16}
        y={CHART_PAD.top + PLOT_H / 2}
        textAnchor="middle"
        fontSize="13"
        fontWeight="500"
        fill="currentColor"
        opacity="0.6"
        transform={`rotate(-90, 16, ${CHART_PAD.top + PLOT_H / 2})`}
      >
        Normalized Annual Value
      </text>

      {/* ---- Bubbles ---- */}
      <g clipPath="url(#plot-area)">
        {points.map((pt) => {
          const isSelected = pt.id === selectedId;
          const isHovered = pt.id === hoveredId;
          const bubbleColor = QUADRANT_META[pt.quadrant].color;
          const scale = isHovered || isSelected ? 1.15 : 1;

          return (
            <g
              key={pt.id}
              onClick={() => onSelect(isSelected ? null : pt.id)}
              onMouseEnter={() => setHoveredId(pt.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Selection / hover ring */}
              {(isSelected || isHovered) && (
                <circle
                  cx={pt.cx}
                  cy={pt.cy}
                  r={pt.r * scale + 4}
                  fill="none"
                  stroke={bubbleColor}
                  strokeWidth="2"
                  opacity="0.4"
                />
              )}
              {/* Shadow */}
              <circle
                cx={pt.cx + 1}
                cy={pt.cy + 1}
                r={pt.r * scale}
                fill="black"
                opacity="0.08"
              />
              {/* Main bubble */}
              <circle
                cx={pt.cx}
                cy={pt.cy}
                r={pt.r * scale}
                fill={bubbleColor}
                opacity={isSelected ? 1 : 0.85}
                stroke="white"
                strokeWidth="1.5"
              />
              {/* Label next to bubble */}
              <text
                x={pt.cx + pt.r * scale + 6}
                y={pt.cy + 4}
                fontSize="10.5"
                fill="currentColor"
                opacity="0.7"
                fontWeight="500"
              >
                {truncate(pt.name, 22)}
              </text>
            </g>
          );
        })}
      </g>

      {/* ---- Tooltip on hover ---- */}
      {hoveredId && (() => {
        const pt = points.find((p) => p.id === hoveredId);
        if (!pt) return null;
        const tx = clamp(pt.cx + pt.r + 12, CHART_PAD.left + 10, SVG_W - 180);
        const ty = clamp(pt.cy - 30, CHART_PAD.top + 5, CHART_PAD.top + PLOT_H - 70);
        return (
          <g pointerEvents="none">
            <rect
              x={tx}
              y={ty}
              width="170"
              height="60"
              rx="6"
              fill="var(--color-card, #1e293b)"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.95"
            />
            <text x={tx + 8} y={ty + 16} fontSize="11" fontWeight="600" fill="currentColor">
              {truncate(pt.name, 24)}
            </text>
            <text x={tx + 8} y={ty + 31} fontSize="10" fill="currentColor" opacity="0.7">
              Value: {pt.valueScore.toFixed(1)} | Readiness: {pt.readinessScore.toFixed(1)}
            </text>
            <text x={tx + 8} y={ty + 45} fontSize="10" fill="currentColor" opacity="0.7">
              TTV: {pt.ttvScore.toFixed(2)} | Priority: {pt.priorityScore.toFixed(1)}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function Matrix() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // --- Data fetching ---
  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);

  const priorities = (activeScenario?.priorities as PriorityScore[]) || [];
  const useCases = (activeScenario?.useCases as UseCase[]) || [];

  // --- Helpers ---
  const getUseCaseName = useCallback(
    (useCaseId: string) => {
      const uc = useCases.find((u) => u.id === useCaseId);
      return uc?.name || useCaseId;
    },
    [useCases],
  );

  // --- Mutation ---
  const calculateMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/calculate/priorities`, {
        scenarioId: activeScenario?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
      toast.success("Priority scores recalculated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate: ${error.message}`);
    },
  });

  // --- Derived data ---
  const selectedPriority = priorities.find((p) => p.id === selectedId);

  const quadrantCounts = useMemo(() => {
    const counts: Record<QuadrantKey, number> = {
      Champions: 0,
      Strategic: 0,
      "Quick Wins": 0,
      Foundation: 0,
    };
    priorities.forEach((p) => {
      counts[getQuadrant(p.valueScore, p.readinessScore)]++;
    });
    return counts;
  }, [priorities]);

  // Compute axis bounds from data with some padding
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (priorities.length === 0) return { xMin: 0, xMax: 10, yMin: 0, yMax: 10 };
    const xs = priorities.map((p) => p.readinessScore);
    const ys = priorities.map((p) => p.valueScore);
    const pad = 0.8;
    return {
      xMin: Math.max(0, Math.floor(Math.min(...xs) - pad)),
      xMax: Math.min(10, Math.ceil(Math.max(...xs) + pad)),
      yMin: Math.max(0, Math.floor(Math.min(...ys) - pad)),
      yMax: Math.min(11, Math.ceil(Math.max(...ys) + pad)),
    };
  }, [priorities]);

  // Build bubble points
  const bubblePoints: BubblePoint[] = useMemo(() => {
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    const toX = (v: number) =>
      CHART_PAD.left + ((v - xMin) / xRange) * PLOT_W;
    const toY = (v: number) =>
      CHART_PAD.top + PLOT_H - ((v - yMin) / yRange) * PLOT_H;

    // TTV scores range 0-1 typically — map to bubble radius
    const ttvScores = priorities.map((p) => p.ttvScore);
    const maxTtv = Math.max(...ttvScores, 0.01);

    return priorities.map((p) => {
      const quadrant = getQuadrant(p.valueScore, p.readinessScore);
      const normalizedTtv = p.ttvScore / maxTtv;
      const r = 12 + normalizedTtv * 14; // range 12-26px radius

      return {
        id: p.id,
        useCaseId: p.useCaseId,
        name: p.useCaseName || getUseCaseName(p.useCaseId),
        valueScore: p.valueScore,
        readinessScore: p.readinessScore,
        ttvScore: p.ttvScore,
        priorityScore: p.priorityScore,
        priorityTier: p.priorityTier,
        recommendedPhase: p.recommendedPhase,
        quadrant,
        cx: toX(p.readinessScore),
        cy: toY(p.valueScore),
        r,
      };
    });
  }, [priorities, xMin, xMax, yMin, yMax, getUseCaseName]);

  // Sorted for scorecard
  const sortedPriorities = useMemo(
    () => [...priorities].sort((a, b) => b.priorityScore - a.priorityScore),
    [priorities],
  );

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Layout
      projectId={id}
      companyName={(project as any)?.companyName}
      completedSteps={activeScenario?.completedSteps}
      showStepper
    >
      {/* ================================================================= */}
      {/* PAGE HEADER                                                       */}
      {/* ================================================================= */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Value-Readiness Matrix
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Initiatives mapped by Normalized Annual Value vs. Readiness Score.
              <br />
              Bubble size indicates Time-to-Value (larger = faster
              time-to-value).
            </p>
          </div>
          <Button
            onClick={() => calculateMutation.mutate()}
            disabled={calculateMutation.isPending}
            size="sm"
            style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
            className="text-white hover:opacity-90 shrink-0"
          >
            <Calculator className="w-4 h-4 mr-1.5" />
            {calculateMutation.isPending
              ? "Calculating..."
              : "Recalculate Priorities"}
          </Button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TABS: Chart / Scorecard                                           */}
      {/* ================================================================= */}
      {priorities.length === 0 ? (
        <Card className="rounded-xl">
          <CardContent className="py-16 text-center">
            <Grid3X3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No priority data yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Complete the readiness assessment first, then run the priority
              calculation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="chart" className="space-y-6">
          <div className="flex justify-end">
            <TabsList>
              <TabsTrigger value="chart" className="gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" />
                Chart
              </TabsTrigger>
              <TabsTrigger value="scorecard" className="gap-1.5">
                <Table2 className="w-3.5 h-3.5" />
                Scorecard
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ============================================================= */}
          {/* CHART VIEW                                                     */}
          {/* ============================================================= */}
          <TabsContent value="chart" className="space-y-6">
            {/* Bubble chart card */}
            <Card className="rounded-xl border border-border">
              <CardContent className="p-6 md:p-8">
                <BubbleChart
                  points={bubblePoints}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  xMin={xMin}
                  xMax={xMax}
                  yMin={yMin}
                  yMax={yMax}
                />

                {/* Legend */}
                <div className="flex flex-wrap items-center justify-center gap-5 mt-4 text-xs text-muted-foreground">
                  {(
                    [
                      "Champions",
                      "Quick Wins",
                      "Strategic",
                      "Foundation",
                    ] as QuadrantKey[]
                  ).map((q) => (
                    <span key={q} className="flex items-center gap-1.5">
                      <span
                        className="inline-block w-3 h-3 rounded-full"
                        style={{ backgroundColor: QUADRANT_META[q].color }}
                      />
                      {q}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5 ml-2 border-l border-border pl-4">
                    <span className="inline-block w-2.5 h-2.5 rounded-full border-2 border-muted-foreground" />
                    Faster TTV = Larger
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quadrant Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {(
                [
                  "Champions",
                  "Strategic",
                  "Quick Wins",
                  "Foundation",
                ] as QuadrantKey[]
              ).map((q) => {
                const accent = QUADRANT_CARD_ACCENTS[q];
                return (
                  <Card
                    key={q}
                    className="rounded-xl overflow-hidden border border-border"
                  >
                    <div className="h-1" style={{ backgroundColor: accent }} />
                    <CardContent className="pt-5 pb-5">
                      <p className="text-sm font-semibold text-foreground">
                        {q === "Strategic" ? "Strategic Bets" : q}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {QUADRANT_META[q].subtitle}
                      </p>
                      <p
                        className="text-3xl font-bold mt-3"
                        style={{ color: accent }}
                      >
                        {quadrantCounts[q]}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Selected use case detail panel */}
            {selectedPriority && (
              <Card className="rounded-xl border-2 overflow-hidden"
                style={{
                  borderColor: getTierColor(selectedPriority.priorityTier) + "40",
                }}
              >
                <div
                  className="h-1"
                  style={{
                    backgroundColor: getTierColor(
                      selectedPriority.priorityTier,
                    ),
                  }}
                />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedPriority.useCaseName ||
                        getUseCaseName(selectedPriority.useCaseId)}
                    </h3>
                    <Badge
                      style={{
                        backgroundColor:
                          getTierColor(selectedPriority.priorityTier) + "18",
                        color: getTierColor(selectedPriority.priorityTier),
                        border: `1px solid ${getTierColor(selectedPriority.priorityTier)}40`,
                      }}
                    >
                      {selectedPriority.priorityTier}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {/* Value Score */}
                    <ScoreBar
                      label="Value Score"
                      value={selectedPriority.valueScore}
                      max={10}
                      color="#f59e0b"
                    />
                    {/* Readiness Score */}
                    <ScoreBar
                      label="Readiness Score"
                      value={selectedPriority.readinessScore}
                      max={10}
                      color="#02a2fd"
                    />
                    {/* TTV Score */}
                    <ScoreBar
                      label="TTV Score"
                      value={selectedPriority.ttvScore}
                      max={1}
                      color="#36bf78"
                      format={(v) => v.toFixed(2)}
                    />
                    {/* Priority Score */}
                    <ScoreBar
                      label="Priority Score"
                      value={selectedPriority.priorityScore}
                      max={10}
                      color={getTierColor(selectedPriority.priorityTier)}
                    />
                    {/* Phase */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Recommended Phase
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {selectedPriority.recommendedPhase}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Quadrant:{" "}
                        <span
                          className="font-medium"
                          style={{
                            color:
                              QUADRANT_LABEL_COLORS[
                                getQuadrant(
                                  selectedPriority.valueScore,
                                  selectedPriority.readinessScore,
                                )
                              ],
                          }}
                        >
                          {getQuadrant(
                            selectedPriority.valueScore,
                            selectedPriority.readinessScore,
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ============================================================= */}
          {/* SCORECARD VIEW                                                 */}
          {/* ============================================================= */}
          <TabsContent value="scorecard">
            <Card className="rounded-xl border border-border overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground w-12">
                          Rank
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          Use Case
                        </th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">
                          Value
                        </th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">
                          Readiness
                        </th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground w-24">
                          Priority
                        </th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground w-36">
                          Tier
                        </th>
                        <th className="text-center px-4 py-3 font-medium text-muted-foreground w-20">
                          Phase
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPriorities.map((p, idx) => {
                        const tierColor = getTierColor(p.priorityTier);
                        return (
                          <tr
                            key={p.id}
                            className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() =>
                              setSelectedId(
                                p.id === selectedId ? null : p.id,
                              )
                            }
                          >
                            <td className="px-4 py-3 font-mono text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">
                              {p.useCaseName || getUseCaseName(p.useCaseId)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {p.valueScore.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              {p.readinessScore.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold">
                              {p.priorityScore.toFixed(1)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{
                                  color: tierColor,
                                  borderColor: tierColor + "50",
                                  backgroundColor: tierColor + "10",
                                }}
                              >
                                {p.priorityTier}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-muted-foreground">
                              {p.recommendedPhase}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Detail panel in scorecard view too */}
            {selectedPriority && (
              <Card
                className="rounded-xl border-2 overflow-hidden mt-6"
                style={{
                  borderColor:
                    getTierColor(selectedPriority.priorityTier) + "40",
                }}
              >
                <div
                  className="h-1"
                  style={{
                    backgroundColor: getTierColor(
                      selectedPriority.priorityTier,
                    ),
                  }}
                />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-lg font-semibold text-foreground">
                      {selectedPriority.useCaseName ||
                        getUseCaseName(selectedPriority.useCaseId)}
                    </h3>
                    <Badge
                      style={{
                        backgroundColor:
                          getTierColor(selectedPriority.priorityTier) + "18",
                        color: getTierColor(selectedPriority.priorityTier),
                        border: `1px solid ${getTierColor(selectedPriority.priorityTier)}40`,
                      }}
                    >
                      {selectedPriority.priorityTier}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <ScoreBar
                      label="Value Score"
                      value={selectedPriority.valueScore}
                      max={10}
                      color="#f59e0b"
                    />
                    <ScoreBar
                      label="Readiness Score"
                      value={selectedPriority.readinessScore}
                      max={10}
                      color="#02a2fd"
                    />
                    <ScoreBar
                      label="TTV Score"
                      value={selectedPriority.ttvScore}
                      max={1}
                      color="#36bf78"
                      format={(v) => v.toFixed(2)}
                    />
                    <ScoreBar
                      label="Priority Score"
                      value={selectedPriority.priorityScore}
                      max={10}
                      color={getTierColor(selectedPriority.priorityTier)}
                    />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Recommended Phase
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {selectedPriority.recommendedPhase}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Quadrant:{" "}
                        <span
                          className="font-medium"
                          style={{
                            color:
                              QUADRANT_LABEL_COLORS[
                                getQuadrant(
                                  selectedPriority.valueScore,
                                  selectedPriority.readinessScore,
                                )
                              ],
                          }}
                        >
                          {getQuadrant(
                            selectedPriority.valueScore,
                            selectedPriority.readinessScore,
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ================================================================= */}
      {/* NAVIGATION                                                        */}
      {/* ================================================================= */}
      <div className="flex justify-between mt-10">
        <Button
          variant="outline"
          onClick={() => navigate(`/project/${id}/readiness`)}
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button
          onClick={() => navigate(`/project/${id}/dashboard`)}
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          className="text-white hover:opacity-90"
        >
          Next: Dashboard
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// ScoreBar — small reusable progress bar metric
// ---------------------------------------------------------------------------

function ScoreBar({
  label,
  value,
  max,
  color,
  format,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  format?: (v: number) => string;
}) {
  const display = format ? format(value) : value.toFixed(1);
  const pct = Math.min(100, (value / max) * 100);

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-bold text-foreground">{display}</p>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
