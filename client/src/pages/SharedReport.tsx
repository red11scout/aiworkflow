import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Brain,
  DollarSign,
  Gauge,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Loader2,
  AlertCircle,
  Compass,
  Building2,
  BarChart3,
  ShieldCheck,
  GitCompareArrows,
  Clock,
  Zap,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Minus,
  ChevronDown,
  ChevronRight,
  Target,
  Layers,
  CheckCircle2,
  Shield,
  BookOpen,
  ExternalLink,
  Users,
  Bot,
  UserCheck,
  Table2,
  Search,
  FileText,
  MessageSquare,
  Code2,
  Info,
} from "lucide-react";
import { getPatternById } from "@shared/patterns";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const T = {
  navy: "#001278",
  blue: "#0339AF",
  lightBlue: "#02a2fd",
  darkNavy: "#0F172A",
  slate50: "#F8FAFC",
  green: "#36bf78",
  amber: "#f59e0b",
  red: "#ef4444",
  purple: "#8b5cf6",
  white: "#FFFFFF",
};

const EPOCH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  operational: { bg: "#fefce8", text: "#92400e", border: "#fde68a" },
  "human-centric": { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  ethical: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  creative: { bg: "#faf5ff", text: "#6b21a8", border: "#e9d5ff" },
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5" },
  high: { bg: "#fffbeb", text: "#92400e", border: "#fcd34d" },
  medium: { bg: "#eff6ff", text: "#1e40af", border: "#93c5fd" },
  low: { bg: "#f0fdf4", text: "#166534", border: "#86efac" },
};

// ─── Guide Content Constants ─────────────────────────────────────────────────
const PITFALLS = [
  { stat: "74%", label: "No Clear ROI", desc: "Three-quarters of AI pilots show no tangible value. No financial model, no funding. Projects get cut.", icon: DollarSign },
  { stat: "70%", label: "No Executive Sponsorship", desc: "Seven in ten AI challenges are people and process problems. Without C-suite backing, AI stays an IT experiment.", icon: Users },
  { stat: "95%", label: "Too Many Use Cases", desc: "Organizations spread resources across dozens of pilots. Each gets too little. None gets enough. Five percent reach production.", icon: Layers },
  { stat: "26%", label: "Pilot Purgatory", desc: "Only one in four pilots scales to production. Generic tools fail to connect with enterprise workflows and data.", icon: AlertCircle },
  { stat: "67%", label: "Going Solo", desc: "Two-thirds of internal AI builds fail. Strategic partners achieve twice the success rate. This is not a solo sport.", icon: Shield },
];

const FRAMEWORK_STEPS = [
  { num: 1, name: "Anchor to Strategy", desc: "Define business drivers. Align leadership on 3–5 priorities. Translate goals into targets before anyone writes code.", solves: "Pitfalls 1–2" },
  { num: 2, name: "Inventory Functions", desc: "Map the value chain. Find where high-value talent is trapped doing low-value work.", solves: "Pitfall 3" },
  { num: 3, name: "Map Pain Points", desc: "Catalog the friction: delays, errors, rework, compliance gaps. Employees spend 4.5 hours daily searching for information.", solves: "Pitfall 3" },
  { num: 4, name: "Match to AI Primitives", desc: "Six building blocks cover 99% of enterprise AI. Match the problem to the right primitive. Problem first, technology second.", solves: "Pitfall 4" },
  { num: 5, name: "Define KPIs", desc: "Set SMART goals benchmarked against the top 25% of performers. No guessing. No aspiration without measurement.", solves: "Pitfall 1" },
  { num: 6, name: "Quantify Impact", desc: "Translate improvements into dollars across four dimensions: revenue, cost, cash flow, and risk. Conservative factors applied.", solves: "Pitfall 1" },
  { num: 7, name: "Score & Rank", desc: "Multi-dimensional scoring. Then the hard part: pick only three. Three focused pilots beat ten scattered experiments every time.", solves: "Pitfalls 3–4" },
];

const AI_PRIMITIVES_GUIDE = [
  { name: "Research & Information Retrieval", desc: "Search and surface relevant information from knowledge bases, documents, or external sources.", icon: Search },
  { name: "Content Creation", desc: "Create new content, documents, reports, or communications from patterns or prompts.", icon: FileText },
  { name: "Data Analysis", desc: "Analyze, classify, extract patterns, or predict outcomes from structured and unstructured data.", icon: BarChart3 },
  { name: "Conversational Interfaces", desc: "Natural language interaction for queries, guidance, and task completion.", icon: MessageSquare },
  { name: "Workflow Automation", desc: "Automate multi-step business processes, routing, approvals, and system integrations.", icon: GitCompareArrows },
  { name: "Coding Assistance", desc: "Generate, review, debug, or optimize code and technical implementations.", icon: Code2 },
];

const DESIGN_PATTERNS = [
  { name: "Reflection", desc: "The agent critiques its own output. Writes, reviews, rewrites. Each pass gets sharper." },
  { name: "Tool Use", desc: "The agent reaches beyond language. It calls APIs, searches databases, runs code. Extends its capabilities at runtime." },
  { name: "Planning", desc: "Complex problems break into steps. The agent sequences sub-tasks and executes them in order." },
  { name: "Multi-Agent", desc: "A team of specialists. One orchestrates. Others execute. The whole is greater than the parts." },
];

const ADDITIONAL_PATTERNS = [
  { name: "Orchestrator-Workers", desc: "Central manager delegates to specialist agents, integrates results." },
  { name: "Agent Handoff", desc: "Agents pass control dynamically. No fixed manager. Each assesses whether to solve or delegate." },
  { name: "Parallelization", desc: "Multiple agents work simultaneously. Speed through concurrency." },
  { name: "Generator-Critic", desc: "One agent drafts. Another reviews. Feedback loops until quality passes the bar." },
];

