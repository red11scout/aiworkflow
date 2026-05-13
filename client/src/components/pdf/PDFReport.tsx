/**
 * PDFReport — professional, paginated PDF that mirrors the SharedReport page.
 *
 * Section order matches /shared/:code:
 *   Cover → KPIs + Use Case Benefits → Workflow Transformations →
 *   Systems, Data & Integrations → AI Readiness Assessment.
 *
 * Layout rules:
 *   - Every workflow card: wrap={false} so it never splits across pages.
 *   - Every table row: wrap={false}.
 *   - Section heading + lede travel together via a wrap={false} bundle.
 *   - AI Readiness Assessment forces a page break (Page break prop).
 *   - Fixed header + footer on every non-cover page with logo + page numbers.
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  pdf,
} from "@react-pdf/renderer";
import { formatCurrency, parseCurrencyString } from "@shared/formulas";
import {
  ASSESSMENT_STATUS_THRESHOLDS,
  CATEGORY_METADATA,
} from "@shared/assessment-questions";
import { getPatternById } from "@shared/patterns";
import type {
  AssessmentData,
  CategoryScore,
  UseCaseAssessmentScore,
  WorkflowMap,
} from "@shared/types";

// ---------------------------------------------------------------------------
// Fonts — DM Sans from local /fonts/ (bundled in public/)
// ---------------------------------------------------------------------------
Font.register({
  family: "DM Sans",
  fonts: [
    { src: "/fonts/DMSans-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/DMSans-Medium.ttf", fontWeight: 500 },
    { src: "/fonts/DMSans-SemiBold.ttf", fontWeight: 600 },
    { src: "/fonts/DMSans-Bold.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

// ---------------------------------------------------------------------------
// Brand palette (matches SharedReport)
// ---------------------------------------------------------------------------
const NAVY = "#001278";
const BLUE_DEEP = "#0339AF";
const BLUE = "#02a2fd";
const GREEN = "#36bf78";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const SLATE_900 = "#0f172a";
const SLATE_800 = "#1e293b";
const SLATE_700 = "#334155";
const SLATE_600 = "#475569";
const SLATE_500 = "#64748b";
const SLATE_400 = "#94a3b8";
const SLATE_300 = "#cbd5e1";
const SLATE_200 = "#e2e8f0";
const SLATE_100 = "#f1f5f9";
const SLATE_50 = "#f8fafc";
const WHITE = "#ffffff";

const LOGO_BLUE_URL = "/blueally-logo.png";
const LOGO_WHITE_URL = "/blueally-logo-white.png";

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------
const s = StyleSheet.create({
  // Pages
  page: {
    fontFamily: "DM Sans",
    fontSize: 10,
    paddingTop: 64,
    paddingBottom: 52,
    paddingHorizontal: 36,
    color: SLATE_900,
    backgroundColor: WHITE,
  },
  cover: {
    fontFamily: "DM Sans",
    backgroundColor: NAVY,
    color: WHITE,
    padding: 56,
  },

  // Page header / footer (fixed)
  header: {
    position: "absolute",
    top: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
    paddingBottom: 8,
  },
  headerLogo: { width: 78, height: "auto" as any },
  headerLabel: { fontSize: 8, color: SLATE_500 },

  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: SLATE_100,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: SLATE_500 },
  pageNum: { fontSize: 7, color: SLATE_500 },

  // Cover
  coverLogo: { width: 180, marginBottom: 24, alignSelf: "center" },
  coverEyebrow: {
    color: BLUE,
    fontSize: 11,
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 28,
  },
  coverTitle: {
    fontSize: 30,
    fontWeight: 700,
    color: WHITE,
    textAlign: "center",
    lineHeight: 1.2,
  },
  coverCompany: {
    fontSize: 18,
    fontWeight: 600,
    color: "#bfdbfe",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 36,
  },
  coverMetricsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 36,
    marginTop: 16,
  },
  coverMetricLabel: {
    fontSize: 9,
    color: "#93c5fd",
    textTransform: "uppercase",
    letterSpacing: 1.6,
    textAlign: "center",
  },
  coverMetricValue: {
    fontSize: 30,
    fontWeight: 700,
    color: WHITE,
    marginTop: 4,
    textAlign: "center",
  },
  coverDate: {
    fontSize: 10,
    color: "#cbd5e1",
    textAlign: "center",
    marginTop: 48,
  },
  coverConfidential: {
    position: "absolute",
    bottom: 36,
    left: 56,
    right: 56,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#475569",
    paddingTop: 10,
  },

  // Section
  section: { marginBottom: 18 },
  h2: {
    fontSize: 18,
    fontWeight: 700,
    color: SLATE_800,
    marginBottom: 4,
  },
  h3: {
    fontSize: 11,
    fontWeight: 600,
    color: SLATE_700,
    marginBottom: 8,
    marginTop: 10,
  },
  lede: { fontSize: 9, color: SLATE_500, marginBottom: 10 },

  // KPI grid
  kpiGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 8,
    padding: 10,
  },
  kpiIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  kpiIconText: { fontSize: 12, fontWeight: 700 },
  kpiValue: {
    fontSize: 18,
    fontWeight: 700,
    color: SLATE_900,
  },
  kpiLabel: {
    fontSize: 8,
    color: SLATE_500,
    marginTop: 2,
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 6,
    overflow: "hidden",
  },
  thRow: {
    flexDirection: "row",
    backgroundColor: SLATE_50,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: SLATE_200,
  },
  th: {
    fontSize: 8,
    fontWeight: 600,
    color: SLATE_500,
    textTransform: "uppercase",
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: SLATE_100,
  },
  trAlt: { backgroundColor: SLATE_50 },
  tdRoot: { fontSize: 9, color: SLATE_700 },
  tdName: { fontSize: 9, fontWeight: 500, color: SLATE_800 },
  num: { fontSize: 9, color: SLATE_700, textAlign: "right" },
  numStrong: { fontSize: 9, fontWeight: 600, color: SLATE_800, textAlign: "right" },
  ctr: { fontSize: 9, textAlign: "center", color: SLATE_700 },
  tfootRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: SLATE_50,
    borderTopWidth: 1,
    borderTopColor: SLATE_300,
  },
  tfootCell: { fontSize: 9, fontWeight: 600, color: SLATE_900 },

  // Status badges
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    fontSize: 8,
    fontWeight: 500,
  },
  badgeHigh: { backgroundColor: "#d1fae5", color: "#065f46" },
  badgeMedium: { backgroundColor: "#dbeafe", color: "#1e40af" },
  badgeLow: { backgroundColor: "#fef3c7", color: "#92400e" },
  badgeMapped: { backgroundColor: SLATE_100, color: SLATE_600 },

  // Workflow card
  wfCard: {
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 8,
    marginBottom: 10,
    overflow: "hidden",
  },
  wfHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: SLATE_100,
  },
  wfTitle: { flex: 1, fontSize: 11, fontWeight: 600, color: SLATE_800 },
  wfPattern: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 999,
    backgroundColor: BLUE,
    color: WHITE,
    fontSize: 8,
    fontWeight: 500,
  },
  wfBody: { padding: 12 },

  metricGrid: { flexDirection: "row", gap: 6, marginBottom: 10 },
  metricBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 6,
    padding: 8,
    minHeight: 64,
  },
  metricBoxLabel: {
    fontSize: 7,
    fontWeight: 500,
    color: SLATE_500,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metricBoxValues: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 3 },
  metricBefore: { fontSize: 8, color: SLATE_600 },
  metricArrow: { fontSize: 8, color: SLATE_400 },
  metricAfter: { fontSize: 8, color: SLATE_900, fontWeight: 600 },
  metricImp: { fontSize: 7, color: GREEN, fontWeight: 600, marginTop: "auto" as any },

  stepGrid: { flexDirection: "row", gap: 6, marginBottom: 10 },
  stepCell: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: SLATE_50,
    borderWidth: 1,
    borderColor: SLATE_100,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  stepValue: { fontSize: 14, fontWeight: 700, color: SLATE_800 },
  stepLabel: { fontSize: 7, color: SLATE_500 },

  procGrid: { flexDirection: "row", gap: 12, marginTop: 6 },
  procCol: { flex: 1 },
  procLabel: {
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 999,
    fontSize: 7,
    fontWeight: 600,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  procLabelCurrent: { backgroundColor: SLATE_100, color: SLATE_600 },
  procLabelTarget: { backgroundColor: GREEN, color: WHITE },
  node: {
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: SLATE_100,
    borderRadius: 6,
    padding: 6,
    marginBottom: 2,
  },
  nodeCurrent: { backgroundColor: SLATE_50 },
  nodeTarget: { backgroundColor: WHITE },
  nodeCircle: {
    width: 14,
    height: 14,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
  },
  nodeCircleText: { fontSize: 7, fontWeight: 700 },
  nodeBody: { flex: 1 },
  nodeName: { fontSize: 8, fontWeight: 500, color: SLATE_800 },
  nodeChips: { fontSize: 7, color: SLATE_500, marginTop: 2 },
  nodeBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 3, marginTop: 3 },
  nodeBadge: { paddingHorizontal: 5, paddingVertical: 0.5, borderRadius: 999, fontSize: 6.5, fontWeight: 500 },

  // Assessment
  overall: {
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 8,
    padding: 22,
    alignItems: "center",
    marginBottom: 12,
  },
  overallLabel: {
    fontSize: 8,
    color: SLATE_500,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  overallPct: { fontSize: 42, fontWeight: 700 },
  overallBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    color: WHITE,
    fontSize: 10,
    fontWeight: 600,
    marginTop: 6,
  },
  overallDesc: { fontSize: 9, color: SLATE_600, textAlign: "center", marginTop: 8, maxWidth: 360 },
  overallCompletion: { fontSize: 8, color: SLATE_400, marginTop: 4 },

  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  catCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 8,
    padding: 10,
  },
  catHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  catTitle: { fontSize: 10, fontWeight: 600, color: SLATE_800, flex: 1 },
  catScore: { fontSize: 16, fontWeight: 700 },
  catBadge: {
    paddingHorizontal: 6,
    paddingVertical: 0.5,
    borderRadius: 999,
    fontSize: 7,
    fontWeight: 600,
    color: WHITE,
    alignSelf: "flex-end",
  },
  catProgTrack: { height: 4, backgroundColor: SLATE_100, borderRadius: 999, overflow: "hidden", marginVertical: 4 },
  catProgFill: { height: "100%" as any, borderRadius: 999 },
  catSubRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  catSubLabel: { fontSize: 7, color: SLATE_500, flex: 1 },
  catSubTrack: { width: 56, height: 3, backgroundColor: SLATE_100, borderRadius: 999, overflow: "hidden" },
  catSubFill: { height: "100%" as any, borderRadius: 999 },
  catSubScore: { fontSize: 7, fontWeight: 500, width: 22, textAlign: "right" },
  catDesc: { fontSize: 7, color: SLATE_500, fontStyle: "italic", marginTop: 6 },

  // Gap pills
  gapPill: {
    paddingHorizontal: 6,
    paddingVertical: 0.5,
    borderRadius: 999,
    color: WHITE,
    fontSize: 8,
    fontWeight: 700,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseDurationToHours(duration: string | undefined | null): number {
  if (!duration || duration === "--") return 0;
  const lower = String(duration).toLowerCase().trim();
  const num = parseFloat(lower.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return 0;
  if (lower.includes("day")) return num * 8;
  if (lower.includes("hour") || lower.includes("hr")) return num;
  if (lower.includes("min")) return num / 60;
  if (lower.includes("sec")) return num / 3600;
  if (lower.includes("week")) return num * 40;
  return num;
}

function cleanMetric(v: string | undefined | null): string {
  if (!v) return "";
  return String(v).replace(/[\n\r]+/g, " ").trim();
}

interface UCRow {
  useCaseId: string;
  useCaseName: string;
  currentHours: number;
  targetHours: number;
  hoursSaved: number;
  costSaved: number;
  automationPct: number;
  status: "High Impact" | "Medium Impact" | "Low Impact" | "Mapped";
}

function rowOf(wf: WorkflowMap): UCRow {
  const cur = (wf.currentState || []) as any[];
  const tgt = (wf.targetState || []) as any[];
  let ch = 0, th = 0, ai = 0;
  for (const n of cur) ch += parseDurationToHours(n.duration);
  for (const n of tgt) {
    th += parseDurationToHours(n.duration);
    if (n.isAIEnabled) ai++;
  }
  const cm = (wf as any).comparisonMetrics;
  let costSaved = 0;
  if (cm?.costReduction) {
    const before = parseCurrencyString(cm.costReduction.before || "0");
    const after = parseCurrencyString(cm.costReduction.after || "0");
    costSaved = Math.max(0, before - after);
  }
  let status: UCRow["status"] = "Mapped";
  if (cm?.timeReduction?.improvement) {
    const imp = parseFloat(String(cm.timeReduction.improvement).replace(/[^0-9.]/g, ""));
    if (!isNaN(imp)) {
      if (imp >= 70) status = "High Impact";
      else if (imp >= 40) status = "Medium Impact";
      else status = "Low Impact";
    }
  }
  return {
    useCaseId: wf.useCaseId,
    useCaseName: wf.useCaseName,
    currentHours: ch,
    targetHours: th,
    hoursSaved: Math.max(0, ch - th),
    costSaved,
    automationPct: tgt.length > 0 ? (ai / tgt.length) * 100 : 0,
    status,
  };
}

function actorGlyph(actorType: string | undefined): string {
  if (actorType === "ai_agent" || actorType === "ai") return "AI";
  if (actorType === "human") return "H";
  return "S";
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------
function PageHeader({ companyName }: { companyName: string }) {
  return (
    <View style={s.header} fixed>
      <Image src={LOGO_BLUE_URL} style={s.headerLogo} />
      <Text style={s.headerLabel}>{companyName} — AI Workflow Assessment</Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>Confidential — BlueAlly Technology Solutions</Text>
      <Text
        style={s.pageNum}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function CoverPage({
  companyName,
  generatedAt,
  totalHoursSaved,
  totalCostSaved,
}: {
  companyName: string;
  generatedAt: string;
  totalHoursSaved: number;
  totalCostSaved: number;
}) {
  return (
    <Page size="A4" style={s.cover}>
      <View style={{ marginTop: 60 }}>
        <Image src={LOGO_WHITE_URL} style={s.coverLogo} />
      </View>
      <Text style={s.coverEyebrow}>AI CONSULTING</Text>
      <Text style={s.coverTitle}>AI Workflow Orchestration</Text>
      <Text style={s.coverTitle}>Assessment Report</Text>
      <Text style={s.coverCompany}>{companyName}</Text>
      <View style={s.coverMetricsRow}>
        <View>
          <Text style={s.coverMetricLabel}>Total Hours Saved</Text>
          <Text style={s.coverMetricValue}>
            {Math.round(totalHoursSaved).toLocaleString()}
          </Text>
        </View>
        <View>
          <Text style={s.coverMetricLabel}>Total Cost Saved</Text>
          <Text style={s.coverMetricValue}>{formatCurrency(totalCostSaved)}</Text>
        </View>
      </View>
      <Text style={s.coverDate}>{generatedAt}</Text>
      <Text style={s.coverConfidential}>
        This document contains proprietary and confidential information.
        Distribution is limited to authorized personnel only.
      </Text>
    </Page>
  );
}

function KpiCard({
  iconText,
  iconColor,
  value,
  label,
}: {
  iconText: string;
  iconColor: string;
  value: string;
  label: string;
}) {
  return (
    <View style={s.kpiCard} wrap={false}>
      <View style={[s.kpiIcon, { backgroundColor: `${iconColor}1F` }]}>
        <Text style={[s.kpiIconText, { color: iconColor }]}>{iconText}</Text>
      </View>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiLabel}>{label}</Text>
    </View>
  );
}

function ExecutiveSnapshotPage({
  companyName,
  rows,
  totalHoursSaved,
  totalCostSaved,
  avgAutomation,
}: {
  companyName: string;
  rows: UCRow[];
  totalHoursSaved: number;
  totalCostSaved: number;
  avgAutomation: number;
}) {
  const totals = {
    cur: rows.reduce((s, r) => s + r.currentHours, 0),
    tgt: rows.reduce((s, r) => s + r.targetHours, 0),
    saved: rows.reduce((s, r) => s + r.hoursSaved, 0),
    cost: rows.reduce((s, r) => s + r.costSaved, 0),
    aut:
      rows.length > 0
        ? rows.reduce((s, r) => s + r.automationPct, 0) / rows.length
        : 0,
  };
  const widths = ["32%", "12%", "12%", "12%", "13%", "10%", "9%"];
  const statusStyle = (st: UCRow["status"]) => {
    switch (st) {
      case "High Impact":
        return s.badgeHigh;
      case "Medium Impact":
        return s.badgeMedium;
      case "Low Impact":
        return s.badgeLow;
      default:
        return s.badgeMapped;
    }
  };

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader companyName={companyName} />

      <View style={s.section} wrap={false}>
        <Text style={s.h2}>Executive Snapshot</Text>
        <Text style={s.lede}>
          Aggregate impact across the mapped use cases and AI-enabled workflows.
        </Text>
      </View>

      <View style={s.kpiGrid} wrap={false}>
        <KpiCard
          iconText="H"
          iconColor={BLUE}
          value={Math.round(totalHoursSaved).toLocaleString()}
          label="Hours Saved"
        />
        <KpiCard
          iconText="$"
          iconColor={GREEN}
          value={formatCurrency(totalCostSaved)}
          label="Cost Saved"
        />
        <KpiCard
          iconText="A"
          iconColor={AMBER}
          value={`${Math.round(avgAutomation)}%`}
          label="Avg Automation"
        />
        <KpiCard
          iconText="W"
          iconColor={NAVY}
          value={String(rows.length)}
          label="Workflows Mapped"
        />
      </View>

      <View style={s.section}>
        <Text style={s.h3}>Use Case Benefits</Text>
        <View style={s.table}>
          <View style={s.thRow} fixed>
            <Text style={[s.th, { width: widths[0] }]}>Use Case</Text>
            <Text style={[s.th, { width: widths[1], textAlign: "right" }]}>Current Hrs</Text>
            <Text style={[s.th, { width: widths[2], textAlign: "right" }]}>Target Hrs</Text>
            <Text style={[s.th, { width: widths[3], textAlign: "right" }]}>Hours Saved</Text>
            <Text style={[s.th, { width: widths[4], textAlign: "right" }]}>Cost Saved</Text>
            <Text style={[s.th, { width: widths[5], textAlign: "right" }]}>Auto</Text>
            <Text style={[s.th, { width: widths[6], textAlign: "center" }]}>Status</Text>
          </View>
          {rows.map((r, i) => (
            <View key={r.useCaseId || i} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]} wrap={false}>
              <Text style={[s.tdName, { width: widths[0] }]}>{r.useCaseName || "—"}</Text>
              <Text style={[s.num, { width: widths[1] }]}>{Math.round(r.currentHours).toLocaleString()}</Text>
              <Text style={[s.num, { width: widths[2] }]}>{Math.round(r.targetHours).toLocaleString()}</Text>
              <Text style={[s.numStrong, { width: widths[3] }]}>{Math.round(r.hoursSaved).toLocaleString()}</Text>
              <Text style={[s.numStrong, { width: widths[4] }]}>{formatCurrency(r.costSaved)}</Text>
              <Text style={[s.num, { width: widths[5] }]}>{Math.round(r.automationPct)}%</Text>
              <View style={{ width: widths[6], alignItems: "center" }}>
                <Text style={[s.badge, statusStyle(r.status)]}>{r.status}</Text>
              </View>
            </View>
          ))}
          <View style={s.tfootRow} wrap={false}>
            <Text style={[s.tfootCell, { width: widths[0] }]}>Total</Text>
            <Text style={[s.tfootCell, { width: widths[1], textAlign: "right" }]}>
              {Math.round(totals.cur).toLocaleString()}
            </Text>
            <Text style={[s.tfootCell, { width: widths[2], textAlign: "right" }]}>
              {Math.round(totals.tgt).toLocaleString()}
            </Text>
            <Text style={[s.tfootCell, { width: widths[3], textAlign: "right" }]}>
              {Math.round(totals.saved).toLocaleString()}
            </Text>
            <Text style={[s.tfootCell, { width: widths[4], textAlign: "right" }]}>
              {formatCurrency(totals.cost)}
            </Text>
            <Text style={[s.tfootCell, { width: widths[5], textAlign: "right" }]}>
              {Math.round(totals.aut)}%
            </Text>
            <Text style={[s.tfootCell, { width: widths[6] }]}></Text>
          </View>
        </View>
      </View>

      <PageFooter />
    </Page>
  );
}

function WorkflowCard({ wf }: { wf: WorkflowMap }) {
  const cm = (wf as any).comparisonMetrics || {};
  const pattern = getPatternById((wf as any).agenticPattern || "");
  const cur = (wf.currentState || []) as any[];
  const tgt = (wf.targetState || []) as any[];
  const aiSteps = tgt.filter((n) => n.isAIEnabled).length;
  const hitlSteps = tgt.filter((n) => n.isHumanInTheLoop).length;

  const metric = (label: string, m: any) => {
    const b = cleanMetric(m?.before);
    const a = cleanMetric(m?.after);
    const imp = cleanMetric(m?.improvement);
    return (
      <View style={s.metricBox} key={label}>
        <Text style={s.metricBoxLabel}>{label}</Text>
        <View style={s.metricBoxValues}>
          <Text style={s.metricBefore}>{b || "—"}</Text>
          <Text style={s.metricArrow}>→</Text>
          <Text style={s.metricAfter}>{a || "—"}</Text>
        </View>
        {imp && imp !== "N/A" ? (
          <Text style={s.metricImp}>
            {imp.toLowerCase().includes("improvement") ? imp : `${imp} improvement`}
          </Text>
        ) : (
          <Text style={[s.metricImp, { color: "transparent" }]}>·</Text>
        )}
      </View>
    );
  };

  const stepCell = (label: string, val: number, glyph: string, color: string) => (
    <View style={s.stepCell} key={label}>
      <View style={[s.nodeCircle, { backgroundColor: color, width: 18, height: 18 }]}>
        <Text style={[s.nodeCircleText, { color: WHITE, fontSize: 8 }]}>{glyph}</Text>
      </View>
      <View>
        <Text style={s.stepValue}>{val}</Text>
        <Text style={s.stepLabel}>{label}</Text>
      </View>
    </View>
  );

  const renderNode = (node: any, idx: number, target: boolean) => {
    const circleBg = target
      ? node.isAIEnabled
        ? GREEN
        : SLATE_400
      : SLATE_200;
    const circleColor = target ? WHITE : SLATE_700;
    const badges: { label: string; bg: string; fg: string }[] = [];
    if (!target && node.isBottleneck) {
      badges.push({ label: "Bottleneck", bg: "#fee2e2", fg: "#991b1b" });
    }
    if (target) {
      if (node.isAIEnabled)
        badges.push({ label: "AI-Enabled", bg: "#d1fae5", fg: "#065f46" });
      if (node.automationLevel && node.automationLevel !== "manual")
        badges.push({ label: String(node.automationLevel), bg: "#dbeafe", fg: "#1e40af" });
      if (node.isHumanInTheLoop)
        badges.push({ label: "HITL", bg: "#fef3c7", fg: "#92400e" });
    }
    const chipParts: string[] = [];
    chipParts.push(`${actorGlyph(node.actorType)} ${node.actorName || node.actorType || ""}`);
    if (node.duration) chipParts.push(node.duration);
    if (node.systems && node.systems.length > 0)
      chipParts.push((node.systems as string[]).join(", "));

    return (
      <View key={node.id || idx} style={[s.node, target ? s.nodeTarget : s.nodeCurrent]} wrap={false}>
        <View style={[s.nodeCircle, { backgroundColor: circleBg }]}>
          <Text style={[s.nodeCircleText, { color: circleColor }]}>
            {node.stepNumber || idx + 1}
          </Text>
        </View>
        <View style={s.nodeBody}>
          <Text style={s.nodeName}>{node.name || ""}</Text>
          <Text style={s.nodeChips}>{chipParts.join(" | ")}</Text>
          {badges.length > 0 && (
            <View style={s.nodeBadgeRow}>
              {badges.map((b, bi) => (
                <Text
                  key={bi}
                  style={[s.nodeBadge, { backgroundColor: b.bg, color: b.fg }]}
                >
                  {b.label}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={s.wfCard} wrap={false}>
      <View style={s.wfHeader}>
        <Text style={s.wfTitle}>{wf.useCaseName || "Workflow"}</Text>
        {pattern && (
          <Text style={s.wfPattern}>{pattern.name.split("(")[0].trim()}</Text>
        )}
      </View>
      <View style={s.wfBody}>
        <View style={s.metricGrid}>
          {metric("Time", cm.timeReduction)}
          {metric("Cost", cm.costReduction)}
          {metric("Quality", cm.qualityImprovement)}
          {metric("Throughput", cm.throughputIncrease)}
        </View>
        <View style={s.stepGrid}>
          {stepCell("Current Steps", cur.length, "S", SLATE_500)}
          {stepCell("Target Steps", tgt.length, "S", SLATE_500)}
          {stepCell("AI-Enabled", aiSteps, "AI", GREEN)}
          {stepCell("HITL Checkpoints", hitlSteps, "H", AMBER)}
        </View>
        {(cur.length > 0 || tgt.length > 0) && (
          <View>
            <Text style={s.h3}>Process Comparison</Text>
            <View style={s.procGrid}>
              <View style={s.procCol}>
                <Text style={[s.procLabel, s.procLabelCurrent]}>Current Process</Text>
                {cur.map((n, i) => renderNode(n, i, false))}
              </View>
              <View style={s.procCol}>
                <Text style={[s.procLabel, s.procLabelTarget]}>AI-Powered Process</Text>
                {tgt.map((n, i) => renderNode(n, i, true))}
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

function WorkflowsPage({
  companyName,
  workflows,
}: {
  companyName: string;
  workflows: WorkflowMap[];
}) {
  if (workflows.length === 0) return null;
  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader companyName={companyName} />
      <View style={s.section} wrap={false}>
        <Text style={s.h2}>Workflow Transformations</Text>
        <Text style={s.lede}>
          End-to-end process redesign for each prioritized use case, with
          before/after metrics and step-by-step orchestration.
        </Text>
      </View>
      {workflows.map((wf) => (
        <WorkflowCard key={wf.useCaseId} wf={wf} />
      ))}
      <PageFooter />
    </Page>
  );
}

interface SystemRow {
  name: string;
  useCases: string[];
  totalStepReferences: number;
  integrationTypes: string[];
}

function SystemsPage({
  companyName,
  systems,
}: {
  companyName: string;
  systems: SystemRow[];
}) {
  if (systems.length === 0) return null;
  const top = systems.slice(0, 20);
  const widths = ["6%", "44%", "12%", "12%", "26%"];
  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader companyName={companyName} />
      <View style={s.section} wrap={false}>
        <Text style={s.h2}>Systems, Data &amp; Integrations</Text>
        <Text style={s.lede}>
          Systems appearing in multiple use cases represent shared infrastructure
          that can accelerate implementation.
        </Text>
      </View>
      <View style={s.table}>
        <View style={s.thRow} fixed>
          <Text style={[s.th, { width: widths[0] }]}>#</Text>
          <Text style={[s.th, { width: widths[1] }]}>System</Text>
          <Text style={[s.th, { width: widths[2], textAlign: "right" }]}>Use Cases</Text>
          <Text style={[s.th, { width: widths[3], textAlign: "right" }]}>Step Refs</Text>
          <Text style={[s.th, { width: widths[4] }]}>Integration</Text>
        </View>
        {top.map((sys, i) => (
          <View key={sys.name} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]} wrap={false}>
            <Text style={[s.ctr, { width: widths[0], color: SLATE_400 }]}>{i + 1}</Text>
            <Text style={[s.tdName, { width: widths[1] }]}>{sys.name}</Text>
            <Text style={[s.num, { width: widths[2] }]}>{sys.useCases.length}</Text>
            <Text style={[s.num, { width: widths[3] }]}>{sys.totalStepReferences}</Text>
            <Text style={[s.tdRoot, { width: widths[4], fontSize: 8, color: SLATE_500 }]}>
              {sys.integrationTypes.length > 0
                ? sys.integrationTypes.map((t) => t.replace(/_/g, " ")).join(", ")
                : "—"}
            </Text>
          </View>
        ))}
      </View>
      <PageFooter />
    </Page>
  );
}

function CategoryCard({ cat }: { cat: CategoryScore }) {
  const meta = CATEGORY_METADATA[cat.category];
  const th = ASSESSMENT_STATUS_THRESHOLDS.find((t) => cat.percentage >= t.min);
  const pct = Math.round(cat.percentage * 100);
  return (
    <View style={s.catCard} wrap={false}>
      <View style={s.catHeader}>
        <View
          style={[
            s.kpiIcon,
            { backgroundColor: `${meta.color}25`, width: 22, height: 22, marginBottom: 0 },
          ]}
        >
          <Text style={[s.kpiIconText, { color: meta.color, fontSize: 10 }]}>
            {meta.icon[0]}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.catTitle}>{meta.label}</Text>
          <Text style={{ fontSize: 8, color: SLATE_500 }}>
            {cat.answeredCount}/{cat.questionCount} answered
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.catScore, { color: th?.color }]}>{pct}%</Text>
          {th && (
            <Text style={[s.catBadge, { backgroundColor: th.color }]}>{th.label}</Text>
          )}
        </View>
      </View>
      <View style={s.catProgTrack}>
        <View
          style={[s.catProgFill, { width: `${pct}%`, backgroundColor: th?.color }]}
        />
      </View>
      {cat.subCategories.map((sub) => {
        const subPct = Math.round(sub.percentage * 100);
        const subTh = ASSESSMENT_STATUS_THRESHOLDS.find((t) => sub.percentage >= t.min);
        return (
          <View key={sub.subCategory} style={s.catSubRow}>
            <Text style={s.catSubLabel}>{sub.subCategory}</Text>
            <View style={s.catSubTrack}>
              <View
                style={[s.catSubFill, { width: `${subPct}%`, backgroundColor: subTh?.color }]}
              />
            </View>
            <Text style={[s.catSubScore, { color: subTh?.color }]}>{subPct}%</Text>
          </View>
        );
      })}
      {cat.statusDescription && (
        <Text style={s.catDesc}>{cat.statusDescription}</Text>
      )}
    </View>
  );
}

function AssessmentPage({
  companyName,
  assessment,
  resolveUcName,
}: {
  companyName: string;
  assessment: AssessmentData;
  resolveUcName: (id: string) => string;
}) {
  const scores = assessment.scores;
  if (!scores) return null;
  const overallPct = Math.round(scores.overallPercentage * 100);
  const overallTh = ASSESSMENT_STATUS_THRESHOLDS.find(
    (t) => scores.overallPercentage >= t.min,
  );

  const allGaps = scores.useCaseScores
    .flatMap((uc: UseCaseAssessmentScore) =>
      uc.gaps.map((g) => ({ ...g, useCaseName: resolveUcName(uc.useCaseName) })),
    )
    .sort((a, b) => b.gapSize - a.gapSize)
    .slice(0, 5);

  const gapWidths = ["32%", "16%", "10%", "10%", "10%", "22%"];
  const ucWidths = ["46%", "22%", "16%", "16%"];

  return (
    <Page size="A4" style={s.page} wrap>
      <PageHeader companyName={companyName} />
      <View style={s.section} wrap={false}>
        <Text style={s.h2}>AI Readiness Assessment</Text>
        <Text style={s.lede}>
          Organizational readiness across skills, data, infrastructure, and
          governance dimensions.
        </Text>
      </View>

      <View style={s.overall} wrap={false}>
        <Text style={s.overallLabel}>Overall AI Readiness</Text>
        <Text style={[s.overallPct, { color: overallTh?.color }]}>{overallPct}%</Text>
        {overallTh && (
          <Text style={[s.overallBadge, { backgroundColor: overallTh.color }]}>
            {overallTh.label}
          </Text>
        )}
        {scores.overallStatusDescription && (
          <Text style={s.overallDesc}>{scores.overallStatusDescription}</Text>
        )}
        <Text style={s.overallCompletion}>
          {scores.answeredQuestions} of {scores.totalQuestions} questions answered
          ({Math.round(scores.completionPercentage * 100)}% complete)
        </Text>
      </View>

      <View style={s.catGrid}>
        {scores.categories.map((cat) => (
          <CategoryCard key={cat.category} cat={cat} />
        ))}
      </View>

      {allGaps.length > 0 && (
        <View style={s.section}>
          <Text style={s.h3}>Top Readiness Gaps</Text>
          <View style={s.table}>
            <View style={s.thRow} fixed>
              <Text style={[s.th, { width: gapWidths[0] }]}>Area</Text>
              <Text style={[s.th, { width: gapWidths[1] }]}>Category</Text>
              <Text style={[s.th, { width: gapWidths[2], textAlign: "center" }]}>Current</Text>
              <Text style={[s.th, { width: gapWidths[3], textAlign: "center" }]}>Target</Text>
              <Text style={[s.th, { width: gapWidths[4], textAlign: "center" }]}>Gap</Text>
              <Text style={[s.th, { width: gapWidths[5] }]}>Use Case</Text>
            </View>
            {allGaps.map((g, i) => {
              const meta = CATEGORY_METADATA[g.category];
              const color = g.gapSize >= 3 ? RED : g.gapSize >= 2 ? AMBER : BLUE;
              return (
                <View key={i} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]} wrap={false}>
                  <View style={{ width: gapWidths[0] }}>
                    <Text style={s.tdName}>{g.questionText}</Text>
                    <Text style={{ fontSize: 7, color: SLATE_400, marginTop: 1 }}>
                      {g.subCategory}
                    </Text>
                  </View>
                  <Text style={[s.tdRoot, { width: gapWidths[1], color: meta?.color, fontWeight: 500 }]}>
                    {meta?.label || g.category}
                  </Text>
                  <Text style={[s.ctr, { width: gapWidths[2] }]}>{g.currentScore}</Text>
                  <Text style={[s.ctr, { width: gapWidths[3] }]}>{g.targetScore}</Text>
                  <View style={{ width: gapWidths[4], alignItems: "center" }}>
                    <Text style={[s.gapPill, { backgroundColor: color }]}>{g.gapSize}</Text>
                  </View>
                  <Text style={[s.tdRoot, { width: gapWidths[5], fontSize: 8, color: SLATE_500 }]}>
                    {g.useCaseName}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {scores.useCaseScores.length > 0 && (
        <View style={s.section}>
          <Text style={s.h3}>Use Case Readiness</Text>
          <View style={s.table}>
            <View style={s.thRow} fixed>
              <Text style={[s.th, { width: ucWidths[0] }]}>Use Case</Text>
              <Text style={[s.th, { width: ucWidths[1], textAlign: "center" }]}>Status</Text>
              <Text style={[s.th, { width: ucWidths[2], textAlign: "center" }]}>Questions</Text>
              <Text style={[s.th, { width: ucWidths[3], textAlign: "center" }]}>Gaps</Text>
            </View>
            {scores.useCaseScores.map((uc, i) => {
              const ucTh = ASSESSMENT_STATUS_THRESHOLDS.find(
                (t) => uc.percentage >= t.min,
              );
              const ucPct = Math.round(uc.percentage * 100);
              return (
                <React.Fragment key={uc.useCaseId}>
                  <View style={[s.tr, i % 2 === 1 ? s.trAlt : {}]} wrap={false}>
                    <Text style={[s.tdName, { width: ucWidths[0] }]}>
                      {resolveUcName(uc.useCaseName)}{" "}
                      <Text style={{ color: SLATE_400, fontSize: 8, fontWeight: 400 }}>
                        ({ucPct}%)
                      </Text>
                    </Text>
                    <View style={{ width: ucWidths[1], alignItems: "center" }}>
                      <Text
                        style={[s.badge, { backgroundColor: ucTh?.color, color: WHITE }]}
                      >
                        {ucTh?.label}
                      </Text>
                    </View>
                    <Text style={[s.ctr, { width: ucWidths[2] }]}>{uc.mappedQuestionIds.length}</Text>
                    <View style={{ width: ucWidths[3], alignItems: "center" }}>
                      {uc.gaps.length > 0 ? (
                        <Text
                          style={[
                            s.badge,
                            { backgroundColor: "#fee2e2", color: "#b91c1c" },
                          ]}
                        >
                          {uc.gaps.length}
                        </Text>
                      ) : (
                        <Text style={[s.tdRoot, { color: GREEN, fontWeight: 600 }]}>
                          OK
                        </Text>
                      )}
                    </View>
                  </View>
                  {uc.gaps.length > 0 &&
                    uc.gaps.map((gap, gi) => {
                      const sev = gap.gapSize >= 3 ? RED : gap.gapSize >= 2 ? AMBER : BLUE;
                      const tip = gap.tip || assessment.gapGuidance?.[gap.questionId] || "";
                      return (
                        <View
                          key={gi}
                          style={{
                            paddingVertical: 4,
                            paddingLeft: 24,
                            paddingRight: 8,
                            backgroundColor: SLATE_50,
                            borderBottomWidth: 0.5,
                            borderBottomColor: SLATE_100,
                          }}
                          wrap={false}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              marginBottom: 2,
                              flexWrap: "wrap",
                            }}
                          >
                            <Text
                              style={[
                                s.gapPill,
                                { backgroundColor: sev, fontSize: 7 },
                              ]}
                            >
                              Gap: {gap.gapSize}
                            </Text>
                            <Text
                              style={{
                                fontSize: 7,
                                fontWeight: 600,
                                color: SLATE_600,
                                textTransform: "capitalize",
                              }}
                            >
                              {gap.category}
                            </Text>
                            <Text style={{ fontSize: 7, color: SLATE_400 }}>|</Text>
                            <Text style={{ fontSize: 7, color: SLATE_500 }}>
                              {gap.subCategory}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 8, color: SLATE_700 }}>
                            {gap.questionText}
                          </Text>
                          {tip && (
                            <Text
                              style={{
                                fontSize: 7,
                                color: SLATE_500,
                                fontStyle: "italic",
                                marginTop: 2,
                                paddingLeft: 6,
                                borderLeftWidth: 1,
                                borderLeftColor: SLATE_300,
                              }}
                            >
                              {tip}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </View>
        </View>
      )}

      <PageFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Props (kept compatible with Dashboard's existing call site)
// ---------------------------------------------------------------------------
export interface PDFReportProps {
  companyName: string;
  generatedAt: string;
  useCases: any[];
  benefits: any[];
  readiness: any[];
  priorities: any[];
  workflowMaps: any[];
  strategicThemes: any[];
  frictionPoints: any[];
  executiveDashboard: any;
  assessment?: AssessmentData | null;
}

// ---------------------------------------------------------------------------
// Systems aggregation (small, pure)
// ---------------------------------------------------------------------------
function aggregateSystems(workflowMaps: WorkflowMap[]): SystemRow[] {
  const m = new Map<
    string,
    { useCases: Set<string>; refs: number; intg: Set<string> }
  >();
  for (const wf of workflowMaps) {
    const all = [
      ...((wf.currentState as any[]) || []),
      ...((wf.targetState as any[]) || []),
    ];
    for (const node of all) {
      const names = new Set<string>();
      for (const sysName of (node.systems || []) as string[]) {
        if (sysName) names.add(sysName);
      }
      for (const sd of ((node as any).systemDetails || []) as any[]) {
        if (sd?.name) names.add(sd.name);
      }
      for (const name of names) {
        if (!m.has(name))
          m.set(name, { useCases: new Set(), refs: 0, intg: new Set() });
        const entry = m.get(name)!;
        entry.useCases.add(wf.useCaseName);
        entry.refs += 1;
        for (const sd of ((node as any).systemDetails || []) as any[]) {
          if (sd?.name === name && sd?.integrationType) {
            entry.intg.add(String(sd.integrationType));
          }
        }
      }
    }
  }
  return [...m.entries()]
    .map(([name, v]) => ({
      name,
      useCases: [...v.useCases],
      totalStepReferences: v.refs,
      integrationTypes: [...v.intg],
    }))
    .sort(
      (a, b) =>
        b.useCases.length - a.useCases.length ||
        b.totalStepReferences - a.totalStepReferences,
    );
}

// ---------------------------------------------------------------------------
// Main Document
// ---------------------------------------------------------------------------
export function PDFReport(props: PDFReportProps) {
  const workflows = (props.workflowMaps || []) as WorkflowMap[];
  const rows = workflows.map(rowOf);
  const totalHoursSaved = rows.reduce((s, r) => s + r.hoursSaved, 0);
  const totalCostSaved = rows.reduce((s, r) => s + r.costSaved, 0);
  const avgAutomation =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.automationPct, 0) / rows.length
      : 0;
  const systems = aggregateSystems(workflows);

  const ucNameMap = new Map<string, string>();
  for (const uc of props.useCases || []) {
    if (uc.id && uc.name) ucNameMap.set(uc.id, uc.name);
  }
  for (const wf of workflows) {
    if (wf.useCaseId && wf.useCaseName) ucNameMap.set(wf.useCaseId, wf.useCaseName);
  }
  const resolveUcName = (id: string) => ucNameMap.get(id) || id;

  return (
    <Document
      title={`${props.companyName} — AI Workflow Assessment`}
      author="BlueAlly Technology Solutions"
      subject="AI Workflow Orchestration Assessment"
    >
      <CoverPage
        companyName={props.companyName}
        generatedAt={props.generatedAt}
        totalHoursSaved={totalHoursSaved}
        totalCostSaved={totalCostSaved}
      />
      <ExecutiveSnapshotPage
        companyName={props.companyName}
        rows={rows}
        totalHoursSaved={totalHoursSaved}
        totalCostSaved={totalCostSaved}
        avgAutomation={avgAutomation}
      />
      {workflows.length > 0 && (
        <WorkflowsPage companyName={props.companyName} workflows={workflows} />
      )}
      {systems.length > 0 && (
        <SystemsPage companyName={props.companyName} systems={systems} />
      )}
      {props.assessment?.scores && (
        <AssessmentPage
          companyName={props.companyName}
          assessment={props.assessment}
          resolveUcName={resolveUcName}
        />
      )}
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Blob helper (used by Dashboard)
// ---------------------------------------------------------------------------
export async function generatePDFBlob(props: PDFReportProps): Promise<Blob> {
  const doc = <PDFReport {...props} />;
  const blob = await pdf(doc).toBlob();
  return blob;
}
