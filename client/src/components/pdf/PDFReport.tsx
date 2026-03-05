import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";

// ---------------------------------------------------------------------------
// Font registration — DM Sans from Google Fonts CDN
// ---------------------------------------------------------------------------
Font.register({
  family: "DM Sans",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAkJxhTmHvol6e.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAop1hTmHvol6e.ttf",
      fontWeight: 500,
    },
    {
      src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAXpphTmHvol6e.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/dmsans/v15/rP2tp2ywxg089UriI5-g4vlH9VoD8CmcqZG40F9JadbnoEwAZ5phTmHvol6e.ttf",
      fontWeight: 700,
    },
  ],
});

// ---------------------------------------------------------------------------
// Brand palette
// ---------------------------------------------------------------------------
const NAVY = "#001278";
const BLUE = "#02a2fd";
const GREEN = "#36bf78";
const GRAY = "#6b7280";
const LIGHT_GRAY = "#f3f4f6";

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
  headerLogo: {
    fontSize: 14,
    fontWeight: 700,
    color: NAVY,
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
  coverLogo: {
    fontSize: 36,
    fontWeight: 700,
    color: "white",
    marginBottom: 8,
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
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function parseCurrency(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/[$,\s]/g, "");
  if (clean.endsWith("M")) return parseFloat(clean) * 1_000_000;
  if (clean.endsWith("K")) return parseFloat(clean) * 1_000;
  if (clean.endsWith("B")) return parseFloat(clean) * 1_000_000_000;
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
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
      <Text style={styles.headerLogo}>BlueAlly</Text>
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
      <Text style={styles.coverLogo}>BlueAlly</Text>
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

      {workflowMaps.slice(0, 8).map((wf: any, idx: number) => {
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
      <ExecutiveSummaryPage props={props} />
      <UseCasesPage props={props} />
      <BenefitsPage props={props} />
      <WorkflowsPage props={props} />
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