const EPOCH_GUIDE = [
  { letter: "E", name: "Ethical", desc: "Decisions with moral weight. Hiring, legal judgments, bias-sensitive choices. AI provides data. Humans decide.", color: EPOCH_COLORS.ethical || { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" } },
  { letter: "P", name: "Political", desc: "High-stakes negotiations. M&A, crisis communications, board-level strategy. Requires human nuance and accountability.", color: { bg: "#faf5ff", text: "#6b21a8", border: "#e9d5ff" } },
  { letter: "O", name: "Operational", desc: "Edge cases. When AI confidence drops below threshold or safety is at stake. The circuit breaker.", color: EPOCH_COLORS.operational || { bg: "#fefce8", text: "#92400e", border: "#fde68a" } },
  { letter: "C", name: "Creative", desc: "Original strategy. Brand voice. Novel innovation. AI generates options. Humans provide vision.", color: EPOCH_COLORS.creative || { bg: "#faf5ff", text: "#6b21a8", border: "#e9d5ff" } },
  { letter: "H", name: "Human", desc: "Tasks demanding empathy. Coaching, delivering difficult news, high-touch advisory. Trust lives here.", color: EPOCH_COLORS["human-centric"] || { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" } },
];

const NAVIGATION_TIPS = [
  { icon: BarChart3, section: "Value-Readiness Matrix", tip: "The bubble chart is interactive. Click any bubble to see the full scorecard — value score, readiness score, and recommended priority tier." },
  { icon: Layers, section: "Strategic Themes", tip: "Each theme expands to reveal KPIs, friction points, and use cases grouped together. The first two themes are expanded by default." },
  { icon: Zap, section: "AI Primitives", tip: "Green pills on each use case show which AI capabilities it requires. Six primitives cover the full range of enterprise AI." },
  { icon: GitCompareArrows, section: "Workflow Transformation", tip: "Inside each use case, look for the \"Workflow Transformation\" button. It reveals the full before-and-after process comparison with time and cost metrics." },
  { icon: Shield, section: "HITL Checkpoints", tip: "Every use case card ends with a shield icon and a human checkpoint description. This is where the AI hands control to a person." },
  { icon: Target, section: "EPOCH Tags", tip: "Colored tags on each use case mark which EPOCH categories apply. These flag where human oversight is non-negotiable." },
];

const GUIDE_TABS = [
  { key: "problem" as const, label: "The Problem", icon: AlertTriangle },
  { key: "framework" as const, label: "The Framework", icon: Target },
  { key: "concepts" as const, label: "AI Concepts", icon: Brain },
  { key: "navigation" as const, label: "Report Guide", icon: Compass },
];

// ─── Utility Functions ───────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseCurrencyString(val: string | number): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.MKmk-]/g, "");
  if (/m/i.test(String(val))) return parseFloat(str) * 1_000_000 || 0;
  if (/k/i.test(String(val))) return parseFloat(str) * 1_000 || 0;
  return parseFloat(String(val).replace(/[^0-9.-]/g, "")) || 0;
}

function getPatternDisplayName(patternId: string | undefined): string {
  if (!patternId) return "Unknown";
  const p = getPatternById(patternId);
  if (p) {
    // Extract short name (e.g. "Tool Use" from "Tool Use (LLM + Tools)")
    const short = p.name.split("(")[0].trim();
    return short || p.name;
  }
  // Fallback: humanize the ID
  return patternId
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const QUADRANT_COLORS: Record<string, string> = {
  Champions: "#1e293b",
  Strategic: "#6366f1",
  "Quick Wins": "#3b82f6",
  Foundation: "#94a3b8",
};

const QUADRANT_META: Record<string, { fill: string; subtitle: string; accent: string; labelColor: string }> = {
  Champions: { fill: "rgba(54, 191, 120, 0.08)", subtitle: "High Value + High Readiness", accent: "#36bf78", labelColor: "#36bf78" },
  Strategic: { fill: "rgba(2, 162, 253, 0.06)", subtitle: "High Value + Low Readiness", accent: "#6366f1", labelColor: "#6366f1" },
  "Quick Wins": { fill: "rgba(54, 191, 120, 0.04)", subtitle: "Low Value + High Readiness", accent: "#3b82f6", labelColor: "#3b82f6" },
  Foundation: { fill: "rgba(148, 163, 184, 0.05)", subtitle: "Low Value + Low Readiness", accent: "#94a3b8", labelColor: "#94a3b8" },
};

function getQuadrant(valueScore: number, readinessScore: number): string {
  const highValue = valueScore >= 5.5;
  const highReadiness = readinessScore >= 5.5;
  if (highValue && highReadiness) return "Champions";
  if (highValue && !highReadiness) return "Strategic";
  if (!highValue && highReadiness) return "Quick Wins";
  return "Foundation";
}

function getTierColor(tier: string): string {
  const t = tier?.toLowerCase() || "";
  if (t.includes("champion") || t === "tier 1") return T.green;
  if (t.includes("strategic") || t === "tier 2") return T.amber;
  if (t.includes("quick") || t === "tier 3") return T.lightBlue;
  return "#94a3b8";
}

function scoreColor(score: number): string {
  return score >= 7 ? T.green : score >= 4 ? T.amber : T.red;
}

// ─── Scroll Animation Hook ──────────────────────────────────────────────────
function useScrollAnimation() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0, rootMargin: "0px 0px 80px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, isVisible };
}

// ─── Section Wrapper ─────────────────────────────────────────────────────────
function Section({
  bg = "white",
  children,
  className = "",
  noPad = false,
}: {
  bg?: "white" | "slate" | "dark" | "blue";
  children: React.ReactNode;
  className?: string;
  noPad?: boolean;
}) {
  const { ref, isVisible } = useScrollAnimation();
  const bgStyle =
    bg === "dark"
      ? { backgroundColor: T.darkNavy, color: T.white }
      : bg === "blue"
        ? { backgroundColor: T.blue, color: T.white }
        : bg === "slate"
          ? { backgroundColor: T.slate50 }
          : { backgroundColor: T.white };

  return (
    <section
      className={`${noPad ? "" : "py-16 md:py-24"} ${className}`}
      style={bgStyle}
    >
      {/* Sentinel for scroll-triggered animation */}
      <div ref={ref} style={{ height: 1 }} />
      <div
        className="max-w-6xl mx-auto px-4 md:px-8"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(32px)",
          transition: "opacity 0.7s ease-out, transform 0.7s ease-out",
        }}
      >
        {children}
      </div>
    </section>
  );
}

// ─── Inline Tip Component ────────────────────────────────────────────────────
function InlineTip({ text }: { text: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg mt-2 mb-1"
      style={{ backgroundColor: `${T.lightBlue}08`, border: `1px solid ${T.lightBlue}20` }}
    >
      <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: T.lightBlue }} />
      <span className="text-[11px]" style={{ color: "#64748b" }}>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function SharedReport() {
  const { code } = useParams<{ code: string }>();
  const { data, isLoading, isError } = useQuery({ queryKey: [`/api/shared/${code}`] });
  const report = data as any;

  // ── State ──
  const [expandedThemes, setExpandedThemes] = useState<Set<number>>(new Set([0, 1]));
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<string>>(new Set());
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [matrixTab, setMatrixTab] = useState<"chart" | "scorecard">("chart");
  const [matrixSelectedId, setMatrixSelectedId] = useState<string | null>(null);
  const [hoveredBubbleId, setHoveredBubbleId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideTab, setGuideTab] = useState<"problem" | "framework" | "concepts" | "navigation">("problem");
  const [conceptsExpanded, setConceptsExpanded] = useState<Set<string>>(new Set(["primitives"]));
  const [additionalPatternsOpen, setAdditionalPatternsOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);

  // ── Sticky header scroll detection ──
  useEffect(() => {
    const handleScroll = () => setStickyVisible(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Data extraction ──
  const useCases = (report?.useCases as any[]) || [];
  const benefits = (report?.benefits as any[]) || [];
  const priorities = (report?.priorities as any[]) || [];
  const readiness = (report?.readiness as any[]) || [];
  const frictionItems = (report?.frictionMapping as any[]) || [];
  const strategicThemes = (report?.strategicThemes as any[]) || [];
  const businessFunctions = (report?.businessFunctions as any[]) || [];
  const workflowMaps = (report?.workflowMaps as any[]) || [];
  const dashboard = report?.dashboard as any;
  const scenarioAnalysis = report?.scenarioAnalysis as any;
  const multiYear = report?.multiYear as any;
  const projection = dashboard?.projection as any;

  // ── Benefits breakdown ──
  const benefitsBreakdown = useMemo(() => {
    const cost = benefits.reduce((s: number, b: any) => s + parseCurrencyString(b.costBenefit), 0);
    const revenue = benefits.reduce((s: number, b: any) => s + parseCurrencyString(b.revenueBenefit), 0);
    const risk = benefits.reduce((s: number, b: any) => s + parseCurrencyString(b.riskBenefit), 0);
    const cashFlow = benefits.reduce((s: number, b: any) => s + parseCurrencyString(b.cashFlowBenefit), 0);
    const total = cost + revenue + risk + cashFlow;
    return { cost, revenue, risk, cashFlow, total };
  }, [benefits]);

  // ── SVG points for matrix ──
  const matrixBounds = useMemo(() => {
    if (priorities.length === 0) return { xMin: 0, xMax: 10, yMin: 0, yMax: 11 };
    const xs = priorities.map((p: any) => p.readinessScore);
    const ys = priorities.map((p: any) => p.valueScore);
    const pad = 0.8;
    return {
      xMin: Math.max(0, Math.floor(Math.min(...xs) - pad)),
      xMax: Math.min(10, Math.ceil(Math.max(...xs) + pad)),
      yMin: Math.max(0, Math.floor(Math.min(...ys) - pad)),
      yMax: Math.min(11, Math.ceil(Math.max(...ys) + pad)),
    };
  }, [priorities]);

  const svgPoints = useMemo(() => {
    const { xMin, xMax, yMin, yMax } = matrixBounds;
    const SVG_W = 800, SVG_H = 560;
    const PAD = { top: 30, right: 30, bottom: 50, left: 60 };
    const PW = SVG_W - PAD.left - PAD.right;
    const PH = SVG_H - PAD.top - PAD.bottom;
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;
    const toX = (v: number) => PAD.left + ((v - xMin) / xRange) * PW;
    const toY = (v: number) => PAD.top + PH - ((v - yMin) / yRange) * PH;
    const ttvScores = priorities.map((p: any) => p.ttvScore || 0);
    const maxTtv = Math.max(...ttvScores, 0.01);

    return priorities.map((p: any, i: number) => {
      const uc = useCases.find((u: any) => u.id === p.useCaseId);
      const normalizedTtv = (p.ttvScore || 0) / maxTtv;
      const r = 12 + normalizedTtv * 14;
      return {
        ...p,
        cx: toX(p.readinessScore),
        cy: toY(p.valueScore),
        r,
        quadrant: getQuadrant(p.valueScore, p.readinessScore),
        code: uc?.id || `UC-${String(i + 1).padStart(2, "0")}`,
        name: uc?.name || p.useCaseName || "",
      };
    });
  }, [priorities, useCases, matrixBounds]);

  // ── Sorted priorities for scorecard ──
  const sortedPriorities = useMemo(
    () => [...priorities].sort((a: any, b: any) => (b.priorityScore || 0) - (a.priorityScore || 0)),
    [priorities],
  );

  // ── Quadrant counts ──
  const quadrantCounts = useMemo(() => {
    const counts: Record<string, number> = { Champions: 0, Strategic: 0, "Quick Wins": 0, Foundation: 0 };
    priorities.forEach((p: any) => { counts[getQuadrant(p.valueScore, p.readinessScore)]++; });
    return counts;
  }, [priorities]);

  // ── Friction-UC Recovery Map ──
  const frictionUCMap = useMemo(() => {
    const rows = frictionItems.map((fp: any) => {
      const frictionCost = parseCurrencyString(fp.estimatedAnnualCost || fp.annualCost || "$0");
      const matchedUC = useCases.find((uc: any) => uc.targetFriction === fp.frictionPoint);
      const matchedBenefit = matchedUC
        ? benefits.find((b: any) => b.useCaseId === matchedUC.id)
        : null;
      const expectedValue = matchedBenefit ? parseCurrencyString(matchedBenefit.expectedValue || "$0") : 0;
      const recoveryAmount = Math.min(expectedValue, frictionCost);
      const recoveryPct = frictionCost > 0 ? (recoveryAmount / frictionCost) * 100 : 0;
      const unrecoveredCost = Math.max(0, frictionCost - recoveryAmount);
      const additionalBenefits = Math.max(0, expectedValue - frictionCost);
      const status: "full" | "partial" | "low" | "unmapped" = !matchedUC
        ? "unmapped"
        : recoveryPct >= 100
          ? "full"
          : recoveryPct >= 50
            ? "partial"
            : "low";
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
        status,
        severity: fp.severity,
        strategicTheme: fp.strategicTheme,
      };
    });
    rows.sort((a, b) => b.frictionCost - a.frictionCost);
    const totalFrictionCost = rows.reduce((s, r) => s + r.frictionCost, 0);
    const totalRecovery = rows.reduce((s, r) => s + r.recoveryAmount, 0);
    const totalUnrecovered = rows.reduce((s, r) => s + r.unrecoveredCost, 0);
    const totalAdditional = rows.reduce((s, r) => s + r.additionalBenefits, 0);
    const overallRecoveryRate = totalFrictionCost > 0 ? (totalRecovery / totalFrictionCost) * 100 : 0;
    const mappedCount = rows.filter((r) => r.status !== "unmapped").length;
    return { rows, totalFrictionCost, totalRecovery, totalUnrecovered, totalAdditional, overallRecoveryRate, mappedCount };
  }, [frictionItems, useCases, benefits]);

  // ── Theme Deep-Dive aggregation ──
  const themeData = useMemo(() => {
    return strategicThemes.map((theme: any, idx: number) => {
      const themeName = theme.name;
      const kpis = businessFunctions.filter((fn: any) => fn.strategicTheme === themeName);
      const frictions = frictionItems.filter((fp: any) => fp.strategicTheme === themeName);
      const themeUCs = useCases.filter((uc: any) => uc.strategicTheme === themeName);
      const themeUCIds = new Set(themeUCs.map((uc: any) => uc.id));
      const themeBenefits = benefits.filter((b: any) => themeUCIds.has(b.useCaseId));
      const themePriorities = priorities.filter((p: any) => themeUCIds.has(p.useCaseId));
      const themeWorkflows = workflowMaps.filter((wf: any) => themeUCIds.has(wf.useCaseId));
      const themeReadiness = readiness.filter((r: any) => themeUCIds.has(r.useCaseId));
      const totalValue = themeBenefits.reduce((s: number, b: any) => s + parseCurrencyString(b.totalAnnualValue), 0);
      const enrichedUCs = themeUCs.map((uc: any) => ({
        ...uc,
        benefit: themeBenefits.find((b: any) => b.useCaseId === uc.id),
        priority: themePriorities.find((p: any) => p.useCaseId === uc.id),
        workflow: themeWorkflows.find((wf: any) => wf.useCaseId === uc.id),
        readinessData: themeReadiness.find((r: any) => r.useCaseId === uc.id),
      }));
      return { theme, index: idx, kpis, frictions, useCases: enrichedUCs, totalValue };
    });
  }, [strategicThemes, businessFunctions, frictionItems, useCases, benefits, priorities, workflowMaps, readiness]);

  // ── Toggle handlers ──
  const toggleTheme = useCallback((idx: number) => {
    setExpandedThemes((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const toggleWorkflow = useCallback((ucId: string) => {
    setExpandedWorkflows((prev) => {
      const next = new Set(prev);
      if (next.has(ucId)) next.delete(ucId);
      else next.add(ucId);
      return next;
    });
  }, []);

  // ── Loading / Error ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.slate50 }}>
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: T.lightBlue }} />
          <p className="text-lg" style={{ color: "#64748b" }}>Loading report...</p>
        </div>
      </div>
    );
  }
  if (isError || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: T.slate50 }}>
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: T.red }} />
          <h1 className="text-2xl font-bold mb-2" style={{ color: T.darkNavy }}>Report Not Found</h1>
          <p style={{ color: "#64748b" }}>This share link may have expired or is not valid.</p>
        </div>
      </div>
    );
  }

  const totalValue = benefitsBreakdown.total || dashboard?.totalAnnualValue || 0;

  // ═════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen" style={{ backgroundColor: T.slate50, fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>

      {/* ── Sticky Header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 glass-header"
        style={{
          height: 64,
          backgroundColor: "rgba(255,255,255,0.85)",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          opacity: stickyVisible ? 1 : 0,
          pointerEvents: stickyVisible ? "auto" : "none",
          transform: stickyVisible ? "translateY(0)" : "translateY(-100%)",
          transition: "opacity 0.3s, transform 0.3s",
        }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://www.blueally.com/wp-content/uploads/2023/11/blue-header-logo.png"
              alt="BlueAlly"
              className="h-7"
            />
            <span className="text-sm font-semibold" style={{ color: T.darkNavy }}>
              {report.companyName} Assessment
            </span>
          </div>
          <button
            onClick={() => { guideRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); setGuideOpen(true); }}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-slate-100"
            style={{ color: T.blue }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Guide
          </button>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: HERO HEADER
          ══════════════════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, #000a4a 0%, ${T.navy} 35%, ${T.blue} 100%)`,
          minHeight: "50vh",
        }}
      >
        {/* BlueAlly Flywheel background — three curved blades */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-end">
          <svg
            viewBox="0 0 600 600"
            className="h-[140%] max-h-[850px]"
            style={{ opacity: 0.12, marginRight: "-2%" }}
          >
            {/* Blade 1: upper-right — wide curved wedge */}
            <path d="M 160 10 C 260 -15 490 -10 580 80 C 560 160 490 235 390 270 C 310 220 210 110 160 10 Z" fill="white" />
            {/* Blade 2: left — broad leaf shape */}
            <path d="M 100 140 C 45 240 0 360 40 470 C 75 530 160 555 240 515 C 215 410 155 260 100 140 Z" fill="white" />
            {/* Blade 3: bottom-right — wide curved wedge */}
            <path d="M 340 375 C 420 345 545 340 585 410 C 600 490 575 575 510 600 C 430 580 360 500 340 375 Z" fill="white" />
          </svg>
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-20 md:py-28 relative">
          <div className="flex items-center gap-3 mb-6">
            <img
              src="https://www.blueally.com/wp-content/uploads/2023/11/header-logo.png"
              alt="BlueAlly"
              className="h-8 brightness-0 invert opacity-80"
            />
            <span className="text-white/80 text-sm font-medium tracking-wide uppercase">AI Strategic Assessment</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-8 leading-tight">
            Unlocking <span style={{ color: "#7dd3fc" }}>Value</span> for<br />
            {report.companyName || "Your Organization"}
          </h1>

          <div className="flex flex-col md:flex-row items-start gap-8 md:gap-12">
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-2">Total Value Opportunity</p>
              <p className="text-5xl md:text-6xl font-bold text-white">{formatCurrency(totalValue)}</p>
            </div>
            <div className="hidden md:block w-px h-20 bg-white/20" />
            <div className="max-w-md">
              <p className="text-white/70 text-base leading-relaxed">
                Across {useCases.length} AI use cases spanning {strategicThemes.length} strategic themes,
                with {frictionUCMap.mappedCount}/{frictionItems.length} friction points mapped to recovery pathways.
              </p>
            </div>
          </div>

          <p className="text-white/40 text-xs mt-8">
            Generated {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : ""}
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1.5: UNDERSTANDING THIS ASSESSMENT (GUIDE)
          ══════════════════════════════════════════════════════════════════════ */}
      <Section bg="white">
        <div ref={guideRef}>
          {/* Entry Card — always visible */}
          <button
            onClick={() => setGuideOpen(!guideOpen)}
            className="w-full flex items-center justify-between rounded-2xl p-5 transition-colors hover:shadow-md"
            style={{ backgroundColor: T.white, border: `1px solid ${T.lightBlue}20`, borderLeft: `4px solid ${T.lightBlue}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${T.lightBlue}10` }}>
                <BookOpen className="w-5 h-5" style={{ color: T.lightBlue }} />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold" style={{ color: T.darkNavy }}>Understanding This Assessment</h3>
                <p className="text-xs" style={{ color: "#94a3b8" }}>Why 95% of AI initiatives fail — and how this framework prevents it.</p>
              </div>
            </div>
            <ChevronDown
              className="w-5 h-5 transition-transform"
              style={{ color: "#94a3b8", transform: guideOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {/* Expanded Guide Content */}
          {guideOpen && (
            <div className="mt-6 space-y-6">
              {/* Tab Bar */}
              <div className="flex flex-wrap gap-0 rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                {GUIDE_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setGuideTab(tab.key)}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors flex-1 min-w-[120px] justify-center"
                    style={{
                      backgroundColor: guideTab === tab.key ? T.slate50 : "transparent",
                      color: guideTab === tab.key ? T.darkNavy : "#94a3b8",
                      fontWeight: guideTab === tab.key ? 600 : 500,
                      borderRight: "1px solid #e2e8f0",
                    }}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Tab 1: The Problem ── */}
              {guideTab === "problem" && (
                <div>
                  <h3 className="text-xl font-bold mb-1" style={{ color: T.darkNavy }}>Five Pitfalls That Kill AI Initiatives</h3>
                  <p className="text-xs mb-6" style={{ color: "#94a3b8" }}>Source: MIT Sloan School of Management, State of AI in Business 2025</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {PITFALLS.map((p) => (
                      <div
                        key={p.label}
                        className="rounded-xl p-4"
                        style={{ border: `1px solid ${T.red}15`, borderLeft: `3px solid ${T.red}`, backgroundColor: `${T.red}04` }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${T.red}10` }}>
                            <p.icon className="w-4 h-4" style={{ color: T.red }} />
                          </div>
                          <div>
                            <p className="text-2xl font-bold" style={{ color: T.red }}>{p.stat}</p>
                            <p className="text-sm font-bold mt-0.5" style={{ color: T.darkNavy }}>{p.label}</p>
                            <p className="text-xs mt-1 leading-relaxed" style={{ color: "#475569" }}>{p.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab 2: The Framework ── */}
              {guideTab === "framework" && (
                <div>
                  <h3 className="text-xl font-bold mb-1" style={{ color: T.darkNavy }}>Seven Steps. Each One Solves a Pitfall.</h3>
                  <p className="text-xs mb-6" style={{ color: "#94a3b8" }}>This assessment was built on this framework. Every number traces back to a real business problem.</p>
                  <div className="space-y-3">
                    {FRAMEWORK_STEPS.map((step) => (
                      <div
                        key={step.num}
                        className="flex items-start gap-4 rounded-xl p-4"
                        style={{ border: "1px solid #e2e8f0", backgroundColor: T.white }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
                          style={{ backgroundColor: T.navy }}
                        >
                          {step.num}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold" style={{ color: T.darkNavy }}>{step.name}</p>
                          <p className="text-xs mt-1 leading-relaxed" style={{ color: "#475569" }}>{step.desc}</p>
                        </div>
                        <span
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
                          style={{ backgroundColor: `${T.navy}08`, color: T.navy, border: `1px solid ${T.navy}15` }}
                        >
                          Solves {step.solves}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab 3: AI Concepts ── */}
              {guideTab === "concepts" && (
                <div className="space-y-4">
                  {/* AI Primitives */}
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                    <button
                      onClick={() => setConceptsExpanded((prev) => { const next = new Set(prev); next.has("primitives") ? next.delete("primitives") : next.add("primitives"); return next; })}
                      className="w-full flex items-center justify-between p-4 transition-colors"
                      style={{ backgroundColor: conceptsExpanded.has("primitives") ? T.slate50 : T.white }}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" style={{ color: T.green }} />
                        <span className="text-sm font-bold" style={{ color: T.darkNavy }}>Six Building Blocks — AI Primitives</span>
                      </div>
                      <ChevronDown className="w-4 h-4" style={{ color: "#94a3b8", transform: conceptsExpanded.has("primitives") ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    </button>
                    {conceptsExpanded.has("primitives") && (
                      <div className="p-4 pt-2">
                        <p className="text-xs mb-4 leading-relaxed" style={{ color: "#475569" }}>Every AI use case in this report maps to one or more of these primitives. They are the building blocks. The assessment matches your business problems to the right blocks.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {AI_PRIMITIVES_GUIDE.map((prim) => (
                            <div key={prim.name} className="rounded-lg p-3" style={{ backgroundColor: `${T.green}06`, border: `1px solid ${T.green}20` }}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <prim.icon className="w-3.5 h-3.5" style={{ color: T.green }} />
                                <span className="text-xs font-bold" style={{ color: T.darkNavy }}>{prim.name}</span>
                              </div>
                              <p className="text-[11px] leading-relaxed" style={{ color: "#475569" }}>{prim.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Single vs Multi-Agent */}
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                    <button
                      onClick={() => setConceptsExpanded((prev) => { const next = new Set(prev); next.has("agents") ? next.delete("agents") : next.add("agents"); return next; })}
                      className="w-full flex items-center justify-between p-4 transition-colors"
                      style={{ backgroundColor: conceptsExpanded.has("agents") ? T.slate50 : T.white }}
                    >
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4" style={{ color: T.blue }} />
                        <span className="text-sm font-bold" style={{ color: T.darkNavy }}>One Agent or Many</span>
                      </div>
                      <ChevronDown className="w-4 h-4" style={{ color: "#94a3b8", transform: conceptsExpanded.has("agents") ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    </button>
                    {conceptsExpanded.has("agents") && (
                      <div className="p-4 pt-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-lg p-4" style={{ backgroundColor: `${T.blue}05`, border: `1px solid ${T.blue}15` }}>
                            <div className="flex items-center gap-2 mb-2">
                              <UserCheck className="w-4 h-4" style={{ color: T.blue }} />
                              <span className="text-sm font-bold" style={{ color: T.darkNavy }}>Single Agent</span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>One AI model. It reasons, acts, observes, and repeats until the job is done. Simpler to build. Best for focused tasks — research, analysis, coding assistance. Think: one sharp specialist.</p>
                          </div>
                          <div className="rounded-lg p-4" style={{ backgroundColor: `${T.purple}05`, border: `1px solid ${T.purple}15` }}>
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4" style={{ color: T.purple }} />
                              <span className="text-sm font-bold" style={{ color: T.darkNavy }}>Multi-Agent</span>
                            </div>
                            <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>Work split across specialized agents. An orchestrator assigns tasks. Specialists execute. Results merge. Best for complex, multi-faceted processes. Think: a coordinated team.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Agentic Design Patterns */}
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                    <button
                      onClick={() => setConceptsExpanded((prev) => { const next = new Set(prev); next.has("patterns") ? next.delete("patterns") : next.add("patterns"); return next; })}
                      className="w-full flex items-center justify-between p-4 transition-colors"
                      style={{ backgroundColor: conceptsExpanded.has("patterns") ? T.slate50 : T.white }}
                    >
                      <div className="flex items-center gap-2">
                        <Brain className="w-4 h-4" style={{ color: T.navy }} />
                        <span className="text-sm font-bold" style={{ color: T.darkNavy }}>How Agents Think and Work — Design Patterns</span>
                      </div>
                      <ChevronDown className="w-4 h-4" style={{ color: "#94a3b8", transform: conceptsExpanded.has("patterns") ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    </button>
                    {conceptsExpanded.has("patterns") && (
                      <div className="p-4 pt-2">
                        <p className="text-xs mb-4 leading-relaxed" style={{ color: "#475569" }}>Andrew Ng defined four core patterns. They describe how AI agents approach problems.</p>
                        <div className="space-y-2">
                          {DESIGN_PATTERNS.map((pat) => (
                            <div key={pat.name} className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: `${T.navy}04` }}>
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 text-white" style={{ backgroundColor: T.navy }}>{pat.name}</span>
                              <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>{pat.desc}</p>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => setAdditionalPatternsOpen(!additionalPatternsOpen)}
                          className="flex items-center gap-1.5 mt-3 text-xs font-medium"
                          style={{ color: T.blue }}
                        >
                          <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: additionalPatternsOpen ? "rotate(90deg)" : "rotate(0deg)" }} />
                          Additional Patterns
                        </button>
                        {additionalPatternsOpen && (
                          <div className="space-y-2 mt-2">
                            {ADDITIONAL_PATTERNS.map((pat) => (
                              <div key={pat.name} className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: `${T.navy}04` }}>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ border: `1px solid ${T.navy}30`, color: T.navy }}>{pat.name}</span>
                                <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>{pat.desc}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* EPOCH Framework */}
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                    <button
                      onClick={() => setConceptsExpanded((prev) => { const next = new Set(prev); next.has("epoch") ? next.delete("epoch") : next.add("epoch"); return next; })}
                      className="w-full flex items-center justify-between p-4 transition-colors"
                      style={{ backgroundColor: conceptsExpanded.has("epoch") ? T.slate50 : T.white }}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" style={{ color: T.amber }} />
                        <span className="text-sm font-bold" style={{ color: T.darkNavy }}>EPOCH — Where Humans Stay in the Loop</span>
                      </div>
                      <ChevronDown className="w-4 h-4" style={{ color: "#94a3b8", transform: conceptsExpanded.has("epoch") ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    </button>
                    {conceptsExpanded.has("epoch") && (
                      <div className="p-4 pt-2">
                        <p className="text-xs mb-4 leading-relaxed" style={{ color: "#475569" }}>Five categories of decisions that AI must never make alone. Look for EPOCH tags on each use case — they mark the non-negotiable human checkpoints.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                          {EPOCH_GUIDE.map((e) => (
                            <div key={e.letter} className="rounded-lg p-3 text-center" style={{ backgroundColor: e.color.bg, border: `1px solid ${e.color.border}` }}>
                              <p className="text-xl font-bold" style={{ color: e.color.text }}>{e.letter}</p>
                              <p className="text-xs font-bold mt-0.5" style={{ color: e.color.text }}>{e.name}</p>
                              <p className="text-[10px] mt-1 leading-relaxed" style={{ color: e.color.text, opacity: 0.8 }}>{e.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* HITL */}
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                    <button
                      onClick={() => setConceptsExpanded((prev) => { const next = new Set(prev); next.has("hitl") ? next.delete("hitl") : next.add("hitl"); return next; })}
                      className="w-full flex items-center justify-between p-4 transition-colors"
                      style={{ backgroundColor: conceptsExpanded.has("hitl") ? T.slate50 : T.white }}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" style={{ color: T.green }} />
                        <span className="text-sm font-bold" style={{ color: T.darkNavy }}>Human-in-the-Loop (HITL)</span>
                      </div>
                      <ChevronDown className="w-4 h-4" style={{ color: "#94a3b8", transform: conceptsExpanded.has("hitl") ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
                    </button>
                    {conceptsExpanded.has("hitl") && (
                      <div className="p-4 pt-2">
                        <div className="rounded-lg p-4 flex items-start gap-3" style={{ backgroundColor: `${T.amber}06`, border: `1px solid ${T.amber}20` }}>
                          <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: T.amber }} />
                          <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>Every use case in this report includes a HITL checkpoint — a specific moment where a human reviews, approves, or redirects the AI's work. These are not optional. They are where the EPOCH framework meets reality. Look for the shield icon at the bottom of each use case card.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Tab 4: Report Guide ── */}
              {guideTab === "navigation" && (
                <div>
                  <h3 className="text-xl font-bold mb-1" style={{ color: T.darkNavy }}>How to Read This Report</h3>
                  <p className="text-xs mb-6" style={{ color: "#94a3b8" }}>This assessment packs dense analysis into a clean structure. Here is what to look for.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {NAVIGATION_TIPS.map((tip) => (
                      <div
                        key={tip.section}
                        className="rounded-xl p-4"
                        style={{ border: "1px solid #e2e8f0", backgroundColor: T.white }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${T.lightBlue}10` }}>
                            <tip.icon className="w-3.5 h-3.5" style={{ color: T.lightBlue }} />
                          </div>
                          <span className="text-sm font-bold" style={{ color: T.darkNavy }}>{tip.section}</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>{tip.tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: VALUE DRIVERS
          ══════════════════════════════════════════════════════════════════════ */}
      <Section bg="white">
        <h2 className="text-2xl md:text-3xl font-bold mb-8" style={{ color: T.darkNavy }}>Value Drivers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: "REVENUE GROWTH", value: benefitsBreakdown.revenue, total: benefitsBreakdown.total, color: T.green, icon: TrendingUp },
            { label: "COST REDUCTION", value: benefitsBreakdown.cost, total: benefitsBreakdown.total, color: T.lightBlue, icon: DollarSign },
            { label: "CASH FLOW ACCELERATION", value: benefitsBreakdown.cashFlow, total: benefitsBreakdown.total, color: T.amber, icon: Zap },
            { label: "RISK MITIGATION", value: benefitsBreakdown.risk, total: benefitsBreakdown.total, color: T.purple, icon: ShieldCheck },
          ].map((driver) => {
            const pct = driver.total > 0 ? (driver.value / driver.total) * 100 : 0;
            return (
              <div
                key={driver.label}
                className="rounded-2xl p-5 border"
                style={{
                  borderColor: `${driver.color}20`,
                  borderLeftWidth: 4,
                  borderLeftColor: driver.color,
                  backgroundColor: `${driver.color}08`,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${driver.color}15` }}
                  >
                    <driver.icon className="w-4 h-4" style={{ color: driver.color }} />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#64748b" }}>
                    {driver.label}
                  </span>
                </div>
                <p className="text-2xl font-bold mb-2" style={{ color: driver.color }}>
                  {formatCurrency(driver.value)}
                </p>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${driver.color}15` }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: driver.color }} />
                </div>
                <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>{pct.toFixed(0)}% of total value</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3: FINANCIAL SENSITIVITY ANALYSIS
          ══════════════════════════════════════════════════════════════════════ */}
      {scenarioAnalysis && (
        <Section bg="slate">
          <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: T.darkNavy }}>Financial Sensitivity Analysis</h2>
          <p className="text-sm mb-8" style={{ color: "#64748b" }}>
            Three scenarios model different adoption rates and implementation timelines to bound the expected outcome range.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { key: "conservative", label: "Conservative", data: scenarioAnalysis.conservative, multiplier: "×0.6", accent: "#94a3b8" },
              { key: "moderate", label: "Base Case", data: scenarioAnalysis.moderate, multiplier: "Base", accent: T.blue, recommended: true },
              { key: "aggressive", label: "Optimistic", data: scenarioAnalysis.aggressive, multiplier: "×1.3", accent: T.green },
            ].map((scenario) => (
              <div
                key={scenario.key}
                className="rounded-2xl p-6 border relative"
                style={{
                  borderColor: scenario.recommended ? T.blue : "#e2e8f0",
                  borderWidth: scenario.recommended ? 2 : 1,
                  backgroundColor: T.white,
                  boxShadow: scenario.recommended ? `0 0 24px ${T.blue}15` : "none",
                }}
              >
                {scenario.recommended && (
                  <span
                    className="absolute -top-3 left-6 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{ backgroundColor: T.blue, color: T.white }}
                  >
                    Recommended
                  </span>
                )}
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "#94a3b8" }}>
                  {scenario.label} ({scenario.multiplier})
                </p>
                <div className="border-t pt-4 space-y-3" style={{ borderColor: "#f1f5f9" }}>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#94a3b8" }}>Annual Benefit</p>
                    <p className="text-2xl font-bold" style={{ color: scenario.recommended ? T.blue : T.darkNavy }}>
                      {scenario.data?.annualBenefit || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#94a3b8" }}>5-Year NPV</p>
                    <p className="text-lg font-bold" style={{ color: T.darkNavy }}>
                      {scenario.data?.npv || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4: VALUE-READINESS MATRIX
          ══════════════════════════════════════════════════════════════════════ */}
      {svgPoints.length > 0 && (() => {
        const { xMin, xMax, yMin, yMax } = matrixBounds;
        const SVG_W = 800, SVG_H = 560;
        const PAD = { top: 30, right: 30, bottom: 50, left: 60 };
        const PW = SVG_W - PAD.left - PAD.right;
        const PH = SVG_H - PAD.top - PAD.bottom;
        const xRange = xMax - xMin || 1;
        const yRange = yMax - yMin || 1;
        const toX = (v: number) => PAD.left + ((v - xMin) / xRange) * PW;
        const toY = (v: number) => PAD.top + PH - ((v - yMin) / yRange) * PH;
        const threshX = toX(5.5);
        const threshY = toY(5.5);

        // Ticks
        const xTicks: number[] = [];
        const xStep = xRange <= 5 ? 0.5 : 1;
        for (let v = Math.ceil(xMin); v <= Math.floor(xMax); v += xStep) xTicks.push(v);
        const yTicks: number[] = [];
        const yStep = yRange <= 5 ? 0.5 : 1;
        for (let v = Math.ceil(yMin); v <= Math.floor(yMax); v += yStep) yTicks.push(v);

        const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + "..." : s;
        const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
        const selectedP = matrixSelectedId ? priorities.find((p: any) => p.id === matrixSelectedId) : null;

        return (
          <Section bg="white">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold" style={{ color: T.darkNavy }}>Value-Readiness Matrix</h2>
                <p className="text-sm mt-1" style={{ color: "#64748b", maxWidth: 560 }}>
                  Initiatives mapped by Value Score (Expected Value / Friction Cost) vs. Readiness Score.
                  <br />
                  Bubble size indicates Time-to-Value (larger = faster time-to-value).
                </p>
                <InlineTip text="Click any bubble to see the full scorecard — value score, readiness score, and recommended priority tier." />
              </div>
              {/* Tab switcher */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                {(["chart", "scorecard"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setMatrixTab(tab)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: matrixTab === tab ? T.slate50 : "transparent",
                      color: matrixTab === tab ? T.darkNavy : "#94a3b8",
                    }}
                  >
                    {tab === "chart" ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
                    {tab === "chart" ? "Chart" : "Scorecard"}
                  </button>
                ))}
              </div>
            </div>

            {matrixTab === "chart" ? (
              <div className="space-y-6">
                {/* Bubble Chart Card */}
                <div className="rounded-2xl p-6 md:p-8" style={{ border: "1px solid #e2e8f0" }}>
                  <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} width="100%" className="select-none" style={{ maxHeight: 600 }}>
                    <defs>
                      <clipPath id="plot-area">
                        <rect x={PAD.left} y={PAD.top} width={PW} height={PH} />
                      </clipPath>
                    </defs>

                    {/* Quadrant backgrounds */}
                    <g clipPath="url(#plot-area)">
                      <rect x={PAD.left} y={PAD.top} width={threshX - PAD.left} height={threshY - PAD.top} fill={QUADRANT_META.Strategic.fill} />
                      <rect x={threshX} y={PAD.top} width={PAD.left + PW - threshX} height={threshY - PAD.top} fill={QUADRANT_META.Champions.fill} />
                      <rect x={PAD.left} y={threshY} width={threshX - PAD.left} height={PAD.top + PH - threshY} fill={QUADRANT_META.Foundation.fill} />
                      <rect x={threshX} y={threshY} width={PAD.left + PW - threshX} height={PAD.top + PH - threshY} fill={QUADRANT_META["Quick Wins"].fill} />
                    </g>

                    {/* Grid lines */}
                    <g clipPath="url(#plot-area)" opacity="0.15">
                      {xTicks.map((v) => <line key={`gx-${v}`} x1={toX(v)} y1={PAD.top} x2={toX(v)} y2={PAD.top + PH} stroke="#64748b" strokeWidth="0.7" strokeDasharray="4 4" />)}
                      {yTicks.map((v) => <line key={`gy-${v}`} x1={PAD.left} y1={toY(v)} x2={PAD.left + PW} y2={toY(v)} stroke="#64748b" strokeWidth="0.7" strokeDasharray="4 4" />)}
                    </g>

                    {/* Threshold dashed lines */}
                    <g clipPath="url(#plot-area)">
                      <line x1={threshX} y1={PAD.top} x2={threshX} y2={PAD.top + PH} stroke="#64748b" strokeWidth="1" strokeDasharray="6 4" opacity="0.25" />
                      <line x1={PAD.left} y1={threshY} x2={PAD.left + PW} y2={threshY} stroke="#64748b" strokeWidth="1" strokeDasharray="6 4" opacity="0.25" />
                    </g>

                    {/* Quadrant labels */}
                    <text x={PAD.left + 10} y={PAD.top + 18} fontSize="13" fontWeight="600" fill={QUADRANT_META.Strategic.labelColor} opacity="0.7">Strategic</text>
                    <text x={PAD.left + PW - 10} y={PAD.top + 18} fontSize="13" fontWeight="600" fill={QUADRANT_META.Champions.labelColor} opacity="0.7" textAnchor="end">Champions</text>
                    <text x={PAD.left + 10} y={PAD.top + PH - 8} fontSize="13" fontWeight="600" fill={QUADRANT_META.Foundation.labelColor} opacity="0.7">Foundation</text>
                    <text x={PAD.left + PW - 10} y={PAD.top + PH - 8} fontSize="13" fontWeight="600" fill={QUADRANT_META["Quick Wins"].labelColor} opacity="0.7" textAnchor="end">Quick Wins</text>

                    {/* Axes */}
                    <line x1={PAD.left} y1={PAD.top + PH} x2={PAD.left + PW} y2={PAD.top + PH} stroke="#64748b" strokeWidth="1" opacity="0.3" />
                    <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} stroke="#64748b" strokeWidth="1" opacity="0.3" />

                    {/* X-axis ticks */}
                    {xTicks.map((v) => (
                      <g key={`xt-${v}`}>
                        <line x1={toX(v)} y1={PAD.top + PH} x2={toX(v)} y2={PAD.top + PH + 5} stroke="#64748b" strokeWidth="0.8" opacity="0.4" />
                        <text x={toX(v)} y={PAD.top + PH + 18} textAnchor="middle" fontSize="11" fill="#64748b" opacity="0.55">{v % 1 === 0 ? v : v.toFixed(1)}</text>
                      </g>
                    ))}
                    <text x={PAD.left + PW / 2} y={SVG_H - 6} textAnchor="middle" fontSize="13" fontWeight="500" fill="#64748b" opacity="0.6">Readiness Score</text>

                    {/* Y-axis ticks */}
                    {yTicks.map((v) => (
                      <g key={`yt-${v}`}>
                        <line x1={PAD.left - 5} y1={toY(v)} x2={PAD.left} y2={toY(v)} stroke="#64748b" strokeWidth="0.8" opacity="0.4" />
                        <text x={PAD.left - 10} y={toY(v) + 4} textAnchor="end" fontSize="11" fill="#64748b" opacity="0.55">{v % 1 === 0 ? v : v.toFixed(1)}</text>
                      </g>
                    ))}
                    <text x={16} y={PAD.top + PH / 2} textAnchor="middle" fontSize="13" fontWeight="500" fill="#64748b" opacity="0.6" transform={`rotate(-90, 16, ${PAD.top + PH / 2})`}>Value Score (EV / Friction Cost)</text>

                    {/* Bubbles */}
                    <g clipPath="url(#plot-area)">
                      {svgPoints.map((pt: any) => {
                        const isSelected = pt.id === matrixSelectedId;
                        const isHovered = pt.id === hoveredBubbleId;
                        const bColor = QUADRANT_COLORS[pt.quadrant];
                        const scale = isHovered || isSelected ? 1.15 : 1;
                        return (
                          <g key={pt.id} onClick={() => setMatrixSelectedId(isSelected ? null : pt.id)} onMouseEnter={() => setHoveredBubbleId(pt.id)} onMouseLeave={() => setHoveredBubbleId(null)} style={{ cursor: "pointer" }}>
                            {(isSelected || isHovered) && <circle cx={pt.cx} cy={pt.cy} r={pt.r * scale + 4} fill="none" stroke={bColor} strokeWidth="2" opacity="0.4" />}
                            <circle cx={pt.cx + 1} cy={pt.cy + 1} r={pt.r * scale} fill="black" opacity="0.08" />
                            <circle cx={pt.cx} cy={pt.cy} r={pt.r * scale} fill={bColor} opacity={isSelected ? 1 : 0.85} stroke="white" strokeWidth="1.5" />
                            <text x={pt.cx + pt.r * scale + 6} y={pt.cy + 4} fontSize="10.5" fill="#334155" opacity="0.7" fontWeight="500">{truncate(pt.name, 22)}</text>
                          </g>
                        );
                      })}
                    </g>

                    {/* Tooltip on hover */}
                    {hoveredBubbleId && (() => {
                      const pt = svgPoints.find((p: any) => p.id === hoveredBubbleId);
                      if (!pt) return null;
                      const tx = clamp(pt.cx + pt.r + 12, PAD.left + 10, SVG_W - 180);
                      const ty = clamp(pt.cy - 30, PAD.top + 5, PAD.top + PH - 70);
                      return (
                        <g pointerEvents="none">
                          <rect x={tx} y={ty} width="170" height="60" rx="6" fill="#1e293b" stroke="#334155" strokeWidth="0.5" opacity="0.95" />
                          <text x={tx + 8} y={ty + 16} fontSize="11" fontWeight="600" fill="white">{truncate(pt.name, 24)}</text>
                          <text x={tx + 8} y={ty + 31} fontSize="10" fill="white" opacity="0.7">Value: {pt.valueScore.toFixed(1)} | Readiness: {pt.readinessScore.toFixed(1)}</text>
                          <text x={tx + 8} y={ty + 45} fontSize="10" fill="white" opacity="0.7">TTV: {(pt.ttvScore || 0).toFixed(2)} | Priority: {pt.priorityScore.toFixed(1)}</text>
                        </g>
                      );
                    })()}
                  </svg>

                  {/* Legend */}
                  <div className="flex flex-wrap items-center justify-center gap-5 mt-4 text-xs" style={{ color: "#64748b" }}>
                    {(["Champions", "Quick Wins", "Strategic", "Foundation"] as const).map((q) => (
                      <span key={q} className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: QUADRANT_COLORS[q] }} />
                        {q}
                      </span>
                    ))}
                    <span className="flex items-center gap-1.5 ml-2 pl-4" style={{ borderLeft: "1px solid #e2e8f0" }}>
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ border: "2px solid #94a3b8" }} />
                      Faster TTV = Larger
                    </span>
                  </div>
                </div>

                {/* Quadrant Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {(["Champions", "Strategic", "Quick Wins", "Foundation"] as const).map((q) => {
                    const accent = QUADRANT_META[q].accent;
                    return (
                      <div key={q} className="rounded-xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                        <div className="h-1" style={{ backgroundColor: accent }} />
                        <div className="pt-5 pb-5 px-5">
                          <p className="text-sm font-semibold" style={{ color: T.darkNavy }}>{q === "Strategic" ? "Strategic Bets" : q}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{QUADRANT_META[q].subtitle}</p>
                          <p className="text-3xl font-bold mt-3" style={{ color: accent }}>{quadrantCounts[q]}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected detail panel */}
                {selectedP && (() => {
                  const tierColor = getTierColor(selectedP.priorityTier);
                  const quadrant = getQuadrant(selectedP.valueScore, selectedP.readinessScore);
                  const ucName = selectedP.useCaseName || useCases.find((u: any) => u.id === selectedP.useCaseId)?.name || selectedP.useCaseId;
                  return (
                    <div className="rounded-xl overflow-hidden" style={{ border: `2px solid ${tierColor}40` }}>
                      <div className="h-1" style={{ backgroundColor: tierColor }} />
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-lg font-semibold" style={{ color: T.darkNavy }}>{ucName}</h3>
                          <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: `${tierColor}18`, color: tierColor, border: `1px solid ${tierColor}40` }}>{selectedP.priorityTier}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                          {[
                            { label: "Value Score", value: selectedP.valueScore, max: 10, color: "#f59e0b" },
                            { label: "Readiness Score", value: selectedP.readinessScore, max: 10, color: "#02a2fd" },
                            { label: "TTV Score", value: selectedP.ttvScore, max: 1, color: "#36bf78", fmt: true },
                            { label: "Priority Score", value: selectedP.priorityScore, max: 10, color: tierColor },
                          ].map((m) => (
                            <div key={m.label}>
                              <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>{m.label}</p>
                              <p className="text-xl font-bold" style={{ color: T.darkNavy }}>{m.fmt ? m.value?.toFixed(2) : m.value?.toFixed(1)}</p>
                              <div className="h-2 rounded-full mt-2" style={{ backgroundColor: "#f1f5f9" }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%`, backgroundColor: m.color }} />
                              </div>
                            </div>
                          ))}
                          <div>
                            <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>Recommended Phase</p>
                            <p className="text-xl font-bold" style={{ color: T.darkNavy }}>{selectedP.recommendedPhase}</p>
                            <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>Quadrant: <span className="font-medium" style={{ color: QUADRANT_META[quadrant].labelColor }}>{quadrant}</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Scorecard Table View */
              <div className="space-y-6">
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: T.slate50 }}>
                          <th className="text-left px-4 py-3 text-xs font-semibold w-12" style={{ color: "#64748b" }}>Rank</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "#64748b" }}>Use Case</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold w-24" style={{ color: "#64748b" }}>Value</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold w-24" style={{ color: "#64748b" }}>Readiness</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold w-24" style={{ color: "#64748b" }}>Priority</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold w-36" style={{ color: "#64748b" }}>Tier</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold w-20" style={{ color: "#64748b" }}>Phase</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedPriorities.map((p: any, idx: number) => {
                          const tierColor = getTierColor(p.priorityTier);
                          const ucName = p.useCaseName || useCases.find((u: any) => u.id === p.useCaseId)?.name || p.useCaseId;
                          return (
                            <tr
                              key={p.id}
                              className="transition-colors cursor-pointer"
                              onClick={() => setMatrixSelectedId(p.id === matrixSelectedId ? null : p.id)}
                              style={{ borderTop: "1px solid #f1f5f9", backgroundColor: p.id === matrixSelectedId ? "#f8fafc" : "transparent" }}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = p.id === matrixSelectedId ? "#f8fafc" : "transparent")}
                            >
                              <td className="px-4 py-3 font-mono" style={{ color: "#94a3b8" }}>{idx + 1}</td>
                              <td className="px-4 py-3 font-medium" style={{ color: T.darkNavy }}>{ucName}</td>
                              <td className="px-4 py-3 text-right font-mono">{p.valueScore?.toFixed(1)}</td>
                              <td className="px-4 py-3 text-right font-mono">{p.readinessScore?.toFixed(1)}</td>
                              <td className="px-4 py-3 text-right font-mono font-bold">{p.priorityScore?.toFixed(1)}</td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: tierColor, borderColor: `${tierColor}50`, backgroundColor: `${tierColor}10`, border: `1px solid ${tierColor}50` }}>{p.priorityTier}</span>
                              </td>
                              <td className="px-4 py-3 text-center font-mono" style={{ color: "#94a3b8" }}>{p.recommendedPhase}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Selected detail panel (same as chart view) */}
                {selectedP && (() => {
                  const tierColor = getTierColor(selectedP.priorityTier);
                  const quadrant = getQuadrant(selectedP.valueScore, selectedP.readinessScore);
                  const ucName = selectedP.useCaseName || useCases.find((u: any) => u.id === selectedP.useCaseId)?.name || selectedP.useCaseId;
                  return (
                    <div className="rounded-xl overflow-hidden" style={{ border: `2px solid ${tierColor}40` }}>
                      <div className="h-1" style={{ backgroundColor: tierColor }} />
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="text-lg font-semibold" style={{ color: T.darkNavy }}>{ucName}</h3>
                          <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: `${tierColor}18`, color: tierColor, border: `1px solid ${tierColor}40` }}>{selectedP.priorityTier}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                          {[
                            { label: "Value Score", value: selectedP.valueScore, max: 10, color: "#f59e0b" },
                            { label: "Readiness Score", value: selectedP.readinessScore, max: 10, color: "#02a2fd" },
                            { label: "TTV Score", value: selectedP.ttvScore, max: 1, color: "#36bf78", fmt: true },
                            { label: "Priority Score", value: selectedP.priorityScore, max: 10, color: tierColor },
                          ].map((m) => (
                            <div key={m.label}>
                              <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>{m.label}</p>
                              <p className="text-xl font-bold" style={{ color: T.darkNavy }}>{m.fmt ? m.value?.toFixed(2) : m.value?.toFixed(1)}</p>
                              <div className="h-2 rounded-full mt-2" style={{ backgroundColor: "#f1f5f9" }}>
                                <div className="h-full rounded-full" style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%`, backgroundColor: m.color }} />
                              </div>
                            </div>
                          ))}
                          <div>
                            <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>Recommended Phase</p>
                            <p className="text-xl font-bold" style={{ color: T.darkNavy }}>{selectedP.recommendedPhase}</p>
                            <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>Quadrant: <span className="font-medium" style={{ color: QUADRANT_META[quadrant].labelColor }}>{quadrant}</span></p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </Section>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5: FRICTION-UC RECOVERY MAP
          ══════════════════════════════════════════════════════════════════════ */}
      {frictionItems.length > 0 && (
        <Section bg="dark">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-6 h-6" style={{ color: T.amber }} />
            <h2 className="text-2xl md:text-3xl font-bold text-white">Friction-to-Value Recovery</h2>
            <span className="text-xs font-medium px-3 py-1 rounded-full" style={{ backgroundColor: `${T.green}20`, color: T.green }}>
              {frictionUCMap.mappedCount}/{frictionItems.length} mapped
            </span>
          </div>
          <p className="text-sm mb-8" style={{ color: "#94a3b8" }}>
            Every friction point mapped to an AI use case with quantified recovery potential.
          </p>

          {/* Summary metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Total Friction Cost", value: frictionUCMap.totalFrictionCost, color: T.red },
              { label: "Total Recovery", value: frictionUCMap.totalRecovery, color: T.green },
              { label: "Recovery Rate", value: null, display: `${frictionUCMap.overallRecoveryRate.toFixed(1)}%`, color: T.green },
              { label: "Unrecovered", value: frictionUCMap.totalUnrecovered, color: T.amber },
              { label: "Additional Value", value: frictionUCMap.totalAdditional, color: T.green },
            ].map((m) => (
              <div key={m.label} className="rounded-xl p-4" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#94a3b8" }}>{m.label}</p>
                <p className="text-xl font-bold" style={{ color: m.color }}>
                  {m.display || formatCurrency(m.value!)}
                </p>
              </div>
            ))}
          </div>

          {/* Recovery table grouped by theme */}
          <div className="space-y-4">
            {strategicThemes.map((theme: any) => {
              const themeRows = frictionUCMap.rows.filter((r) => r.strategicTheme === theme.name);
              if (themeRows.length === 0) return null;
              const themeTotal = themeRows.reduce((s, r) => s + r.frictionCost, 0);
              return (
                <div key={theme.name} className="rounded-xl overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-sm font-semibold text-white">{theme.name}</span>
                    <span className="text-xs font-mono" style={{ color: T.red }}>{formatCurrency(themeTotal)}</span>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    {themeRows.map((row) => (
                      <div key={row.id} className="px-5 py-3 grid grid-cols-12 gap-3 items-center text-xs">
                        <div className="col-span-4 text-white/80 truncate">{row.frictionPoint?.slice(0, 80)}</div>
                        <div className="col-span-2 text-right font-mono" style={{ color: T.red }}>{formatCurrency(row.frictionCost)}</div>
                        <div className="col-span-2 text-white/60 truncate">{row.ucName || "Unmapped"}</div>
                        <div className="col-span-2">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                            <div className="h-full rounded-full" style={{ width: `${Math.min(row.recoveryPct, 100)}%`, backgroundColor: row.recoveryPct >= 100 ? T.green : T.amber }} />
                          </div>
                        </div>
                        <div className="col-span-2 text-right font-mono" style={{ color: row.recoveryPct >= 100 ? T.green : T.amber }}>
                          {row.recoveryPct.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6: STRATEGIC THEME DEEP-DIVE
          ══════════════════════════════════════════════════════════════════════ */}
      <Section bg="slate">
        <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: T.darkNavy }}>Strategic Analysis by Theme</h2>
        <p className="text-sm mb-2" style={{ color: "#64748b" }}>
          Each strategic theme groups related KPIs, friction points, AI use cases, and workflows for end-to-end visibility.
        </p>
        <InlineTip text="Expand each theme to see KPIs, friction points, and use cases grouped together. The first two themes are expanded by default." />
        <div className="mb-8" />

        <div className="space-y-6">
          {themeData.map((td) => {
            const isExpanded = expandedThemes.has(td.index);
            return (
              <div key={td.theme.id || td.index} className="rounded-2xl overflow-hidden" style={{ backgroundColor: T.white, border: "1px solid #e2e8f0" }}>
                {/* Theme Header */}
                <button
                  onClick={() => toggleTheme(td.index)}
                  className="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-slate-50/50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                    style={{ backgroundColor: T.navy }}
                  >
                    {td.index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold" style={{ color: T.darkNavy }}>{td.theme.name}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
                      {td.useCases.length} use cases &middot; {td.kpis.length} KPIs &middot; {td.frictions.length} friction points
                    </p>
                  </div>
                  <span className="text-sm font-bold" style={{ color: T.green }}>{formatCurrency(td.totalValue)}</span>
                  {isExpanded
                    ? <ChevronDown className="w-5 h-5 flex-shrink-0" style={{ color: "#94a3b8" }} />
                    : <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: "#94a3b8" }} />}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 space-y-6" style={{ borderTop: "1px solid #f1f5f9" }}>
                    {/* Current → Target */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="p-4 rounded-xl" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.red }}>Current State</p>
                        <p className="text-sm" style={{ color: T.darkNavy }}>{td.theme.currentState}</p>
                      </div>
                      <div className="p-4 rounded-xl" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.green }}>Target State</p>
                        <p className="text-sm" style={{ color: T.darkNavy }}>{td.theme.targetState}</p>
                      </div>
                    </div>

                    {/* KPIs */}
                    {td.kpis.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 className="w-4 h-4" style={{ color: T.lightBlue }} />
                          <h4 className="text-sm font-semibold" style={{ color: T.darkNavy }}>Key Performance Indicators</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {td.kpis.map((kpi: any, ki: number) => {
                            const dir = kpi.direction?.toLowerCase() || "";
                            const DirIcon = dir.includes("↑") || dir.includes("increase") || dir.includes("up") ? ArrowUpRight : dir.includes("↓") || dir.includes("decrease") || dir.includes("down") ? ArrowDownRight : Minus;
                            const dirColor = dir.includes("↑") || dir.includes("increase") || dir.includes("up") ? T.green : dir.includes("↓") || dir.includes("decrease") || dir.includes("down") ? T.lightBlue : "#94a3b8";
                            return (
                              <div key={kpi.id || ki} className="p-4 rounded-xl" style={{ backgroundColor: T.slate50, border: "1px solid #e2e8f0" }}>
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="text-xs font-medium" style={{ color: "#64748b" }}>{kpi.function} &middot; {kpi.subFunction}</p>
                                    <p className="text-sm font-semibold" style={{ color: T.darkNavy }}>{kpi.kpiName}</p>
                                  </div>
                                  <DirIcon className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: dirColor }} />
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="font-mono" style={{ color: "#94a3b8" }}>{kpi.baselineValue}</span>
                                  <ArrowRight className="w-3 h-3" style={{ color: "#cbd5e1" }} />
                                  <span className="font-mono font-bold" style={{ color: T.navy }}>{kpi.targetValue}</span>
                                </div>
                                {kpi.timeframe && (
                                  <p className="text-[10px] mt-1" style={{ color: "#94a3b8" }}>{kpi.timeframe}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Friction Points */}
                    {td.frictions.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4" style={{ color: T.amber }} />
                          <h4 className="text-sm font-semibold" style={{ color: T.darkNavy }}>Friction Points</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {td.frictions.map((fp: any, fi: number) => {
                            const sev = SEVERITY_COLORS[(fp.severity || "medium").toLowerCase()] || SEVERITY_COLORS.medium;
                            return (
                              <div key={fp.id || fi} className="p-4 rounded-xl" style={{ backgroundColor: T.slate50, border: "1px solid #e2e8f0" }}>
                                <div className="flex items-start gap-2 mb-2">
                                  <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md flex-shrink-0 mt-0.5"
                                    style={{ backgroundColor: sev.bg, color: sev.text, border: `1px solid ${sev.border}` }}
                                  >
                                    {fp.severity}
                                  </span>
                                  <p className="text-sm" style={{ color: T.darkNavy }}>{fp.frictionPoint}</p>
                                </div>
                                <div className="flex items-center gap-4 text-xs" style={{ color: "#64748b" }}>
                                  <span>{fp.role}</span>
                                  <span className="font-mono font-semibold" style={{ color: T.red }}>
                                    {parseCurrencyString(fp.estimatedAnnualCost) > 0 ? formatCurrency(parseCurrencyString(fp.estimatedAnnualCost)) : ""}
                                  </span>
                                  {fp.annualHours > 0 && <span>{fp.annualHours.toLocaleString()} hrs/yr</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Use Cases */}
                    {td.useCases.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Brain className="w-4 h-4" style={{ color: T.navy }} />
                          <h4 className="text-sm font-semibold" style={{ color: T.darkNavy }}>AI Use Cases</h4>
                        </div>
                        <div className="space-y-5">
                          {td.useCases.map((uc: any) => {
                            const patternName = getPatternDisplayName(uc.agenticPattern);
                            const tierColor = uc.priority ? getTierColor(uc.priority.priorityTier) : "#94a3b8";
                            const epochStr = uc.epochFlags || uc["EPOCH Flags"] || uc.epoch_flags || "";
                            const epochs = typeof epochStr === "string"
                              ? epochStr.split(",").map((s: string) => s.trim()).filter(Boolean)
                              : Array.isArray(epochStr) ? epochStr : [];
                            const wf = uc.workflow;
                            const wfExpanded = expandedWorkflows.has(uc.id);
                            const wfMetrics = wf?.comparisonMetrics;

                            return (
                              <div
                                key={uc.id}
                                className="rounded-2xl overflow-hidden"
                                style={{ border: "1px solid #e2e8f0", backgroundColor: T.white }}
                              >
                                {/* UC Header */}
                                <div className="p-5">
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>{uc.id}</span>
                                      <h5 className="text-base font-bold" style={{ color: T.darkNavy }}>{uc.name}</h5>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span
                                        className="text-[11px] font-semibold px-3 py-1 rounded-full text-white"
                                        style={{ backgroundColor: T.navy }}
                                      >
                                        {patternName}
                                      </span>
                                      <span
                                        className="text-[11px] font-medium px-3 py-1 rounded-full"
                                        style={{ border: "1px solid #cbd5e1", color: "#64748b" }}
                                      >
                                        {uc.function}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-sm leading-relaxed mb-4" style={{ color: "#475569" }}>{uc.description}</p>

                                  {/* Target Friction */}
                                  {uc.targetFriction && (
                                    <div className="mb-4">
                                      <span className="text-xs font-semibold" style={{ color: T.lightBlue }}>Target Friction: </span>
                                      <span className="text-xs" style={{ color: "#64748b" }}>{uc.targetFriction}</span>
                                    </div>
                                  )}

                                  {/* AI Primitives */}
                                  {(uc.aiPrimitives || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-1">
                                      {uc.aiPrimitives.map((p: string) => (
                                        <span
                                          key={p}
                                          className="text-[10px] font-medium px-2.5 py-0.5 rounded-md"
                                          style={{ backgroundColor: `${T.green}10`, color: T.green, border: `1px solid ${T.green}30` }}
                                        >
                                          {p}
                                        </span>
                                      ))}
                                      <InlineTip text="Green pills show which AI capabilities this use case requires." />
                                    </div>
                                  )}

                                  {/* Agentic Pattern Analysis Box */}
                                  <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: T.slate50, border: "1px solid #e2e8f0" }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#94a3b8" }}>
                                      Agentic Pattern Analysis
                                    </p>
                                    <div className="flex items-start gap-6 mb-3">
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#94a3b8" }}>Primary Pattern</p>
                                        <span className="text-[11px] font-semibold px-3 py-1 rounded-full text-white inline-block" style={{ backgroundColor: T.navy }}>
                                          {patternName}
                                        </span>
                                      </div>
                                      {(uc.alternativePattern || uc["Alternative Pattern"]) && (
                                        <div>
                                          <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#94a3b8" }}>Alternative</p>
                                          <span className="text-[11px] font-medium px-3 py-1 rounded-full inline-block" style={{ border: `1px solid ${T.navy}40`, color: T.navy }}>
                                            {uc.alternativePattern || uc["Alternative Pattern"]}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    {uc.patternRationale && (
                                      <div>
                                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#94a3b8" }}>Rationale</p>
                                        <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>{uc.patternRationale}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* EPOCH Tags */}
                                  {epochs.length > 0 && (
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#94a3b8" }}>E.P.O.C.H.:</span>
                                      {epochs.map((tag: string) => {
                                        const key = tag.toLowerCase().trim();
                                        const colors = EPOCH_COLORS[key] || { bg: "#f1f5f9", text: "#475569", border: "#e2e8f0" };
                                        return (
                                          <span
                                            key={tag}
                                            className="text-[10px] font-medium px-2.5 py-0.5 rounded-md"
                                            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                                          >
                                            {tag}
                                          </span>
                                        );
                                      })}
                                      <InlineTip text="EPOCH tags mark where human oversight is non-negotiable." />
                                    </div>
                                  )}

                                  {/* Desired Outcomes */}
                                  {(uc.desiredOutcomes || []).length > 0 && (
                                    <div className="mb-4">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#94a3b8" }}>Desired Outcomes</p>
                                      <ul className="space-y-1">
                                        {uc.desiredOutcomes.map((outcome: string, oi: number) => (
                                          <li key={oi} className="flex items-start gap-2 text-xs" style={{ color: "#475569" }}>
                                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: T.green }} />
                                            {outcome}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Data Types + Integrations */}
                                  <div className="flex flex-wrap gap-3 mb-4">
                                    {(uc.dataTypes || []).length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider self-center mr-1" style={{ color: "#94a3b8" }}>Data:</span>
                                        {uc.dataTypes.map((dt: string) => (
                                          <span key={dt} className="text-[10px] px-2 py-0.5 rounded-md" style={{ border: "1px solid #e2e8f0", color: "#64748b" }}>
                                            {dt}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    {(uc.integrations || []).length > 0 && (
                                      <div className="flex flex-wrap gap-1.5">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider self-center mr-1" style={{ color: "#94a3b8" }}>Integrations:</span>
                                        {uc.integrations.map((integ: string) => (
                                          <span key={integ} className="text-[10px] px-2 py-0.5 rounded-md" style={{ backgroundColor: `${T.navy}08`, border: `1px solid ${T.navy}15`, color: T.navy }}>
                                            {integ}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Benefits + Priority Row */}
                                  {uc.benefit && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                      {[
                                        { label: "Cost Savings", value: parseCurrencyString(uc.benefit.costBenefit), color: T.lightBlue },
                                        { label: "Revenue", value: parseCurrencyString(uc.benefit.revenueBenefit), color: T.green },
                                        { label: "Risk Mitigation", value: parseCurrencyString(uc.benefit.riskBenefit), color: T.amber },
                                        { label: "Cash Flow", value: parseCurrencyString(uc.benefit.cashFlowBenefit), color: T.purple },
                                      ].map((b) => (
                                        <div key={b.label} className="text-center p-2 rounded-lg" style={{ backgroundColor: `${b.color}08` }}>
                                          <p className="text-[10px] mb-0.5" style={{ color: "#94a3b8" }}>{b.label}</p>
                                          <p className="text-sm font-bold font-mono" style={{ color: b.value > 0 ? b.color : "#cbd5e1" }}>
                                            {b.value > 0 ? formatCurrency(b.value) : "$0"}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Priority + Readiness badges */}
                                  {uc.priority && (
                                    <div className="flex items-center gap-3 mb-4">
                                      <span
                                        className="text-[11px] font-semibold px-3 py-1 rounded-full"
                                        style={{ backgroundColor: `${tierColor}15`, color: tierColor, border: `1px solid ${tierColor}30` }}
                                      >
                                        {uc.priority.priorityTier}
                                      </span>
                                      <span className="text-xs" style={{ color: "#64748b" }}>
                                        Priority: <strong className="font-mono" style={{ color: tierColor }}>{uc.priority.priorityScore?.toFixed(1)}</strong>
                                      </span>
                                      {uc.priority.recommendedPhase && (
                                        <span className="text-xs" style={{ color: "#94a3b8" }}>
                                          Phase: {uc.priority.recommendedPhase}
                                        </span>
                                      )}
                                      {uc.readinessData && (
                                        <span className="text-xs" style={{ color: "#94a3b8" }}>
                                          Readiness: <strong className="font-mono" style={{ color: scoreColor(uc.readinessData.readinessScore) }}>
                                            {uc.readinessData.readinessScore?.toFixed(1)}
                                          </strong>/10
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* HITL Bar */}
                                {uc.hitlCheckpoint && (
                                  <div className="px-5 py-3 flex items-start gap-2" style={{ backgroundColor: "#fffbeb", borderTop: "1px solid #fde68a" }}>
                                    <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: T.amber }} />
                                    <div>
                                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#92400e" }}>HITL: </span>
                                      <span className="text-xs" style={{ color: "#78350f" }}>{uc.hitlCheckpoint}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Nested Workflow */}
                                {wf && (
                                  <>
                                    <button
                                      onClick={() => toggleWorkflow(uc.id)}
                                      className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-slate-50/50 transition-colors"
                                      style={{ borderTop: "1px solid #f1f5f9" }}
                                    >
                                      <div className="flex items-center gap-2">
                                        <GitCompareArrows className="w-4 h-4" style={{ color: T.lightBlue }} />
                                        <span className="text-xs font-semibold" style={{ color: T.darkNavy }}>Workflow Transformation</span>
                                        {!wfExpanded && <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded" style={{ backgroundColor: `${T.lightBlue}10`, color: T.lightBlue }}>Click to reveal</span>}
                                      </div>
                                      {wfExpanded
                                        ? <ChevronDown className="w-4 h-4" style={{ color: "#94a3b8" }} />
                                        : <ChevronRight className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                                    </button>

                                    {wfExpanded && (
                                      <div className="px-5 pb-5 space-y-4" style={{ borderTop: "1px solid #f1f5f9" }}>
                                        {/* Metrics */}
                                        {wfMetrics && (
                                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                            {[
                                              { label: "Time", icon: Clock, data: wfMetrics.timeReduction, color: T.lightBlue },
                                              { label: "Cost", icon: DollarSign, data: wfMetrics.costReduction, color: T.green },
                                              { label: "Quality", icon: Star, data: wfMetrics.qualityImprovement, color: T.amber },
                                              { label: "Throughput", icon: TrendingUp, data: wfMetrics.throughputIncrease, color: T.purple },
                                            ].map((m) => (
                                              <div key={m.label} className="p-3 rounded-xl" style={{ backgroundColor: T.slate50, border: "1px solid #e2e8f0" }}>
                                                <div className="flex items-center gap-1.5 mb-2">
                                                  <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                                                  <span className="text-[10px] font-medium" style={{ color: "#64748b" }}>{m.label}</span>
                                                </div>
                                                <p className="text-lg font-bold" style={{ color: m.color }}>{m.data?.improvement || "--"}</p>
                                                <div className="flex items-center gap-1 text-[10px] mt-1" style={{ color: "#94a3b8" }}>
                                                  <span>{m.data?.before || "--"}</span>
                                                  <ArrowRight className="w-2.5 h-2.5" />
                                                  <span className="font-medium" style={{ color: m.color }}>{m.data?.after || "--"}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Steps comparison */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {/* Current Process */}
                                          <div>
                                            <div className="flex items-center gap-2 mb-3">
                                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: "#fef2f2", color: T.red }}>
                                                Current Process
                                              </span>
                                            </div>
                                            <div className="space-y-2">
                                              {(wf.currentState || []).map((step: any, si: number) => (
                                                <div key={si} className="p-3 rounded-lg" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                                                  <div className="flex items-start justify-between mb-1">
                                                    <p className="text-xs font-semibold" style={{ color: T.darkNavy }}>{step.name}</p>
                                                    <span className="text-[10px] font-mono" style={{ color: "#94a3b8" }}>{step.duration}</span>
                                                  </div>
                                                  <p className="text-[10px] mb-1" style={{ color: "#64748b" }}>{step.description}</p>
                                                  <div className="flex flex-wrap gap-1">
                                                    {step.isBottleneck && (
                                                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: "#fee2e2", color: T.red }}>Bottleneck</span>
                                                    )}
                                                    {(step.painPoints || []).length > 0 && (
                                                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: "#fee2e2", color: T.red }}>Error-prone</span>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          {/* AI-Powered Process */}
                                          <div>
                                            <div className="flex items-center gap-2 mb-3">
                                              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded" style={{ backgroundColor: "#f0fdf4", color: T.green }}>
                                                AI-Powered Process
                                              </span>
                                            </div>
                                            <div className="space-y-2">
                                              {(wf.targetState || []).map((step: any, si: number) => (
                                                <div key={si} className="p-3 rounded-lg" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                                                  <div className="flex items-start justify-between mb-1">
                                                    <p className="text-xs font-semibold" style={{ color: T.darkNavy }}>{step.name}</p>
                                                    <span className="text-[10px] font-mono" style={{ color: "#94a3b8" }}>{step.duration}</span>
                                                  </div>
                                                  <p className="text-[10px] mb-1" style={{ color: "#64748b" }}>{step.description}</p>
                                                  <div className="flex flex-wrap gap-1">
                                                    {step.isAIEnabled && (
                                                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${T.lightBlue}15`, color: T.lightBlue }}>
                                                        AI-Powered
                                                      </span>
                                                    )}
                                                    {step.automationLevel === "full" && (
                                                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${T.green}15`, color: T.green }}>
                                                        Fully Automated
                                                      </span>
                                                    )}
                                                    {step.isHumanInTheLoop && (
                                                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: `${T.amber}15`, color: T.amber }}>
                                                        Human Review
                                                      </span>
                                                    )}
                                                    {(step.aiCapabilities || []).map((cap: string) => (
                                                      <span key={cap} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${T.lightBlue}10`, color: T.lightBlue }}>
                                                        {cap}
                                                      </span>
                                                    ))}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7: READINESS ASSESSMENT (grouped by Strategic Theme)
          ══════════════════════════════════════════════════════════════════════ */}
      {readiness.length > 0 && (
        <Section bg="white">
          <div className="flex items-center gap-3 mb-3">
            <Gauge className="w-6 h-6" style={{ color: T.lightBlue }} />
            <h2 className="text-2xl md:text-3xl font-bold" style={{ color: T.darkNavy }}>Readiness Assessment</h2>
          </div>
          <p className="text-sm mb-8" style={{ color: "#64748b" }}>
            Four dimensions of implementation readiness scored for each use case, grouped by strategic theme.
          </p>

          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #e2e8f0" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: T.slate50 }}>
                    <th className="px-5 py-3 text-left text-xs font-semibold" style={{ color: "#64748b" }}>Use Case</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold" style={{ color: "#64748b" }}>Data</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold" style={{ color: "#64748b" }}>Technical</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold" style={{ color: "#64748b" }}>Org Capacity</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold" style={{ color: "#64748b" }}>Governance</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold" style={{ color: "#64748b" }}>Overall</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold" style={{ color: "#64748b" }}>TTV</th>
                  </tr>
                </thead>
                <tbody>
                  {themeData.map((td) => {
                    const themeReadiness = readiness.filter((r: any) => {
                      const uc = useCases.find((u: any) => u.id === r.useCaseId);
                      return uc?.strategicTheme === td.theme.name;
                    });
                    if (themeReadiness.length === 0) return null;
                    return (
                      <Fragment key={td.theme.name || td.index}>
                        {/* Theme group header row */}
                        <tr>
                          <td colSpan={7} className="px-5 py-2.5" style={{ backgroundColor: `${T.navy}08`, borderTop: "1px solid #e2e8f0" }}>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: T.navy }}>{td.index + 1}</div>
                              <span className="text-xs font-bold" style={{ color: T.darkNavy }}>{td.theme.name}</span>
                            </div>
                          </td>
                        </tr>
                        {themeReadiness.map((r: any, i: number) => {
                          const ucName = r.useCaseName || useCases.find((u: any) => u.id === r.useCaseId)?.name || r.useCaseId;
                          return (
                            <tr key={r.id || `${td.index}-${i}`} style={{ borderTop: "1px solid #f1f5f9" }}>
                              <td className="px-5 py-3 text-sm font-medium max-w-[220px] truncate" style={{ color: T.darkNavy }}>{ucName}</td>
                              {[r.dataAvailability, r.technicalInfrastructure, r.organizationalCapacity, r.governance].map((score: number, j: number) => (
                                <td key={j} className="px-3 py-3 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded-md text-xs font-mono font-bold" style={{ color: scoreColor(score), backgroundColor: `${scoreColor(score)}10` }}>{score?.toFixed(1)}</span>
                                </td>
                              ))}
                              <td className="px-3 py-3 text-center">
                                <span className="inline-block px-3 py-1 rounded-md text-sm font-mono font-bold" style={{ color: scoreColor(r.readinessScore), backgroundColor: `${scoreColor(r.readinessScore)}12`, border: `1px solid ${scoreColor(r.readinessScore)}25` }}>{r.readinessScore?.toFixed(1)}</span>
                              </td>
                              <td className="px-3 py-3 text-center text-xs font-mono" style={{ color: "#64748b" }}>{r.timeToValue ? `${r.timeToValue}mo` : "--"}</td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: "#94a3b8" }}>
            <span className="font-medium">Legend:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: `${T.green}25` }} /> Strong (7-10)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: `${T.amber}25` }} /> Moderate (4-6.9)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded" style={{ backgroundColor: `${T.red}25` }} /> Needs Work (&lt;4)
            </span>
          </div>
        </Section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 8: METHODOLOGY
          ══════════════════════════════════════════════════════════════════════ */}
      <Section bg="slate">
        <button
          onClick={() => setMethodologyOpen(!methodologyOpen)}
          className="w-full flex items-center justify-between rounded-2xl p-5 transition-colors"
          style={{ backgroundColor: T.white, border: "1px solid #e2e8f0" }}
        >
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5" style={{ color: T.navy }} />
            <div className="text-left">
              <h3 className="text-lg font-bold" style={{ color: T.darkNavy }}>Methodology & Scoring Framework</h3>
              <p className="text-xs" style={{ color: "#94a3b8" }}>How every number earns its place in this assessment</p>
            </div>
          </div>
          <ChevronDown
            className="w-5 h-5 transition-transform"
            style={{ color: "#94a3b8", transform: methodologyOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>
        {methodologyOpen && (
          <div className="mt-4 rounded-2xl p-6 space-y-4 text-sm leading-relaxed" style={{ backgroundColor: T.white, border: "1px solid #e2e8f0", color: "#475569" }}>
            <div>
              <h4 className="font-semibold mb-1" style={{ color: T.darkNavy }}>10-Step Workflow</h4>
              <p>Strategic themes anchor business drivers. KPIs establish baselines and targets. Friction points quantify operational burden. AI use cases target specific frictions with agentic patterns. Benefits are quantified across four value drivers (cost, revenue, risk, cash flow) with conservative reduction factors.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1" style={{ color: T.darkNavy }}>Scoring</h4>
              <p>Readiness scores (0-10) across four dimensions: Data Availability, Technical Infrastructure, Organizational Capacity, and Governance. Priority scores combine value (expected benefit / friction cost) with readiness and time-to-value. Scenarios apply conservative (×0.6), base (×1.0), and optimistic (×1.3) multipliers.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1" style={{ color: T.darkNavy }}>Reduction Factors</h4>
              <p>Revenue benefits ×0.95, Cost benefits ×0.90, Cash flow ×0.85, Risk ×0.80. Data maturity adjustment applied based on institutional assessment level. Probability of success factors each use case independently.</p>
            </div>
          </div>
        )}
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 9: CTA
          ══════════════════════════════════════════════════════════════════════ */}
      <Section bg="blue">
        <div className="text-center py-4">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Ready to Activate the Flywheel?</h2>
          <p className="text-white/80 max-w-2xl mx-auto mb-8 text-sm leading-relaxed">
            This {formatCurrency(totalValue)} opportunity across {useCases.length} AI use cases is ready for a 3-Day Workshop
            to align stakeholders, validate priorities, and build a 90-day implementation pilot.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
            <a
              href="https://www.blueally.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:shadow-lg"
              style={{ backgroundColor: T.white, color: T.blue }}
            >
              <ExternalLink className="w-4 h-4" />
              Learn More
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {["Executive Alignment", "90-Day Pilot Cycle", "ROI-Focused"].map((item) => (
              <span key={item} className="flex items-center gap-1.5 text-xs text-white/80">
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#86efac" }} />
                {item}
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 10: FOOTER
          ══════════════════════════════════════════════════════════════════════ */}
      <footer className="py-10" style={{ backgroundColor: T.darkNavy }}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="https://www.blueally.com/wp-content/uploads/2023/11/header-logo.png"
              alt="BlueAlly"
              className="h-7"
            />
            <span className="text-sm text-white/60">
              &copy; {new Date().getFullYear()} BlueAlly. Confidential & Proprietary.
            </span>
          </div>
          <p className="text-xs text-white/40">
            Generated by BlueAlly AI Workflow Orchestration &middot;{" "}
            {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : ""}
          </p>
        </div>
      </footer>
    </div>
  );
}
