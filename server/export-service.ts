import ExcelJS from "exceljs";
import type { Project, Scenario } from "@shared/schema";
import { formatCurrency } from "@shared/formulas";

// =========================================================================
// EXCEL EXPORT
// =========================================================================

export async function generateExcelReport(
  project: Project,
  scenario: Scenario,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BlueAlly AI Workflow";
  workbook.created = new Date();

  const themes = (scenario.strategicThemes || []) as any[];
  const functions = (scenario.businessFunctions || []) as any[];
  const friction = (scenario.frictionPoints || []) as any[];
  const useCases = (scenario.useCases || []) as any[];
  const benefits = (scenario.benefits || []) as any[];
  const readiness = (scenario.readiness || []) as any[];
  const priorities = (scenario.priorities || []) as any[];

  // --- Executive Summary sheet ---
  const summarySheet = workbook.addWorksheet("Executive Summary");
  summarySheet.columns = [
    { header: "Field", key: "field", width: 30 },
    { header: "Value", key: "value", width: 80 },
  ];
  styleHeader(summarySheet);
  summarySheet.addRows([
    { field: "Company", value: project.companyName },
    { field: "Industry", value: project.industry },
    { field: "Scenario", value: scenario.name },
    { field: "Total Use Cases", value: useCases.length },
    { field: "Total Strategic Themes", value: themes.length },
  ]);

  // --- Strategic Themes sheet ---
  const themeSheet = workbook.addWorksheet("Strategic Themes");
  themeSheet.columns = [
    { header: "Theme", key: "name", width: 35 },
    { header: "Current State", key: "current", width: 50 },
    { header: "Target State", key: "target", width: 50 },
    { header: "Primary Driver", key: "primary", width: 25 },
    { header: "Secondary Driver", key: "secondary", width: 25 },
  ];
  styleHeader(themeSheet);
  themes.forEach((t) =>
    themeSheet.addRow({
      name: t.name,
      current: t.currentState,
      target: t.targetState,
      primary: t.primaryDriverImpact,
      secondary: t.secondaryDriver,
    }),
  );

  // --- Business Functions sheet ---
  const funcSheet = workbook.addWorksheet("Business Functions & KPIs");
  funcSheet.columns = [
    { header: "Function", key: "fn", width: 20 },
    { header: "KPI", key: "kpi", width: 30 },
    { header: "Baseline", key: "baseline", width: 15 },
    { header: "Target", key: "target", width: 15 },
    { header: "Direction", key: "dir", width: 8 },
    { header: "Timeframe", key: "time", width: 12 },
    { header: "Theme", key: "theme", width: 35 },
  ];
  styleHeader(funcSheet);
  functions.forEach((f) =>
    funcSheet.addRow({
      fn: f.function,
      kpi: f.kpiName,
      baseline: f.baselineValue,
      target: f.targetValue,
      dir: f.direction,
      time: f.timeframe,
      theme: f.strategicTheme,
    }),
  );

  // --- Friction Points sheet ---
  const frictionSheet = workbook.addWorksheet("Friction Points");
  frictionSheet.columns = [
    { header: "Role", key: "role", width: 20 },
    { header: "Function", key: "fn", width: 20 },
    { header: "Friction Point", key: "friction", width: 50 },
    { header: "Severity", key: "severity", width: 10 },
    { header: "Annual Hours", key: "hours", width: 12 },
    { header: "Hourly Rate", key: "rate", width: 12 },
    { header: "Est. Annual Cost", key: "cost", width: 15 },
  ];
  styleHeader(frictionSheet);
  friction.forEach((f) =>
    frictionSheet.addRow({
      role: f.role,
      fn: f.function,
      friction: f.frictionPoint,
      severity: f.severity,
      hours: f.annualHours,
      rate: `$${f.hourlyRate}`,
      cost: f.estimatedAnnualCost,
    }),
  );

  // --- Use Cases sheet ---
  const ucSheet = workbook.addWorksheet("AI Use Cases");
  ucSheet.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Use Case", key: "name", width: 35 },
    { header: "Function", key: "fn", width: 20 },
    { header: "AI Primitives", key: "primitives", width: 30 },
    { header: "Agentic Pattern", key: "pattern", width: 25 },
    { header: "Theme", key: "theme", width: 30 },
  ];
  styleHeader(ucSheet);
  useCases.forEach((u) =>
    ucSheet.addRow({
      id: u.id,
      name: u.name,
      fn: u.function,
      primitives: (u.aiPrimitives || []).join(", "),
      pattern: u.agenticPattern || "—",
      theme: u.strategicTheme,
    }),
  );

  // --- Benefits sheet ---
  const benSheet = workbook.addWorksheet("Benefits Quantification");
  benSheet.columns = [
    { header: "Use Case", key: "uc", width: 35 },
    { header: "Cost Benefit", key: "cost", width: 15 },
    { header: "Revenue Benefit", key: "rev", width: 15 },
    { header: "Risk Benefit", key: "risk", width: 15 },
    { header: "Cash Flow", key: "cf", width: 15 },
    { header: "Total Annual", key: "total", width: 15 },
    { header: "Expected Value", key: "ev", width: 15 },
    { header: "Prob. Success", key: "prob", width: 12 },
  ];
  styleHeader(benSheet);
  benefits.forEach((b) =>
    benSheet.addRow({
      uc: b.useCaseName,
      cost: b.costBenefit,
      rev: b.revenueBenefit,
      risk: b.riskBenefit,
      cf: b.cashFlowBenefit,
      total: b.totalAnnualValue,
      ev: b.expectedValue,
      prob: `${(b.probabilityOfSuccess * 100).toFixed(0)}%`,
    }),
  );

  // --- Priority sheet ---
  const prioSheet = workbook.addWorksheet("Priority Roadmap");
  prioSheet.columns = [
    { header: "Use Case", key: "uc", width: 35 },
    { header: "Value Score", key: "value", width: 12 },
    { header: "Readiness", key: "readiness", width: 12 },
    { header: "Priority", key: "priority", width: 12 },
    { header: "Tier", key: "tier", width: 20 },
    { header: "Phase", key: "phase", width: 8 },
  ];
  styleHeader(prioSheet);
  priorities.forEach((p) =>
    prioSheet.addRow({
      uc: p.useCaseName,
      value: p.valueScore,
      readiness: p.readinessScore,
      priority: p.priorityScore,
      tier: p.priorityTier,
      phase: p.recommendedPhase,
    }),
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// =========================================================================
// HTML REPORT (self-contained, print-to-PDF)
// =========================================================================

export function generateHTMLReport(
  project: Project,
  scenario: Scenario,
): string {
  const themes = (scenario.strategicThemes || []) as any[];
  const functions = (scenario.businessFunctions || []) as any[];
  const friction = (scenario.frictionPoints || []) as any[];
  const useCases = (scenario.useCases || []) as any[];
  const benefits = (scenario.benefits || []) as any[];
  const readiness = (scenario.readiness || []) as any[];
  const priorities = (scenario.priorities || []) as any[];
  const workflows = (scenario.workflowMaps || []) as any[];
  const dashboard = scenario.executiveDashboard as any;
  const summary = scenario.executiveSummary as any;
  const scenarioData = scenario.scenarioAnalysis as any;

  const totalValue = dashboard?.totalAnnualValue
    ? formatCurrency(dashboard.totalAnnualValue)
    : "N/A";
  const totalCost = dashboard?.totalCostBenefit
    ? formatCurrency(dashboard.totalCostBenefit)
    : "N/A";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${project.companyName} — AI Workflow Assessment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; max-width: 1000px; margin: 0 auto; background: #fff; }
    h1 { font-size: 28px; color: #001278; margin-bottom: 4px; }
    h2 { font-size: 20px; color: #001278; margin: 36px 0 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
    h3 { font-size: 16px; margin: 16px 0 8px; color: #334155; }
    p { margin-bottom: 8px; font-size: 14px; }
    .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
    .brand-logo { width: 40px; height: 40px; background: linear-gradient(135deg, #001278, #02a2fd); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; }
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .card-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
    .card-value { font-size: 24px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; font-size: 13px; }
    th { background: #001278; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-high { background: #fef3c7; color: #92400e; }
    .badge-medium { background: #dbeafe; color: #1e40af; }
    .tier-1 { color: #166534; font-weight: 600; }
    .tier-2 { color: #1e40af; font-weight: 600; }
    .tier-3 { color: #92400e; font-weight: 600; }
    .tier-4 { color: #64748b; }
    .workflow-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0; }
    .workflow-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .workflow-box h4 { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
    .metric-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0; }
    .metric { text-align: center; padding: 8px; background: #f8fafc; border-radius: 6px; }
    .metric-label { font-size: 10px; color: #94a3b8; }
    .metric-value { font-size: 14px; font-weight: 600; color: #001278; }
    .metric-improvement { font-size: 11px; color: #36bf78; font-weight: 600; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="brand">
    <div class="brand-logo">BA</div>
    <div>
      <h1>${project.companyName}</h1>
      <p class="subtitle">AI Workflow Assessment &mdash; ${scenario.name} &mdash; Generated by BlueAlly</p>
    </div>
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-label">Use Cases</div>
      <div class="card-value" style="color:#001278">${useCases.length}</div>
    </div>
    <div class="card">
      <div class="card-label">Strategic Themes</div>
      <div class="card-value" style="color:#02a2fd">${themes.length}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Annual Value</div>
      <div class="card-value" style="color:#36bf78">${totalValue}</div>
    </div>
    <div class="card">
      <div class="card-label">Cost Savings</div>
      <div class="card-value" style="color:#7c3aed">${totalCost}</div>
    </div>
  </div>

  ${summary?.headline ? `<h2>Executive Summary</h2><p><strong>${summary.headline}</strong></p><p>${summary.context || ""}</p>` : ""}

  <h2>Strategic Themes</h2>
  <table>
    <tr><th>Theme</th><th>Current State</th><th>Target State</th><th>Primary Driver</th></tr>
    ${themes.map((t: any) => `<tr><td><strong>${t.name}</strong></td><td>${t.currentState}</td><td>${t.targetState}</td><td>${t.primaryDriverImpact}</td></tr>`).join("")}
  </table>

  <h2>Business Functions & KPIs</h2>
  <table>
    <tr><th>Function</th><th>KPI</th><th>Baseline</th><th>Target</th><th>Direction</th><th>Timeframe</th></tr>
    ${functions.map((f: any) => `<tr><td>${f.function}</td><td>${f.kpiName}</td><td>${f.baselineValue}</td><td>${f.targetValue}</td><td>${f.direction}</td><td>${f.timeframe}</td></tr>`).join("")}
  </table>

  <h2>Friction Point Mapping</h2>
  <table>
    <tr><th>Role</th><th>Friction Point</th><th>Severity</th><th>Annual Hours</th><th>Est. Cost</th></tr>
    ${friction.map((f: any) => `<tr><td>${f.role}</td><td>${f.frictionPoint}</td><td><span class="badge badge-${f.severity?.toLowerCase()}">${f.severity}</span></td><td>${f.annualHours?.toLocaleString()}</td><td>${f.estimatedAnnualCost}</td></tr>`).join("")}
  </table>

  <h2>AI Use Cases</h2>
  <table>
    <tr><th>ID</th><th>Use Case</th><th>Function</th><th>AI Primitives</th><th>Agentic Pattern</th></tr>
    ${useCases.map((u: any) => `<tr><td>${u.id}</td><td>${u.name}</td><td>${u.function}</td><td>${(u.aiPrimitives || []).join(", ")}</td><td>${u.agenticPattern || "—"}</td></tr>`).join("")}
  </table>

  <h2>Benefits Quantification</h2>
  <table>
    <tr><th>Use Case</th><th>Cost</th><th>Revenue</th><th>Risk</th><th>Cash Flow</th><th>Total Annual</th><th>Expected Value</th></tr>
    ${benefits.map((b: any) => `<tr><td>${b.useCaseName}</td><td>${b.costBenefit}</td><td>${b.revenueBenefit}</td><td>${b.riskBenefit}</td><td>${b.cashFlowBenefit}</td><td>${b.totalAnnualValue}</td><td>${b.expectedValue}</td></tr>`).join("")}
  </table>

  ${workflows.length > 0 ? `
  <h2>Workflow Comparisons</h2>
  ${workflows.map((w: any) => {
    const m = w.comparisonMetrics || {};
    const getImprovement = (metric: any) => typeof metric === "string" ? metric : metric?.improvement || "";
    const getAfter = (metric: any) => typeof metric === "string" ? metric : metric?.after || "—";
    return `
    <h3>${w.useCaseName} — ${w.agenticPattern || "Standard"}</h3>
    <div class="metric-bar">
      <div class="metric">
        <div class="metric-label">Time Reduction</div>
        <div class="metric-value">${getAfter(m.timeReduction)}</div>
        <div class="metric-improvement">${getImprovement(m.timeReduction)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Cost Reduction</div>
        <div class="metric-value">${getAfter(m.costReduction)}</div>
        <div class="metric-improvement">${getImprovement(m.costReduction)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Quality</div>
        <div class="metric-value">${getAfter(m.qualityImprovement)}</div>
        <div class="metric-improvement">${getImprovement(m.qualityImprovement)}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Throughput</div>
        <div class="metric-value">${getAfter(m.throughputIncrease)}</div>
        <div class="metric-improvement">${getImprovement(m.throughputIncrease)}</div>
      </div>
    </div>
    <div class="workflow-compare">
      <div class="workflow-box">
        <h4 style="color:#991b1b;">Current Process</h4>
        ${(w.currentState || []).map((step: any, i: number) => `
          <div style="padding:8px;margin-bottom:4px;border-left:3px solid ${step.isBottleneck ? '#ef4444' : '#e2e8f0'};background:${step.isBottleneck ? '#fef2f2' : '#f8fafc'};border-radius:4px;">
            <div style="font-size:12px;font-weight:600;">${i+1}. ${step.name}</div>
            <div style="font-size:11px;color:#64748b;">${step.actorName || step.actorType} &middot; ${step.duration}</div>
            ${step.painPoints?.length ? `<div style="font-size:10px;color:#ef4444;margin-top:2px;">${step.painPoints.join(", ")}</div>` : ""}
          </div>
        `).join("")}
      </div>
      <div class="workflow-box">
        <h4 style="color:#166534;">AI-Powered Process</h4>
        ${(w.targetState || []).map((step: any, i: number) => `
          <div style="padding:8px;margin-bottom:4px;border-left:3px solid ${step.isAIEnabled ? '#36bf78' : '#e2e8f0'};background:${step.isAIEnabled ? '#f0fdf4' : '#f8fafc'};border-radius:4px;">
            <div style="font-size:12px;font-weight:600;">${i+1}. ${step.name}</div>
            <div style="font-size:11px;color:#64748b;">${step.actorName || step.actorType} &middot; ${step.duration} ${step.isHumanInTheLoop ? '<span style="color:#d97706;font-weight:600;">HITL</span>' : ""}</div>
            ${step.aiCapabilities?.length ? `<div style="font-size:10px;color:#36bf78;margin-top:2px;">${step.aiCapabilities.join(", ")}</div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
    `;
  }).join("")}
  ` : ""}

  <h2>Priority Roadmap</h2>
  <table>
    <tr><th>Use Case</th><th>Value</th><th>Readiness</th><th>Priority</th><th>Tier</th><th>Phase</th></tr>
    ${priorities.map((p: any) => `<tr><td>${p.useCaseName}</td><td>${p.valueScore}</td><td>${p.readinessScore}</td><td>${p.priorityScore}</td><td><span class="${p.priorityTier?.includes("1") ? "tier-1" : p.priorityTier?.includes("2") ? "tier-2" : p.priorityTier?.includes("3") ? "tier-3" : "tier-4"}">${p.priorityTier}</span></td><td>${p.recommendedPhase}</td></tr>`).join("")}
  </table>

  ${scenarioData ? `
  <h2>Scenario Analysis</h2>
  <div class="cards" style="grid-template-columns: repeat(3, 1fr);">
    <div class="card">
      <div class="card-label">Conservative</div>
      <div class="card-value" style="color:#64748b; font-size:18px;">${scenarioData.conservative?.annualBenefit || "N/A"}</div>
      <div style="font-size:11px; color:#94a3b8;">NPV: ${scenarioData.conservative?.npv || "N/A"}</div>
    </div>
    <div class="card">
      <div class="card-label">Moderate</div>
      <div class="card-value" style="color:#001278; font-size:18px;">${scenarioData.moderate?.annualBenefit || "N/A"}</div>
      <div style="font-size:11px; color:#94a3b8;">NPV: ${scenarioData.moderate?.npv || "N/A"}</div>
    </div>
    <div class="card">
      <div class="card-label">Aggressive</div>
      <div class="card-value" style="color:#36bf78; font-size:18px;">${scenarioData.aggressive?.annualBenefit || "N/A"}</div>
      <div style="font-size:11px; color:#94a3b8;">NPV: ${scenarioData.aggressive?.npv || "N/A"}</div>
    </div>
  </div>
  ` : ""}

  ${readiness.length > 0 ? `
  <h2>Readiness &amp; Token Modeling</h2>
  <table>
    <tr><th>Use Case</th><th>Data</th><th>Tech</th><th>Org</th><th>Gov</th><th>Readiness</th><th>TTV (mo)</th><th>Monthly Tokens</th><th>Annual Token Cost</th></tr>
    ${readiness.map((r: any) => `<tr><td>${r.useCaseName}</td><td>${r.dataAvailability}</td><td>${r.technicalInfrastructure}</td><td>${r.organizationalCapacity}</td><td>${r.governance}</td><td><strong>${r.readinessScore?.toFixed?.(1) || r.readinessScore}</strong></td><td>${r.timeToValue}</td><td>${(r.monthlyTokens || 0).toLocaleString()}</td><td>${r.annualTokenCost || "—"}</td></tr>`).join("")}
  </table>
  ` : ""}

  <h2>Methodology &amp; Assumptions</h2>
  <div style="font-size:12px; color:#64748b; line-height:1.7;">
    <p><strong>Readiness Scoring:</strong> Organizational Capacity (30%), Data Availability (30%), Technical Infrastructure (20%), Governance (20%)</p>
    <p><strong>Priority Score:</strong> Readiness Score (50%) + Normalized Annual Value (50%)</p>
    <p><strong>Tier Assignment:</strong> Champions (Value&ge;5.5 &amp; Readiness&ge;5.5), Quick Wins (Value&lt;5.5 &amp; Readiness&ge;5.5), Strategic (Value&ge;5.5 &amp; Readiness&lt;5.5), Foundation (both&lt;5.5)</p>
    <p><strong>Benefit Categories:</strong> Cost Savings, Revenue Uplift, Risk Mitigation, Cash Flow Improvement</p>
    <p><strong>Scenarios:</strong> Conservative (&times;0.6), Base Case (as-calculated), Aggressive (&times;1.3)</p>
    <p><strong>Token Pricing:</strong> Input $3/1M tokens, Output $15/1M tokens (Claude Sonnet 4.5)</p>
  </div>

  <div class="footer">
    BlueAlly AI Workflow Assessment &mdash; ${project.companyName} &mdash; ${scenario.name} &mdash; ${new Date().toLocaleDateString()}
  </div>
</body>
</html>`;
}

// =========================================================================
// HELPERS
// =========================================================================

function styleHeader(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF001278" },
    };
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
    cell.alignment = { vertical: "middle" };
  });
  headerRow.height = 24;
}
