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

// ---------------------------------------------------------------------------
// Font registration — DM Sans from local static TTFs (bundled in public/fonts)
// CDN URLs break silently in production on Vercel, so we serve them locally.
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

// Prevent potential crashes from hyphenation in @react-pdf/renderer
Font.registerHyphenationCallback((word) => [word]);

// ---------------------------------------------------------------------------
// Brand palette
// ---------------------------------------------------------------------------
const NAVY = "#001278";
const BLUE = "#02a2fd";
const GREEN = "#36bf78";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";

// Logo URLs — local assets to avoid CORS issues in production
const LOGO_BLUE_URL = "/blueally-logo.png";
const LOGO_WHITE_URL = "/blueally-logo-white.png";

// ---------------------------------------------------------------------------
// Stylesheet
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  // -- Shared page layout --------------------------------------------------
  page: {
    fontFamily: "DM Sans",
    fontSize: 10,
    paddingTop: 60,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: "#1f2937",
  },
  header: {
    position: "absolute",
    top: 15,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: BLUE,
    paddingBottom: 8,
  },
  headerLogoImage: {
    width: 80,
    height: "auto" as any,
  },
  headerDate: {
    fontSize: 8,
    color: GRAY,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: LIGHT_GRAY,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: GRAY,
  },
  pageNumber: {
    fontSize: 7,
    color: GRAY,
  },

  // -- Cover page ----------------------------------------------------------
  coverPage: {
    fontFamily: "DM Sans",
    backgroundColor: NAVY,
    justifyContent: "center",
    alignItems: "center",
    padding: 60,
  },
  coverLogoImage: {
    width: 180,
    height: "auto" as any,
    marginBottom: 12,
  },
  coverSubtitle: {
    fontSize: 12,
    color: BLUE,
    marginBottom: 60,
    letterSpacing: 2,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 700,
    color: "white",
    textAlign: "center",
    marginBottom: 12,
  },
  coverCompany: {
    fontSize: 20,
    fontWeight: 600,
    color: BLUE,
    textAlign: "center",
    marginBottom: 40,
  },
  coverDate: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
  },
  coverConfidential: {
    position: "absolute",
    bottom: 40,
    left: 60,
    right: 60,
    textAlign: "center",
    fontSize: 8,
    color: "#6b7280",
    borderTopWidth: 1,
    borderTopColor: "#374151",
    paddingTop: 12,
  },

  // -- Section headings ----------------------------------------------------
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
    paddingBottom: 6,
  },
  subsectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: NAVY,
    marginBottom: 8,
    marginTop: 12,
  },

  // -- Tables --------------------------------------------------------------
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 2,
  },
  tableHeaderText: {
    color: "white",
    fontSize: 8,
    fontWeight: 600,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  tableRowAlt: {
    backgroundColor: "#f9fafb",
  },
  tableCellText: {
    fontSize: 8,
  },

  // -- Metric cards --------------------------------------------------------
  metricRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 700,
    color: NAVY,
  },
  metricLabel: {
    fontSize: 8,
    color: GRAY,
    marginTop: 4,
    textAlign: "center",
  },

  // -- Benefits rows -------------------------------------------------------
  benefitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  benefitLabel: {
    fontSize: 9,
    color: "#374151",
  },
  benefitValue: {
    fontSize: 9,
    fontWeight: 600,
  },

  // -- Workflow cards ------------------------------------------------------
  workflowCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
  },
  workflowTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: NAVY,
    marginBottom: 6,
  },
  workflowMetric: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },

  // -- Systems list --------------------------------------------------------
  systemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f3f4f6",
  },
  systemName: {
    fontSize: 8,
    color: "#374151",
  },
  systemBadge: {
    fontSize: 7,
    color: GRAY,
    backgroundColor: LIGHT_GRAY,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },

  // -- Misc ----------------------------------------------------------------
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#374151",
    marginBottom: 8,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrencyPdf(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function parseCurrency(val: string): number {
  if (!val) return 0;
  let clean = val.replace(/[$,\s]/g, "");
  clean = clean.replace(/\/(yr|year|mo|month|quarter|qtr|week|day|annual)$/i, "");
  clean = clean.replace(/per\s*(year|month|quarter|week|day|annum)$/i, "");
  clean = clean.replace(/(annually|monthly|yearly)$/i, "");
  if (/m$/i.test(clean)) return parseFloat(clean) * 1_000_000;
  if (/k$/i.test(clean)) return parseFloat(clean) * 1_000;
  if (/b$/i.test(clean)) return parseFloat(clean) * 1_000_000_000;
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function parseDurationToHours(duration: string): number {
  if (!duration || duration === "--") return 0;
  const lower = duration.toLowerCase().trim();
  const num = parseFloat(lower.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return 0;
  if (lower.includes("day")) return num * 8;
  if (lower.includes("hour") || lower.includes("hr")) return num;
  if (lower.includes("min")) return num / 60;
  if (lower.includes("sec")) return num / 3600;
  if (lower.includes("week")) return num * 40;
  return num;
}

// ---------------------------------------------------------------------------
// Props
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
}

// ---------------------------------------------------------------------------
// Shared header / footer (rendered on every content page via `fixed`)
// ---------------------------------------------------------------------------
function PageHeader({ companyName }: { companyName: string }) {
  return (
    <View style={styles.header} fixed>
      <Image src={LOGO_BLUE_URL} style={styles.headerLogoImage} />
      <Text style={styles.headerDate}>
        {companyName} — AI Workflow Assessment
      </Text>
    </View>
  );
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        Confidential — BlueAlly Technology Solutions
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cover Page
// ---------------------------------------------------------------------------
function CoverPage({
  companyName,
  generatedAt,
}: {
  companyName: string;
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <Image src={LOGO_WHITE_URL} style={styles.coverLogoImage} />
      <Text style={styles.coverSubtitle}>AI CONSULTING</Text>
      <Text style={styles.coverTitle}>AI Workflow Orchestration</Text>
      <Text style={styles.coverTitle}>Assessment Report</Text>
      <Text style={styles.coverCompany}>{companyName}</Text>
      <Text style={styles.coverDate}>{generatedAt}</Text>
      <Text style={styles.coverConfidential}>
        This document contains proprietary and confidential information.
        Distribution is limited to authorized personnel only.
      </Text>
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Workflow Impact Dashboard Page (NEW)
// ---------------------------------------------------------------------------
function DashboardMetricsPage({ props }: { props: PDFReportProps }) {
  const { workflowMaps } = props;
  if (!workflowMaps || workflowMaps.length === 0) return null;

  // Compute per-use-case metrics
  const rows = workflowMaps.map((wf: any) => {
    let currentHours = 0;
    let targetHours = 0;
    let aiEnabled = 0;
    const totalTarget = (wf.targetState || []).length;

    for (const n of (wf.currentState || [])) {
      currentHours += parseDurationToHours(n.duration);
    }
    for (const n of (wf.targetState || [])) {
      targetHours += parseDurationToHours(n.duration);
      if (n.isAIEnabled) aiEnabled++;
    }

    let costSaved = 0;
    if (wf.comparisonMetrics?.costReduction) {
      const before = parseCurrency(wf.comparisonMetrics.costReduction.before || "0");
      const after = parseCurrency(wf.comparisonMetrics.costReduction.after || "0");
      costSaved = Math.max(0, before - after);
    }

    return {
      name: wf.useCaseName || "—",
      currentHours,
      targetHours,
      hoursSaved: Math.max(0, currentHours - targetHours),
      costSaved,
      automationPct: totalTarget > 0 ? (aiEnabled / totalTarget) * 100 : 0,
    };
  });

  const totalHoursSaved = rows.reduce((s, r) => s + r.hoursSaved, 0);
  const totalCostSaved = rows.reduce((s, r) => s + r.costSaved, 0);
  const avgAutomation = rows.length > 0
    ? rows.reduce((s, r) => s + r.automationPct, 0) / rows.length
    : 0;

  const cols = [
    { label: "Use Case", width: "30%" as const },
    { label: "Current Hrs", width: "14%" as const },
    { label: "Target Hrs", width: "14%" as const },
    { label: "Hours Saved", width: "14%" as const },
    { label: "Cost Saved", width: "14%" as const },
    { label: "Automation", width: "14%" as const },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader companyName={props.companyName} />
      <Text style={styles.sectionTitle}>Workflow Impact Dashboard</Text>

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {Math.round(totalHoursSaved).toLocaleString()}
          </Text>
          <Text style={styles.metricLabel}>Hours Saved Per Cycle</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {formatCurrencyPdf(totalCostSaved)}
          </Text>
          <Text style={styles.metricLabel}>Annual Cost Savings</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{Math.round(avgAutomation)}%</Text>
          <Text style={styles.metricLabel}>AI Automation Rate</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{rows.length}</Text>
          <Text style={styles.metricLabel}>Use Cases Mapped</Text>
        </View>
      </View>

      <Text style={styles.subsectionTitle}>Per-Use-Case Breakdown</Text>

      <View style={styles.tableHeader}>
        {cols.map((c) => (
          <Text key={c.label} style={[styles.tableHeaderText, { width: c.width }]}>
            {c.label}
          </Text>
        ))}
      </View>

      {rows.map((r, i) => (
        <View
          key={`dm-${i}`}
          style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
          wrap={false}
        >
          <Text style={[styles.tableCellText, { width: "30%" }]}>{r.name}</Text>
          <Text style={[styles.tableCellText, { width: "14%", textAlign: "right" }]}>
            {Math.round(r.currentHours)}
          </Text>
          <Text style={[styles.tableCellText, { width: "14%", textAlign: "right" }]}>
            {Math.round(r.targetHours)}
          </Text>
          <Text style={[styles.tableCellText, { width: "14%", textAlign: "right", color: GREEN }]}>
            {Math.round(r.hoursSaved)}
          </Text>
          <Text style={[styles.tableCellText, { width: "14%", textAlign: "right", color: GREEN }]}>
            {formatCurrencyPdf(r.costSaved)}
          </Text>
          <Text style={[styles.tableCellText, { width: "14%", textAlign: "right" }]}>
            {Math.round(r.automationPct)}%
          </Text>
        </View>
      ))}

      <PageFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Systems & Integration Requirements Page (NEW)
// ---------------------------------------------------------------------------
function SystemsSummaryPage({ props }: { props: PDFReportProps }) {
  const { workflowMaps } = props;
  if (!workflowMaps || workflowMaps.length === 0) return null;

  const systemMap = new Map<string, Set<string>>();
  const integrationTypeMap = new Map<string, number>();
  const dataTypeMap = new Map<string, number>();

  for (const wf of workflowMaps) {
    const allNodes = [...(wf.currentState || []), ...(wf.targetState || [])];
    for (const node of allNodes) {
      for (const sys of (node.systems || [])) {
        if (!sys) continue;
        if (!systemMap.has(sys)) systemMap.set(sys, new Set());
        systemMap.get(sys)!.add(wf.useCaseName);
      }
      for (const sd of ((node as any).systemDetails || [])) {
        if (sd.name) {
          if (!systemMap.has(sd.name)) systemMap.set(sd.name, new Set());
          systemMap.get(sd.name)!.add(wf.useCaseName);
        }
        if (sd.integrationType) {
          integrationTypeMap.set(sd.integrationType, (integrationTypeMap.get(sd.integrationType) || 0) + 1);
        }
        if (sd.dataType) {
          dataTypeMap.set(sd.dataType, (dataTypeMap.get(sd.dataType) || 0) + 1);
        }
      }
    }
    for (const dt of (wf.dataTypes || [])) {
      if (dt) dataTypeMap.set(dt, (dataTypeMap.get(dt) || 0) + 1);
    }
    for (const ig of (wf.integrations || [])) {
      if (!ig) continue;
      if (!systemMap.has(ig)) systemMap.set(ig, new Set());
      systemMap.get(ig)!.add(wf.useCaseName);
    }
  }

  const systems = [...systemMap.entries()]
    .map(([name, ucSet]) => ({ name, count: ucSet.size }))
    .sort((a, b) => b.count - a.count);

  const integrationTypes = [...integrationTypeMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const dataTypes = [...dataTypeMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  if (systems.length === 0 && integrationTypes.length === 0 && dataTypes.length === 0) {
    return null;
  }

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader companyName={props.companyName} />
      <Text style={styles.sectionTitle}>Systems & Integration Requirements</Text>

      <Text style={styles.paragraph}>
        This section summarizes the systems, integration types, and data formats
        across all mapped workflows. Systems appearing in multiple use cases
        represent shared infrastructure that can accelerate implementation.
      </Text>

      <View style={{ flexDirection: "row", gap: 16 }}>
        {/* Systems column */}
        <View style={{ flex: 2 }}>
          <Text style={styles.subsectionTitle}>
            Systems ({systems.length})
          </Text>
          {systems.slice(0, 15).map((s, i) => (
            <View key={`sys-${i}`} style={styles.systemRow}>
              <Text style={styles.systemName}>{s.name}</Text>
              <Text style={styles.systemBadge}>
                {s.count} use case{s.count !== 1 ? "s" : ""}
              </Text>
            </View>
          ))}
        </View>

        {/* Right column: integration types + data types */}
        <View style={{ flex: 1 }}>
          {integrationTypes.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Integration Types</Text>
              {integrationTypes.map((it, i) => (
                <View key={`it-${i}`} style={styles.systemRow}>
                  <Text style={styles.systemName}>
                    {it.type.replace(/_/g, " ")}
                  </Text>
                  <Text style={styles.systemBadge}>{it.count}</Text>
                </View>
              ))}
            </>
          )}

          {dataTypes.length > 0 && (
            <>
              <Text style={[styles.subsectionTitle, { marginTop: 16 }]}>
                Data Types
              </Text>
              {dataTypes.map((dt, i) => (
                <View key={`dt-${i}`} style={styles.systemRow}>
                  <Text style={styles.systemName}>
                    {dt.type.replace(/_/g, " ")}
                  </Text>
                  <Text style={styles.systemBadge}>{dt.count}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      </View>

      <PageFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Executive Summary Page
// ---------------------------------------------------------------------------
function ExecutiveSummaryPage({ props }: { props: PDFReportProps }) {
  const { executiveDashboard, benefits, useCases, priorities } = props;

  const totalValue = executiveDashboard?.totalAnnualValue || 0;
  const totalCost = benefits.reduce(
    (s: number, b: any) => s + parseCurrency(b.costBenefit || ""),
    0,
  );
  const totalRevenue = benefits.reduce(
    (s: number, b: any) => s + parseCurrency(b.revenueBenefit || ""),
    0,
  );
  const totalRisk = benefits.reduce(
    (s: number, b: any) => s + parseCurrency(b.riskBenefit || ""),
    0,
  );
  const totalCashFlow = benefits.reduce(
    (s: number, b: any) => s + parseCurrency(b.cashFlowBenefit || ""),
    0,
  );
  const champCount = priorities.filter((p: any) =>
    p.priorityTier?.toLowerCase().includes("champion"),
  ).length;

  const breakdownItems = [
    { label: "Cost Savings", value: totalCost, color: GREEN },
    { label: "Revenue Growth", value: totalRevenue, color: BLUE },
    { label: "Risk Mitigation", value: totalRisk, color: "#f59e0b" },
    { label: "Cash Flow Improvement", value: totalCashFlow, color: NAVY },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader companyName={props.companyName} />
      <Text style={styles.sectionTitle}>Executive Summary</Text>

      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{useCases.length}</Text>
          <Text style={styles.metricLabel}>AI Use Cases</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {formatCurrencyPdf(totalValue)}
          </Text>
          <Text style={styles.metricLabel}>Total Annual Value</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{champCount}</Text>
          <Text style={styles.metricLabel}>Champions</Text>
        </View>
      </View>

      <Text style={styles.subsectionTitle}>Benefits Breakdown</Text>
      {breakdownItems.map((item) => (
        <View key={item.label} style={styles.benefitRow}>
          <Text style={styles.benefitLabel}>{item.label}</Text>
          <Text style={[styles.benefitValue, { color: item.color }]}>
            {formatCurrencyPdf(item.value)}
          </Text>
        </View>
      ))}

      <PageFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Top Use Cases Table Page
// ---------------------------------------------------------------------------
function UseCasesPage({ props }: { props: PDFReportProps }) {
  const { priorities, benefits, readiness } = props;
  if (!priorities || priorities.length === 0) return null;

  const sorted = [...priorities].sort(
    (a: any, b: any) => (b.priorityScore || 0) - (a.priorityScore || 0),
  );

  const cols = [
    { label: "#", width: "5%" as const },
    { label: "Use Case", width: "30%" as const },
    { label: "Annual Value", width: "15%" as const },
    { label: "Readiness", width: "12%" as const },
    { label: "Priority", width: "12%" as const },
    { label: "Tier", width: "13%" as const },
    { label: "Phase", width: "13%" as const },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader companyName={props.companyName} />
      <Text style={styles.sectionTitle}>Top Use Cases by Priority</Text>

      <View style={styles.tableHeader}>
        {cols.map((c) => (
          <Text
            key={c.label}
            style={[styles.tableHeaderText, { width: c.width }]}
          >
            {c.label}
          </Text>
        ))}
      </View>

      {sorted.slice(0, 15).map((p: any, i: number) => {
        const b = benefits.find((x: any) => x.useCaseId === p.useCaseId);
        const r = readiness.find((x: any) => x.useCaseId === p.useCaseId);

        return (
          <View
            key={p.useCaseId || `uc-${i}`}
            style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            <Text style={[styles.tableCellText, { width: "5%" }]}>
              {i + 1}
            </Text>
            <Text style={[styles.tableCellText, { width: "30%" }]}>
              {p.useCaseName || "—"}
            </Text>
            <Text
              style={[styles.tableCellText, { width: "15%", fontWeight: 600 }]}
            >
              {b
                ? formatCurrencyPdf(
                    parseCurrency(b.totalAnnualValue || b.expectedValue || ""),
                  )
                : "—"}
            </Text>
            <Text style={[styles.tableCellText, { width: "12%" }]}>
              {r ? `${(r.readinessScore * 10).toFixed(0)}%` : "—"}
            </Text>
            <Text
              style={[styles.tableCellText, { width: "12%", fontWeight: 600 }]}
            >
              {p.priorityScore?.toFixed(1) || "—"}
            </Text>
            <Text style={[styles.tableCellText, { width: "13%" }]}>
              {p.priorityTier || "—"}
            </Text>
            <Text style={[styles.tableCellText, { width: "13%" }]}>
              {p.recommendedPhase || "—"}
            </Text>
          </View>
        );
      })}

      <PageFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Benefits Breakdown Page
// ---------------------------------------------------------------------------
function BenefitsPage({ props }: { props: PDFReportProps }) {
  const { benefits } = props;
  if (!benefits || benefits.length === 0) return null;

  const cols = [
    { label: "Use Case", width: "28%" as const },
    { label: "Cost", width: "14%" as const },
    { label: "Revenue", width: "14%" as const },
    { label: "Risk", width: "14%" as const },
    { label: "Cash Flow", width: "14%" as const },
    { label: "Total", width: "16%" as const },
  ];

  return (
    <Page size="A4" style={styles.page} wrap>
      <PageHeader companyName={props.companyName} />
      <Text style={styles.sectionTitle}>Benefits Breakdown</Text>

      <View style={styles.tableHeader}>
        {cols.map((c) => (
          <Text
            key={c.label}
            style={[styles.tableHeaderText, { width: c.width }]}
          >
            {c.label}
          </Text>
        ))}
      </View>

      {benefits.map((b: any, i: number) => {
        const cost = parseCurrency(b.costBenefit || "");
        const rev = parseCurrency(b.revenueBenefit || "");
        const risk = parseCurrency(b.riskBenefit || "");
        const cf = parseCurrency(b.cashFlowBenefit || "");
        const total = parseCurrency(
          b.totalAnnualValue || b.expectedValue || "",
        );

        return (
          <View
            key={b.useCaseId || `ben-${i}`}
            style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
            wrap={false}
          >
            <Text style={[styles.tableCellText, { width: "28%" }]}>
              {b.useCaseName || "—"}
            </Text>
            <Text style={[styles.tableCellText, { width: "14%" }]}>
              {formatCurrencyPdf(cost)}
            </Text>
            <Text style={[styles.tableCellText, { width: "14%" }]}>
              {formatCurrencyPdf(rev)}
            </Text>
            <Text style={[styles.tableCellText, { width: "14%" }]}>
              {formatCurrencyPdf(risk)}
            </Text>
            <Text style={[styles.tableCellText, { width: "14%" }]}>
              {formatCurrencyPdf(cf)}
            </Text>
            <Text
              style={[styles.tableCellText, { width: "16%", fontWeight: 600 }]}
            >
              {formatCurrencyPdf(total || cost + rev + risk + cf)}
            </Text>
          </View>
        );
      })}

      <PageFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Workflow Summaries Page
// ---------------------------------------------------------------------------
function WorkflowsPage({ props }: { props: PDFReportProps }) {
  const { workflowMaps } = props;
  if (!workflowMaps || workflowMaps.length === 0) return null;

  return (
    <Page size="A4" style={styles.page} wrap>
      <PageHeader companyName={props.companyName} />
      <Text style={styles.sectionTitle}>Workflow Transformations</Text>

      {workflowMaps.slice(0, 10).map((wf: any, idx: number) => {
        const cm = wf.comparisonMetrics || {};
        const metricItems = [
          { label: "Time", data: cm.timeReduction },
          { label: "Cost", data: cm.costReduction },
          { label: "Quality", data: cm.qualityImprovement },
          { label: "Throughput", data: cm.throughputIncrease },
        ];

        return (
          <View
            key={wf.useCaseId || `wf-${idx}`}
            style={styles.workflowCard}
            wrap={false}
          >
            <Text style={styles.workflowTitle}>
              {wf.useCaseName || "Workflow"}
            </Text>
            {wf.agenticPattern && (
              <Text
                style={[styles.tableCellText, { color: GRAY, marginBottom: 6 }]}
              >
                Pattern: {wf.agenticPattern}
              </Text>
            )}
            <View style={{ flexDirection: "row", gap: 20 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.tableCellText,
                    { fontWeight: 600, marginBottom: 4 },
                  ]}
                >
                  Current → Target
                </Text>
                {metricItems.map((m) => (
                  <View key={m.label} style={styles.workflowMetric}>
                    <Text style={styles.tableCellText}>{m.label}</Text>
                    <Text style={styles.tableCellText}>
                      {m.data?.before || "—"} → {m.data?.after || "—"} (
                      {m.data?.improvement || "—"})
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ width: 100 }}>
                <Text
                  style={[
                    styles.tableCellText,
                    { fontWeight: 600, marginBottom: 4 },
                  ]}
                >
                  Steps
                </Text>
                <Text style={styles.tableCellText}>
                  Current: {wf.currentState?.length || 0}
                </Text>
                <Text style={styles.tableCellText}>
                  Target: {wf.targetState?.length || 0}
                </Text>
                <Text
                  style={[styles.tableCellText, { marginTop: 4, color: GREEN }]}
                >
                  HITL:{" "}
                  {
                    (wf.targetState || []).filter(
                      (n: any) => n.isHumanInTheLoop,
                    ).length
                  }
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      <PageFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Readiness Overview Page
// ---------------------------------------------------------------------------
function ReadinessPage({ props }: { props: PDFReportProps }) {
  const { readiness } = props;
  if (!readiness || readiness.length === 0) return null;

  const cols = [
    { label: "Use Case", width: "35%" as const },
    { label: "Data", width: "10%" as const },
    { label: "Tech", width: "10%" as const },
    { label: "Org", width: "10%" as const },
    { label: "Gov", width: "10%" as const },
    { label: "Score", width: "12%" as const },
    { label: "Token Cost", width: "13%" as const },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader companyName={props.companyName} />
      <Text style={styles.sectionTitle}>Readiness Assessment</Text>

      <View style={styles.tableHeader}>
        {cols.map((c) => (
          <Text
            key={c.label}
            style={[styles.tableHeaderText, { width: c.width }]}
          >
            {c.label}
          </Text>
        ))}
      </View>

      {readiness.map((r: any, i: number) => (
        <View
          key={r.useCaseId || `rd-${i}`}
          style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}
        >
          <Text style={[styles.tableCellText, { width: "35%" }]}>
            {r.useCaseName || "—"}
          </Text>
          <Text
            style={[
              styles.tableCellText,
              { width: "10%", textAlign: "center" },
            ]}
          >
            {r.dataAvailability ?? "—"}/10
          </Text>
          <Text
            style={[
              styles.tableCellText,
              { width: "10%", textAlign: "center" },
            ]}
          >
            {r.technicalInfrastructure ?? "—"}/10
          </Text>
          <Text
            style={[
              styles.tableCellText,
              { width: "10%", textAlign: "center" },
            ]}
          >
            {r.organizationalCapacity ?? "—"}/10
          </Text>
          <Text
            style={[
              styles.tableCellText,
              { width: "10%", textAlign: "center" },
            ]}
          >
            {r.governance ?? "—"}/10
          </Text>
          <Text
            style={[
              styles.tableCellText,
              { width: "12%", fontWeight: 600, textAlign: "center" },
            ]}
          >
            {r.readinessScore != null
              ? `${(r.readinessScore * 10).toFixed(0)}%`
              : "—"}
          </Text>
          <Text
            style={[
              styles.tableCellText,
              { width: "13%", textAlign: "right" },
            ]}
          >
            {r.annualTokenCost || "—"}
          </Text>
        </View>
      ))}

      <PageFooter />
    </Page>
  );
}

// ---------------------------------------------------------------------------
// Main Document
// ---------------------------------------------------------------------------
export function PDFReport(props: PDFReportProps) {
  return (
    <Document
      title={`${props.companyName} — AI Workflow Assessment`}
      author="BlueAlly Technology Solutions"
      subject="AI Workflow Orchestration Assessment"
    >
      <CoverPage
        companyName={props.companyName}
        generatedAt={props.generatedAt}
      />
      <DashboardMetricsPage props={props} />
      <ExecutiveSummaryPage props={props} />
      <UseCasesPage props={props} />
      <BenefitsPage props={props} />
      <WorkflowsPage props={props} />
      <SystemsSummaryPage props={props} />
      <ReadinessPage props={props} />
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Helper — generate a Blob for client-side download
// ---------------------------------------------------------------------------
export async function generatePDFBlob(props: PDFReportProps): Promise<Blob> {
  const doc = <PDFReport {...props} />;
  const blob = await pdf(doc).toBlob();
  return blob;
}
