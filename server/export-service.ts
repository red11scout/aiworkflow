import ExcelJS from "exceljs";
import type { Project, Scenario } from "@shared/schema";
import { formatCurrency, parseCurrencyString } from "@shared/formulas";

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
  const totalExpectedValue = dashboard?.totalExpectedValue
    ? formatCurrency(dashboard.totalExpectedValue)
    : benefits.length > 0
      ? formatCurrency(benefits.reduce((sum: number, b: any) => sum + parseCurrencyString(b.expectedValue || "$0"), 0))
      : "N/A";

  // Friction recovery data
  const totalFrictionCost = friction.reduce(
    (sum: number, f: any) => sum + parseCurrencyString(f.estimatedAnnualCost || "$0"), 0,
  );
  const frictionRecoveryRows = friction.map((fp: any) => {
    const fpCost = parseCurrencyString(fp.estimatedAnnualCost || "$0");
    const matchedUc = useCases.find((uc: any) => uc.targetFriction === fp.frictionPoint);
    const matchedBenefit = matchedUc
      ? benefits.find((b: any) => b.useCaseId === matchedUc.id)
      : null;
    const recoveryAmount = matchedBenefit
      ? parseCurrencyString(matchedBenefit.expectedValue || "$0")
      : 0;
    const recoveryPct = fpCost > 0 ? (recoveryAmount / fpCost) * 100 : 0;
    return {
      frictionPoint: fp.frictionPoint,
      annualCost: fpCost,
      mappedUseCase: matchedUc?.name || "Unmapped",
      recoveryAmount,
      recoveryPct,
    };
  });
  const totalRecovery = frictionRecoveryRows.reduce((s, r) => s + r.recoveryAmount, 0);

  // SVG bubble chart data
  const VALUE_THRESHOLD = 5.5;
  const READINESS_THRESHOLD = 5.5;
  const svgW = 480;
  const svgH = 340;
  const pad = { top: 20, right: 20, bottom: 36, left: 44 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;
  const bubbleData = priorities.map((p: any) => {
    const vs = p.valueScore || 0;
    const rs = p.readinessScore || 0;
    const x = pad.left + (rs / 10) * plotW;
    const y = pad.top + ((10 - vs) / 10) * plotH;
    let quadrant: string;
    let color: string;
    if (vs >= VALUE_THRESHOLD && rs >= READINESS_THRESHOLD) { quadrant = "Champions"; color = "#36bf78"; }
    else if (vs >= VALUE_THRESHOLD) { quadrant = "Strategic"; color = "#f59e0b"; }
    else if (rs >= READINESS_THRESHOLD) { quadrant = "Quick Wins"; color = "#02a2fd"; }
    else { quadrant = "Foundation"; color = "#94a3b8"; }
    return { id: p.useCaseId || p.id, name: p.useCaseName, x, y, vs, rs, quadrant, color };
  });

  // Quadrant background rects
  const threshX = pad.left + (READINESS_THRESHOLD / 10) * plotW;
  const threshY = pad.top + ((10 - VALUE_THRESHOLD) / 10) * plotH;

  const svgBubbleChart = priorities.length > 0 ? `
    <svg viewBox="0 0 ${svgW} ${svgH}" width="100%" style="max-width:${svgW}px; display:block; margin:0 auto;">
      <!-- Quadrant backgrounds -->
      <rect x="${pad.left}" y="${pad.top}" width="${threshX - pad.left}" height="${threshY - pad.top}" fill="#f59e0b" opacity="0.06"/>
      <rect x="${threshX}" y="${pad.top}" width="${pad.left + plotW - threshX}" height="${threshY - pad.top}" fill="#36bf78" opacity="0.06"/>
      <rect x="${pad.left}" y="${threshY}" width="${threshX - pad.left}" height="${pad.top + plotH - threshY}" fill="#94a3b8" opacity="0.06"/>
      <rect x="${threshX}" y="${threshY}" width="${pad.left + plotW - threshX}" height="${pad.top + plotH - threshY}" fill="#02a2fd" opacity="0.06"/>

      <!-- Threshold lines -->
      <line x1="${threshX}" y1="${pad.top}" x2="${threshX}" y2="${pad.top + plotH}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,3"/>
      <line x1="${pad.left}" y1="${threshY}" x2="${pad.left + plotW}" y2="${threshY}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,3"/>

      <!-- Axes -->
      <line x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" y2="${pad.top + plotH}" stroke="#94a3b8" stroke-width="1"/>
      <line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + plotH}" stroke="#94a3b8" stroke-width="1"/>

      <!-- X-axis ticks -->
      ${[0, 2, 4, 6, 8, 10].map(v => {
        const tx = pad.left + (v / 10) * plotW;
        return `<line x1="${tx}" y1="${pad.top + plotH}" x2="${tx}" y2="${pad.top + plotH + 4}" stroke="#94a3b8" stroke-width="0.5"/>
        <text x="${tx}" y="${pad.top + plotH + 16}" text-anchor="middle" font-size="10" fill="#64748b">${v}</text>`;
      }).join("")}

      <!-- Y-axis ticks -->
      ${[0, 2, 4, 6, 8, 10].map(v => {
        const ty = pad.top + ((10 - v) / 10) * plotH;
        return `<line x1="${pad.left - 4}" y1="${ty}" x2="${pad.left}" y2="${ty}" stroke="#94a3b8" stroke-width="0.5"/>
        <text x="${pad.left - 8}" y="${ty + 3}" text-anchor="end" font-size="10" fill="#64748b">${v}</text>`;
      }).join("")}

      <!-- Axis titles -->
      <text x="${pad.left + plotW / 2}" y="${svgH - 4}" text-anchor="middle" font-size="11" fill="#334155" font-weight="600">Readiness Score</text>
      <text x="12" y="${pad.top + plotH / 2}" text-anchor="middle" font-size="11" fill="#334155" font-weight="600" transform="rotate(-90, 12, ${pad.top + plotH / 2})">Value Score (EV / Friction Cost)</text>

      <!-- Quadrant labels -->
      <text x="${(pad.left + threshX) / 2}" y="${pad.top + 14}" text-anchor="middle" font-size="9" fill="#f59e0b" opacity="0.7" font-weight="600">STRATEGIC</text>
      <text x="${(threshX + pad.left + plotW) / 2}" y="${pad.top + 14}" text-anchor="middle" font-size="9" fill="#36bf78" opacity="0.7" font-weight="600">CHAMPIONS</text>
      <text x="${(pad.left + threshX) / 2}" y="${pad.top + plotH - 6}" text-anchor="middle" font-size="9" fill="#94a3b8" opacity="0.7" font-weight="600">FOUNDATION</text>
      <text x="${(threshX + pad.left + plotW) / 2}" y="${pad.top + plotH - 6}" text-anchor="middle" font-size="9" fill="#02a2fd" opacity="0.7" font-weight="600">QUICK WINS</text>

      <!-- Bubbles -->
      ${bubbleData.map(b => `
        <circle cx="${b.x}" cy="${b.y}" r="14" fill="${b.color}" opacity="0.85" stroke="white" stroke-width="1.5"/>
        <text x="${b.x}" y="${b.y + 3.5}" text-anchor="middle" font-size="7" fill="white" font-weight="700">${b.id}</text>
      `).join("")}
    </svg>
  ` : "";

  const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${project.companyName} &mdash; AI Workflow Assessment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.6; background: #fff; }
    .page { max-width: 960px; margin: 0 auto; padding: 0 40px; }
    h1 { font-size: 28px; color: #001278; margin-bottom: 4px; }
    h2 { font-size: 20px; color: #001278; margin: 40px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e2e8f0; }
    h2:first-child { margin-top: 0; }
    h3 { font-size: 16px; margin: 16px 0 8px; color: #334155; }
    p { margin-bottom: 8px; font-size: 14px; }
    a { color: #02a2fd; text-decoration: none; }

    /* Cover page */
    .cover { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; background: linear-gradient(135deg, #001278 0%, #02a2fd 60%, #36bf78 100%); color: white; padding: 60px 40px; }
    .cover-logo { width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; margin-bottom: 32px; backdrop-filter: blur(4px); }
    .cover h1 { font-size: 42px; color: white; margin-bottom: 8px; letter-spacing: -0.5px; }
    .cover .cover-subtitle { font-size: 18px; opacity: 0.85; margin-bottom: 48px; }
    .cover-meta { font-size: 13px; opacity: 0.7; }
    .cover-divider { width: 80px; height: 3px; background: rgba(255,255,255,0.4); border-radius: 2px; margin: 24px auto; }

    /* TOC */
    .toc { padding: 40px; }
    .toc h2 { border-bottom: none; margin-bottom: 16px; }
    .toc-list { list-style: none; font-size: 14px; }
    .toc-list li { padding: 6px 0; border-bottom: 1px dotted #e2e8f0; }
    .toc-list li a { color: #001278; font-weight: 500; }
    .toc-list li .toc-num { display: inline-block; width: 24px; color: #02a2fd; font-weight: 700; }

    /* Metric cards */
    .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .cards-3 { grid-template-columns: repeat(3, 1fr); }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; background: white; }
    .card-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .card-value { font-size: 24px; font-weight: 700; }
    .card-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }

    /* Tables */
    table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; font-size: 13px; }
    th { background: #001278; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f8fafc; }
    .right { text-align: right; }
    .center { text-align: center; }
    .bold { font-weight: 600; }
    .mono { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; }

    /* Badges */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-high { background: #fef3c7; color: #92400e; }
    .badge-medium { background: #dbeafe; color: #1e40af; }
    .badge-low { background: #f0fdf4; color: #166534; }
    .tier-champion { color: #166534; font-weight: 600; }
    .tier-strategic { color: #92400e; font-weight: 600; }
    .tier-quickwin { color: #1e40af; font-weight: 600; }
    .tier-foundation { color: #64748b; }

    /* Recovery bar */
    .recovery-bar { height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden; }
    .recovery-fill { height: 100%; border-radius: 3px; }

    /* Workflow section */
    .workflow-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0; }
    .workflow-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .workflow-box h4 { font-size: 13px; font-weight: 600; margin-bottom: 8px; }
    .metric-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 8px 0; }
    .metric { text-align: center; padding: 10px 8px; background: #f8fafc; border-radius: 6px; }
    .metric-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
    .metric-value { font-size: 15px; font-weight: 700; color: #001278; margin-top: 2px; }
    .metric-improvement { font-size: 11px; color: #36bf78; font-weight: 600; }

    /* Summary callout */
    .callout { padding: 16px 20px; border-radius: 8px; margin: 16px 0; font-size: 14px; line-height: 1.7; }
    .callout-blue { background: #eff6ff; border-left: 4px solid #02a2fd; }

    /* Footer */
    .footer { margin-top: 48px; padding: 16px 0; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }

    /* Print styles */
    @media print {
      body { font-size: 12px; }
      .page { padding: 0 20px; }
      .cover { min-height: auto; padding: 60px 20px; page-break-after: always; }
      .toc { page-break-after: always; }
      h2 { page-break-after: avoid; }
      table, .cards, .workflow-compare { page-break-inside: avoid; }
      .section { page-break-before: auto; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover">
    <div class="cover-logo">BA</div>
    <h1>${project.companyName}</h1>
    <div class="cover-subtitle">AI Workflow Assessment Report</div>
    <div class="cover-divider"></div>
    <div class="cover-meta">
      <div style="margin-bottom:4px;">${scenario.name}</div>
      <div>${reportDate}</div>
      <div style="margin-top:16px;opacity:0.5;">Powered by BlueAlly AI Workflow Orchestration</div>
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="page toc">
    <h2 id="toc">Table of Contents</h2>
    <ol class="toc-list">
      <li><span class="toc-num">1</span> <a href="#executive">Executive Summary</a></li>
      <li><span class="toc-num">2</span> <a href="#themes">Strategic Themes</a></li>
      <li><span class="toc-num">3</span> <a href="#functions">Business Functions &amp; KPIs</a></li>
      <li><span class="toc-num">4</span> <a href="#friction">Friction Point Mapping</a></li>
      <li><span class="toc-num">5</span> <a href="#usecases">AI Use Cases</a></li>
      <li><span class="toc-num">6</span> <a href="#benefits">Benefits Quantification</a></li>
      <li><span class="toc-num">7</span> <a href="#matrix">Value-Readiness Matrix</a></li>
      <li><span class="toc-num">8</span> <a href="#recovery">Friction Recovery Analysis</a></li>
      ${workflows.length > 0 ? '<li><span class="toc-num">9</span> <a href="#workflows">Workflow Comparisons</a></li>' : ""}
      <li><span class="toc-num">${workflows.length > 0 ? "10" : "9"}</span> <a href="#roadmap">Priority Roadmap</a></li>
      ${scenarioData ? `<li><span class="toc-num">${workflows.length > 0 ? "11" : "10"}</span> <a href="#scenarios">Scenario Analysis</a></li>` : ""}
      ${readiness.length > 0 ? `<li><span class="toc-num">${workflows.length > 0 ? (scenarioData ? "12" : "11") : (scenarioData ? "11" : "10")}</span> <a href="#readiness">Readiness &amp; Token Modeling</a></li>` : ""}
      <li><span class="toc-num">&bull;</span> <a href="#methodology">Methodology &amp; Assumptions</a></li>
    </ol>
  </div>

  <div class="page">

  <!-- Section 1: Executive Summary -->
  <h2 id="executive">Executive Summary</h2>

  <div class="cards">
    <div class="card">
      <div class="card-label">AI Use Cases</div>
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
      <div class="card-label">Expected Value</div>
      <div class="card-value" style="color:#7c3aed">${totalExpectedValue}</div>
    </div>
  </div>

  <div class="cards cards-3">
    <div class="card">
      <div class="card-label">Total Friction Cost</div>
      <div class="card-value" style="color:#ef4444">${formatCurrency(totalFrictionCost)}</div>
    </div>
    <div class="card">
      <div class="card-label">Recoverable Value</div>
      <div class="card-value" style="color:#36bf78">${formatCurrency(totalRecovery)}</div>
    </div>
    <div class="card">
      <div class="card-label">Cost Savings</div>
      <div class="card-value" style="color:#001278">${totalCost}</div>
    </div>
  </div>

  ${summary?.headline ? `
  <div class="callout callout-blue">
    <strong>${summary.headline}</strong><br/>
    ${summary.context || ""}
  </div>
  ` : ""}

  <!-- Section 2: Strategic Themes -->
  <h2 id="themes">Strategic Themes</h2>
  <table>
    <tr><th>Theme</th><th>Current State</th><th>Target State</th><th>Primary Driver</th></tr>
    ${themes.map((t: any) => `<tr><td><strong>${t.name}</strong></td><td>${t.currentState}</td><td>${t.targetState}</td><td>${t.primaryDriverImpact}</td></tr>`).join("")}
  </table>

  <!-- Section 3: Business Functions -->
  <h2 id="functions">Business Functions &amp; KPIs</h2>
  <table>
    <tr><th>Function</th><th>KPI</th><th>Baseline</th><th>Target</th><th>Direction</th><th>Timeframe</th></tr>
    ${functions.map((f: any) => `<tr><td>${f.function}</td><td>${f.kpiName}</td><td>${f.baselineValue}</td><td>${f.targetValue}</td><td>${f.direction}</td><td>${f.timeframe}</td></tr>`).join("")}
  </table>

  <!-- Section 4: Friction Points -->
  <h2 id="friction">Friction Point Mapping</h2>
  <table>
    <tr><th>Role</th><th>Function</th><th>Friction Point</th><th>Severity</th><th class="right">Annual Hours</th><th class="right">Est. Cost</th></tr>
    ${friction.map((f: any) => `<tr><td>${f.role}</td><td>${f.function}</td><td>${f.frictionPoint}</td><td><span class="badge badge-${(f.severity || "medium").toLowerCase()}">${f.severity}</span></td><td class="right mono">${(f.annualHours || 0).toLocaleString()}</td><td class="right mono bold">${f.estimatedAnnualCost}</td></tr>`).join("")}
    <tr style="background:#f1f5f9;font-weight:700;">
      <td colspan="4">Total</td>
      <td class="right mono">${friction.reduce((s: number, f: any) => s + (f.annualHours || 0), 0).toLocaleString()}</td>
      <td class="right mono">${formatCurrency(totalFrictionCost)}</td>
    </tr>
  </table>

  <!-- Section 5: AI Use Cases -->
  <h2 id="usecases">AI Use Cases</h2>
  <table>
    <tr><th>ID</th><th>Use Case</th><th>Function</th><th>AI Primitives</th><th>Agentic Pattern</th><th>Theme</th></tr>
    ${useCases.map((u: any) => `<tr><td class="mono bold">${u.id}</td><td>${u.name}</td><td>${u.function}</td><td>${(u.aiPrimitives || []).join(", ")}</td><td>${u.agenticPattern || "&mdash;"}</td><td style="font-size:12px;color:#64748b;">${u.strategicTheme || ""}</td></tr>`).join("")}
  </table>

  <!-- Section 6: Benefits Quantification -->
  <h2 id="benefits">Benefits Quantification</h2>
  <table>
    <tr><th>Use Case</th><th class="right">Cost</th><th class="right">Revenue</th><th class="right">Risk</th><th class="right">Cash Flow</th><th class="right">Total Annual</th><th class="right">Expected Value</th></tr>
    ${benefits.map((b: any) => `<tr><td>${b.useCaseName}</td><td class="right mono">${b.costBenefit}</td><td class="right mono">${b.revenueBenefit}</td><td class="right mono">${b.riskBenefit}</td><td class="right mono">${b.cashFlowBenefit}</td><td class="right mono bold">${b.totalAnnualValue}</td><td class="right mono bold" style="color:#7c3aed;">${b.expectedValue}</td></tr>`).join("")}
  </table>

  <!-- Section 7: Value-Readiness Matrix -->
  <h2 id="matrix">Value-Readiness Matrix</h2>
  ${svgBubbleChart}
  ${bubbleData.length > 0 ? `
  <div style="display:flex;justify-content:center;gap:24px;margin-top:12px;font-size:11px;">
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#36bf78;display:inline-block;"></span> Champions</span>
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#02a2fd;display:inline-block;"></span> Quick Wins</span>
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#f59e0b;display:inline-block;"></span> Strategic</span>
    <span style="display:flex;align-items:center;gap:4px;"><span style="width:10px;height:10px;border-radius:50%;background:#94a3b8;display:inline-block;"></span> Foundation</span>
  </div>
  ` : ""}

  <!-- Section 8: Friction Recovery -->
  <h2 id="recovery">Friction Recovery Analysis</h2>
  <div class="cards cards-3" style="margin-bottom:16px;">
    <div class="card">
      <div class="card-label">Total Friction Cost</div>
      <div class="card-value" style="color:#ef4444;font-size:20px;">${formatCurrency(totalFrictionCost)}</div>
    </div>
    <div class="card">
      <div class="card-label">Projected Recovery</div>
      <div class="card-value" style="color:#36bf78;font-size:20px;">${formatCurrency(totalRecovery)}</div>
    </div>
    <div class="card">
      <div class="card-label">Recovery Rate</div>
      <div class="card-value" style="color:#001278;font-size:20px;">${totalFrictionCost > 0 ? ((totalRecovery / totalFrictionCost) * 100).toFixed(1) : 0}%</div>
    </div>
  </div>
  <table>
    <tr><th>Friction Point</th><th class="right">Annual Cost</th><th>Mapped Use Case</th><th class="right">Recovery</th><th class="right">Rate</th><th style="width:100px;"></th></tr>
    ${frictionRecoveryRows.map(r => {
      const barColor = r.recoveryPct >= 60 ? "#36bf78" : r.recoveryPct >= 30 ? "#f59e0b" : "#ef4444";
      return `<tr>
        <td style="font-size:12px;">${r.frictionPoint}</td>
        <td class="right mono bold">${formatCurrency(r.annualCost)}</td>
        <td style="font-size:12px;">${r.mappedUseCase}</td>
        <td class="right mono bold" style="color:#36bf78;">${formatCurrency(r.recoveryAmount)}</td>
        <td class="right mono">${r.recoveryPct.toFixed(0)}%</td>
        <td><div class="recovery-bar"><div class="recovery-fill" style="width:${Math.min(r.recoveryPct, 100)}%;background:${barColor};"></div></div></td>
      </tr>`;
    }).join("")}
  </table>

  ${workflows.length > 0 ? `
  <!-- Workflow Comparisons -->
  <h2 id="workflows">Workflow Comparisons</h2>
  ${workflows.map((w: any) => {
    const m = w.comparisonMetrics || {};
    const getImprovement = (metric: any) => typeof metric === "string" ? metric : metric?.improvement || "";
    const getAfter = (metric: any) => typeof metric === "string" ? metric : metric?.after || "&mdash;";
    return `
    <h3>${w.useCaseName} &mdash; ${w.agenticPattern || "Standard"}</h3>
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
            <div style="font-size:12px;font-weight:600;">${i + 1}. ${step.name}</div>
            <div style="font-size:11px;color:#64748b;">${step.actorName || step.actorType} &middot; ${step.duration}</div>
            ${step.painPoints?.length ? `<div style="font-size:10px;color:#ef4444;margin-top:2px;">${step.painPoints.join(", ")}</div>` : ""}
          </div>
        `).join("")}
      </div>
      <div class="workflow-box">
        <h4 style="color:#166534;">AI-Powered Process</h4>
        ${(w.targetState || []).map((step: any, i: number) => `
          <div style="padding:8px;margin-bottom:4px;border-left:3px solid ${step.isAIEnabled ? '#36bf78' : '#e2e8f0'};background:${step.isAIEnabled ? '#f0fdf4' : '#f8fafc'};border-radius:4px;">
            <div style="font-size:12px;font-weight:600;">${i + 1}. ${step.name}</div>
            <div style="font-size:11px;color:#64748b;">${step.actorName || step.actorType} &middot; ${step.duration} ${step.isHumanInTheLoop ? '<span style="color:#d97706;font-weight:600;">HITL</span>' : ""}</div>
            ${step.aiCapabilities?.length ? `<div style="font-size:10px;color:#36bf78;margin-top:2px;">${step.aiCapabilities.join(", ")}</div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
    `;
  }).join("")}
  ` : ""}

  <!-- Priority Roadmap -->
  <h2 id="roadmap">Priority Roadmap</h2>
  <table>
    <tr><th>Use Case</th><th class="center">Value</th><th class="center">Readiness</th><th class="center">Priority</th><th>Tier</th><th>Phase</th></tr>
    ${priorities.map((p: any) => {
      const tierClass = (p.priorityTier || "").toLowerCase().includes("champion") ? "tier-champion"
        : (p.priorityTier || "").toLowerCase().includes("strategic") ? "tier-strategic"
        : (p.priorityTier || "").toLowerCase().includes("quick") ? "tier-quickwin"
        : "tier-foundation";
      return `<tr><td>${p.useCaseName}</td><td class="center mono">${typeof p.valueScore === "number" ? p.valueScore.toFixed(1) : p.valueScore}</td><td class="center mono">${typeof p.readinessScore === "number" ? p.readinessScore.toFixed(1) : p.readinessScore}</td><td class="center mono bold">${typeof p.priorityScore === "number" ? p.priorityScore.toFixed(1) : p.priorityScore}</td><td><span class="${tierClass}">${p.priorityTier}</span></td><td>${p.recommendedPhase}</td></tr>`;
    }).join("")}
  </table>

  ${scenarioData ? `
  <!-- Scenario Analysis -->
  <h2 id="scenarios">Scenario Analysis</h2>
  <div class="cards cards-3">
    <div class="card" style="border-left:4px solid #94a3b8;">
      <div class="card-label">Conservative (&times;0.6)</div>
      <div class="card-value" style="color:#64748b; font-size:20px;">${scenarioData.conservative?.annualBenefit || "N/A"}</div>
      <div class="card-sub">NPV: ${scenarioData.conservative?.npv || "N/A"}</div>
      ${scenarioData.conservative?.paybackMonths ? `<div class="card-sub">Payback: ${scenarioData.conservative.paybackMonths} months</div>` : ""}
    </div>
    <div class="card" style="border-left:4px solid #001278;">
      <div class="card-label">Moderate (Base Case)</div>
      <div class="card-value" style="color:#001278; font-size:20px;">${scenarioData.moderate?.annualBenefit || "N/A"}</div>
      <div class="card-sub">NPV: ${scenarioData.moderate?.npv || "N/A"}</div>
      ${scenarioData.moderate?.paybackMonths ? `<div class="card-sub">Payback: ${scenarioData.moderate.paybackMonths} months</div>` : ""}
    </div>
    <div class="card" style="border-left:4px solid #36bf78;">
      <div class="card-label">Aggressive (&times;1.3)</div>
      <div class="card-value" style="color:#36bf78; font-size:20px;">${scenarioData.aggressive?.annualBenefit || "N/A"}</div>
      <div class="card-sub">NPV: ${scenarioData.aggressive?.npv || "N/A"}</div>
      ${scenarioData.aggressive?.paybackMonths ? `<div class="card-sub">Payback: ${scenarioData.aggressive.paybackMonths} months</div>` : ""}
    </div>
  </div>
  ` : ""}

  ${readiness.length > 0 ? `
  <!-- Readiness -->
  <h2 id="readiness">Readiness &amp; Token Modeling</h2>
  <table>
    <tr><th>Use Case</th><th class="center">Data</th><th class="center">Tech</th><th class="center">Org</th><th class="center">Gov</th><th class="center">Readiness</th><th class="center">TTV (mo)</th><th class="right">Monthly Tokens</th><th class="right">Annual Cost</th></tr>
    ${readiness.map((r: any) => `<tr><td>${r.useCaseName}</td><td class="center mono">${r.dataAvailability}</td><td class="center mono">${r.technicalInfrastructure}</td><td class="center mono">${r.organizationalCapacity}</td><td class="center mono">${r.governance}</td><td class="center mono bold">${typeof r.readinessScore === "number" ? r.readinessScore.toFixed(1) : r.readinessScore}</td><td class="center mono">${r.timeToValue}</td><td class="right mono">${(r.monthlyTokens || 0).toLocaleString()}</td><td class="right mono">${r.annualTokenCost || "&mdash;"}</td></tr>`).join("")}
  </table>
  ` : ""}

  <!-- Methodology -->
  <h2 id="methodology">Methodology &amp; Assumptions</h2>
  <div style="font-size:12px; color:#64748b; line-height:1.7;">
    <p><strong>Readiness Scoring:</strong> Organizational Capacity (30%), Data Availability (30%), Technical Infrastructure (20%), Governance (20%)</p>
    <p><strong>Value Score:</strong> Expected Value / Friction Annual Cost, normalized to 1&ndash;10 scale via min-max scaling</p>
    <p><strong>Priority Score:</strong> Readiness Score (50%) + Value Score (50%)</p>
    <p><strong>Tier Assignment:</strong> Champions (Value&ge;5.5 &amp; Readiness&ge;5.5), Quick Wins (Value&lt;5.5 &amp; Readiness&ge;5.5), Strategic (Value&ge;5.5 &amp; Readiness&lt;5.5), Foundation (both&lt;5.5)</p>
    <p><strong>Benefit Categories:</strong> Cost Savings, Revenue Uplift, Risk Mitigation, Cash Flow Improvement</p>
    <p><strong>Scenarios:</strong> Conservative (&times;0.6), Base Case (as-calculated), Aggressive (&times;1.3)</p>
    <p><strong>Token Pricing:</strong> Input $3/1M tokens, Output $15/1M tokens (Claude Sonnet 4.5)</p>
  </div>

  <div class="footer">
    BlueAlly AI Workflow Assessment &mdash; ${project.companyName} &mdash; ${scenario.name} &mdash; ${reportDate}
  </div>

  </div><!-- .page -->
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
