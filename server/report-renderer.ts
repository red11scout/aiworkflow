/**
 * Print-ready HTML report renderer.
 *
 * Self-contained: inline CSS, inline SVG, base64-embedded BlueAlly logos.
 * Mirrors the SharedReport page at /shared/:code so the downloaded file
 * looks identical and prints cleanly via Chrome's "Save as PDF".
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Project, Scenario } from "@shared/schema";
import type {
  AssessmentData,
  CategoryScore,
  UseCaseAssessmentScore,
  WorkflowMap,
} from "@shared/types";
import { formatCurrency, parseCurrencyString } from "@shared/formulas";
import {
  ASSESSMENT_STATUS_THRESHOLDS,
  CATEGORY_METADATA,
} from "@shared/assessment-questions";
import { getPatternById } from "@shared/patterns";

// =========================================================================
// BRAND TOKENS — must match SharedReport.tsx
// =========================================================================
const T = {
  navy: "#001278",
  blue: "#0339AF",
  lightBlue: "#02a2fd",
  green: "#36bf78",
  amber: "#f59e0b",
  red: "#ef4444",
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate600: "#475569",
  slate500: "#64748b",
  slate400: "#94a3b8",
  slate300: "#cbd5e1",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
  white: "#ffffff",
};

// =========================================================================
// LOGO LOADING — embed once at module load
// =========================================================================
let LOGO_BLUE_DATA: string | null = null;
let LOGO_WHITE_DATA: string | null = null;

function loadLogo(filename: string): string {
  if (filename === "blueally-logo.png" && LOGO_BLUE_DATA) return LOGO_BLUE_DATA;
  if (filename === "blueally-logo-white.png" && LOGO_WHITE_DATA)
    return LOGO_WHITE_DATA;

  const candidates = [
    join(process.cwd(), "client", "public", filename),
    join(process.cwd(), "dist", "public", filename),
    join(process.cwd(), "public", filename),
  ];
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    candidates.push(join(here, "..", "client", "public", filename));
    candidates.push(join(here, "..", "..", "client", "public", filename));
    candidates.push(join(here, "..", "public", filename));
  } catch {
    // import.meta.url unavailable in CJS bundle; cwd paths above cover it.
  }

  for (const p of candidates) {
    try {
      const buf = readFileSync(p);
      const data = `data:image/png;base64,${buf.toString("base64")}`;
      if (filename === "blueally-logo.png") LOGO_BLUE_DATA = data;
      else LOGO_WHITE_DATA = data;
      return data;
    } catch {
      // try next path
    }
  }
  // Fallback to a CDN URL so the page still renders (online only).
  return filename === "blueally-logo.png"
    ? "https://www.blueally.com/wp-content/uploads/2023/11/blue-header-logo.png"
    : "https://www.blueally.com/wp-content/uploads/2023/11/header-logo.png";
}

// =========================================================================
// METRICS — small, pure helpers (no React, server-safe)
// =========================================================================

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

interface UseCaseRow {
  useCaseId: string;
  useCaseName: string;
  currentHours: number;
  targetHours: number;
  hoursSaved: number;
  costSaved: number;
  automationPct: number;
  status: "High Impact" | "Medium Impact" | "Low Impact" | "Mapped";
}

function computeWorkflowMetrics(wf: WorkflowMap): UseCaseRow {
  const currentNodes = (wf.currentState || []) as any[];
  const targetNodes = (wf.targetState || []) as any[];

  let currentHours = 0;
  let targetHours = 0;
  let aiEnabled = 0;

  for (const n of currentNodes) currentHours += parseDurationToHours(n.duration);
  for (const n of targetNodes) {
    targetHours += parseDurationToHours(n.duration);
    if (n.isAIEnabled) aiEnabled++;
  }

  const hoursSaved = Math.max(0, currentHours - targetHours);
  const automationPct =
    targetNodes.length > 0 ? (aiEnabled / targetNodes.length) * 100 : 0;

  let costSaved = 0;
  const cm = (wf as any).comparisonMetrics;
  if (cm?.costReduction) {
    const before = parseCurrencyString(cm.costReduction.before || "0");
    const after = parseCurrencyString(cm.costReduction.after || "0");
    costSaved = Math.max(0, before - after);
  }

  let status: UseCaseRow["status"] = "Mapped";
  if (cm?.timeReduction?.improvement) {
    const impNum = parseFloat(
      String(cm.timeReduction.improvement).replace(/[^0-9.]/g, ""),
    );
    if (!isNaN(impNum)) {
      if (impNum >= 70) status = "High Impact";
      else if (impNum >= 40) status = "Medium Impact";
      else status = "Low Impact";
    }
  }

  return {
    useCaseId: wf.useCaseId,
    useCaseName: wf.useCaseName,
    currentHours,
    targetHours,
    hoursSaved,
    costSaved,
    automationPct,
    status,
  };
}

interface SystemEntry {
  name: string;
  useCases: string[];
  totalStepReferences: number;
  integrationTypes: string[];
}

function aggregateSystems(workflowMaps: WorkflowMap[]): SystemEntry[] {
  const m = new Map<
    string,
    { useCases: Set<string>; refs: number; intg: Set<string> }
  >();
  for (const wf of workflowMaps) {
    const allNodes = [
      ...((wf.currentState as any[]) || []),
      ...((wf.targetState as any[]) || []),
    ];
    for (const node of allNodes) {
      const names = new Set<string>();
      for (const s of (node.systems || []) as string[]) {
        if (s) names.add(s);
      }
      for (const sd of ((node as any).systemDetails || []) as any[]) {
        if (sd?.name) names.add(sd.name);
      }
      for (const name of names) {
        if (!m.has(name)) m.set(name, { useCases: new Set(), refs: 0, intg: new Set() });
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
    for (const ig of ((wf as any).integrations || []) as string[]) {
      if (!ig) continue;
      if (!m.has(ig)) m.set(ig, { useCases: new Set(), refs: 0, intg: new Set() });
      m.get(ig)!.useCases.add(wf.useCaseName);
    }
  }
  return [...m.entries()]
    .map(([name, v]) => ({
      name,
      useCases: [...v.useCases].sort(),
      totalStepReferences: v.refs,
      integrationTypes: [...v.intg].sort(),
    }))
    .sort(
      (a, b) =>
        b.useCases.length - a.useCases.length ||
        b.totalStepReferences - a.totalStepReferences,
    );
}

// =========================================================================
// ESCAPING / FORMATTING
// =========================================================================
function esc(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cleanMetric(v: string | undefined | null): string {
  if (!v) return "";
  return String(v).replace(/[\n\r]+/g, " ").trim();
}

// =========================================================================
// SECTION RENDERERS
// =========================================================================

function renderHero(
  companyName: string,
  totalHoursSaved: number,
  totalCostSaved: number,
  generatedAt: string,
  logoWhite: string,
): string {
  return `
  <header class="hero">
    <div class="hero-inner">
      <img src="${logoWhite}" alt="BlueAlly" class="hero-logo" />
      <h1 class="hero-title">AI Workflow Assessment</h1>
      <p class="hero-subtitle">for ${esc(companyName)}</p>
      <div class="hero-metrics">
        <div>
          <p class="hero-metric-label">Total Hours Saved</p>
          <p class="hero-metric-value">${Math.round(totalHoursSaved).toLocaleString()}</p>
        </div>
        <div>
          <p class="hero-metric-label">Total Cost Saved</p>
          <p class="hero-metric-value">${esc(formatCurrency(totalCostSaved))}</p>
        </div>
      </div>
      <div class="hero-footer-line">
        <span>Generated ${esc(generatedAt)}</span>
        <span class="hero-divider">|</span>
        <span class="hero-confidential">Confidential</span>
      </div>
    </div>
  </header>`;
}

function renderKpis(
  totalHoursSaved: number,
  totalCostSaved: number,
  avgAutomation: number,
  workflowCount: number,
): string {
  const items = [
    {
      label: "Hours Saved",
      value: Math.round(totalHoursSaved).toLocaleString(),
      color: T.lightBlue,
      icon: clockIcon(T.lightBlue),
    },
    {
      label: "Cost Saved",
      value: formatCurrency(totalCostSaved),
      color: T.green,
      icon: dollarIcon(T.green),
    },
    {
      label: "Avg Automation",
      value: `${Math.round(avgAutomation)}%`,
      color: T.amber,
      icon: boltIcon(T.amber),
    },
    {
      label: "Workflows Mapped",
      value: String(workflowCount),
      color: T.navy,
      icon: chartIcon(T.navy),
    },
  ];
  return `
  <section class="kpi-grid">
    ${items
      .map(
        (i) => `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:${i.color}18; color:${i.color}">${i.icon}</div>
        <p class="kpi-value">${esc(i.value)}</p>
        <p class="kpi-label">${esc(i.label)}</p>
      </div>`,
      )
      .join("")}
  </section>`;
}

function renderBenefitsTable(rows: UseCaseRow[]): string {
  if (rows.length === 0) return "";
  const statusBadge = (s: UseCaseRow["status"]) => {
    const cls = {
      "High Impact": "status-high",
      "Medium Impact": "status-medium",
      "Low Impact": "status-low",
      Mapped: "status-mapped",
    }[s];
    return `<span class="status-badge ${cls}">${s}</span>`;
  };
  const totals = {
    current: rows.reduce((s, r) => s + r.currentHours, 0),
    target: rows.reduce((s, r) => s + r.targetHours, 0),
    hoursSaved: rows.reduce((s, r) => s + r.hoursSaved, 0),
    costSaved: rows.reduce((s, r) => s + r.costSaved, 0),
    automation:
      rows.length > 0
        ? rows.reduce((s, r) => s + r.automationPct, 0) / rows.length
        : 0,
  };
  return `
  <section class="section section-benefits">
    <h2 class="section-heading">Use Case Benefits</h2>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Use Case</th>
            <th class="num">Current Hrs</th>
            <th class="num">Target Hrs</th>
            <th class="num">Hours Saved</th>
            <th class="num">Cost Saved</th>
            <th class="num">Automation</th>
            <th class="ctr">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r) => `
            <tr>
              <td class="td-name">${esc(r.useCaseName)}</td>
              <td class="num">${Math.round(r.currentHours).toLocaleString()}</td>
              <td class="num">${Math.round(r.targetHours).toLocaleString()}</td>
              <td class="num num-strong">${Math.round(r.hoursSaved).toLocaleString()}</td>
              <td class="num num-strong">${esc(formatCurrency(r.costSaved))}</td>
              <td class="num">${Math.round(r.automationPct)}%</td>
              <td class="ctr">${statusBadge(r.status)}</td>
            </tr>`,
            )
            .join("")}
        </tbody>
        <tfoot>
          <tr>
            <td>Total</td>
            <td class="num">${Math.round(totals.current).toLocaleString()}</td>
            <td class="num">${Math.round(totals.target).toLocaleString()}</td>
            <td class="num">${Math.round(totals.hoursSaved).toLocaleString()}</td>
            <td class="num">${esc(formatCurrency(totals.costSaved))}</td>
            <td class="num">${Math.round(totals.automation)}%</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  </section>`;
}

function actorIcon(actorType: string | undefined): string {
  if (actorType === "ai_agent" || actorType === "ai") return svgBot();
  if (actorType === "human") return svgUsers();
  return svgZap();
}

function renderWorkflowCard(wf: WorkflowMap): string {
  const cm = (wf as any).comparisonMetrics || {};
  const pattern = getPatternById((wf as any).agenticPattern || "");
  const currentSteps = ((wf.currentState as any[]) || []).length;
  const targetSteps = ((wf.targetState as any[]) || []).length;
  const aiSteps = ((wf.targetState as any[]) || []).filter(
    (n: any) => n.isAIEnabled,
  ).length;
  const hitlSteps = ((wf.targetState as any[]) || []).filter(
    (n: any) => n.isHumanInTheLoop,
  ).length;

  const metricDelta = (label: string, m: any) => {
    const b = cleanMetric(m?.before);
    const a = cleanMetric(m?.after);
    const imp = cleanMetric(m?.improvement);
    const impText =
      imp && imp !== "N/A"
        ? imp.toLowerCase().includes("improvement")
          ? imp
          : `${imp} improvement`
        : "";
    return `
      <div class="metric-delta">
        <p class="metric-delta-label">${esc(label)}</p>
        <div class="metric-delta-values">
          <span class="metric-before">${esc(b || "—")}</span>
          <span class="metric-arrow">${svgArrowRight()}</span>
          <span class="metric-after">${esc(a || "—")}</span>
        </div>
        ${impText ? `<p class="metric-improvement">${esc(impText)}</p>` : `<p class="metric-improvement-empty">&nbsp;</p>`}
      </div>`;
  };

  const stepStat = (label: string, value: number, icon: string) => `
    <div class="step-stat">
      ${icon}
      <div>
        <p class="step-stat-value">${value}</p>
        <p class="step-stat-label">${esc(label)}</p>
      </div>
    </div>`;

  const renderNode = (
    node: any,
    idx: number,
    total: number,
    target: boolean,
  ): string => {
    const stepNum = node.stepNumber || idx + 1;
    const circleColor = target
      ? node.isAIEnabled
        ? T.green
        : T.slate400
      : T.slate200;
    const circleText = target ? T.white : T.slate700;
    const badges: string[] = [];
    if (!target && node.isBottleneck) {
      badges.push('<span class="badge badge-red">Bottleneck</span>');
    }
    if (target) {
      if (node.isAIEnabled)
        badges.push('<span class="badge badge-emerald">AI-Enabled</span>');
      if (node.automationLevel && node.automationLevel !== "manual") {
        badges.push(
          `<span class="badge badge-blue">${esc(String(node.automationLevel))}</span>`,
        );
      }
      if (node.isHumanInTheLoop)
        badges.push('<span class="badge badge-amber">HITL</span>');
    }
    const chips: string[] = [];
    chips.push(
      `<span class="node-chip">${actorIcon(node.actorType)} ${esc(node.actorName || node.actorType || "")}</span>`,
    );
    if (node.duration) chips.push(`<span class="node-chip">| ${esc(node.duration)}</span>`);
    if (node.systems && node.systems.length > 0) {
      chips.push(
        `<span class="node-chip">| ${esc((node.systems as string[]).join(", "))}</span>`,
      );
    }
    return `
      <div class="node-row">
        <div class="node-box ${target ? "node-target" : "node-current"}">
          <div class="node-circle" style="background:${circleColor}; color:${circleText}">${stepNum}</div>
          <div class="node-body">
            <p class="node-name">${esc(node.name || "")}</p>
            <div class="node-chips">${chips.join("")}</div>
            ${badges.length > 0 ? `<div class="node-badges">${badges.join("")}</div>` : ""}
          </div>
        </div>
        ${idx < total - 1 ? `<div class="node-arrow">${svgChevronDown(T.slate300)}</div>` : ""}
      </div>`;
  };

  const currentList = ((wf.currentState as any[]) || [])
    .map((n, i, arr) => renderNode(n, i, arr.length, false))
    .join("");
  const targetList = ((wf.targetState as any[]) || [])
    .map((n, i, arr) => renderNode(n, i, arr.length, true))
    .join("");

  return `
  <article class="workflow-card">
    <header class="workflow-card-header">
      <span class="workflow-title">${esc(wf.useCaseName)}</span>
      ${
        pattern
          ? `<span class="workflow-pattern">${esc(pattern.name.split("(")[0].trim())}</span>`
          : ""
      }
    </header>
    <div class="workflow-body">
      ${cm
        ? `<div class="metric-grid">
        ${metricDelta("Time", cm.timeReduction)}
        ${metricDelta("Cost", cm.costReduction)}
        ${metricDelta("Quality", cm.qualityImprovement)}
        ${metricDelta("Throughput", cm.throughputIncrease)}
      </div>`
        : ""}
      <div class="step-stat-grid">
        ${stepStat("Current Steps", currentSteps, svgUsers(T.slate400))}
        ${stepStat("Target Steps", targetSteps, svgZap(T.slate400))}
        ${stepStat("AI-Enabled", aiSteps, svgBot(T.slate400))}
        ${stepStat("HITL Checkpoints", hitlSteps, svgShield(T.slate400))}
      </div>
      ${currentList || targetList
        ? `<div class="process-comparison">
        <h4 class="subsection-heading">Process Comparison</h4>
        <div class="process-grid">
          <div>
            <div class="process-label process-label-current">Current Process</div>
            <div class="process-list">${currentList}</div>
          </div>
          <div>
            <div class="process-label process-label-target">AI-Powered Process</div>
            <div class="process-list">${targetList}</div>
          </div>
        </div>
      </div>`
        : ""}
    </div>
  </article>`;
}

function renderWorkflows(workflows: WorkflowMap[]): string {
  if (workflows.length === 0) return "";
  return `
  <section class="section section-workflows">
    <h2 class="section-heading">Workflow Transformations</h2>
    <div class="workflow-stack">
      ${workflows.map(renderWorkflowCard).join("")}
    </div>
  </section>`;
}

function renderSystems(systems: SystemEntry[]): string {
  if (systems.length === 0) return "";
  const top = systems.slice(0, 20);
  const maxRefs = Math.max(1, ...top.map((s) => s.totalStepReferences));
  return `
  <section class="section section-systems">
    <h2 class="section-heading">Systems, Data &amp; Integrations</h2>
    <p class="section-lede">
      Systems that appear in multiple use cases represent shared infrastructure
      that can accelerate implementation.
    </p>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>System</th>
            <th class="num">Use Cases</th>
            <th class="num">Step Refs</th>
            <th>Heat</th>
            <th>Integration</th>
          </tr>
        </thead>
        <tbody>
          ${top
            .map((s, i) => {
              const pct = Math.round(
                (s.totalStepReferences / maxRefs) * 100,
              );
              const intg =
                s.integrationTypes.length > 0
                  ? s.integrationTypes
                      .map(
                        (it) =>
                          `<span class="integ-chip">${esc(it.replace(/_/g, " "))}</span>`,
                      )
                      .join(" ")
                  : '<span class="integ-chip integ-none">none</span>';
              return `
              <tr>
                <td class="num-muted">${i + 1}</td>
                <td class="td-name">${esc(s.name)}</td>
                <td class="num">${s.useCases.length}</td>
                <td class="num">${s.totalStepReferences}</td>
                <td>
                  <div class="heat-bar">
                    <div class="heat-bar-fill" style="width:${pct}%"></div>
                  </div>
                </td>
                <td>${intg}</td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  </section>`;
}

function renderRadar(categories: CategoryScore[]): string {
  const data = categories.map((cat) => ({
    label: CATEGORY_METADATA[cat.category].label,
    score: Math.round(cat.percentage * 100),
    color: CATEGORY_METADATA[cat.category].color,
  }));
  return `
  <div class="radar-card">
    <h3 class="radar-title">Readiness Profile</h3>
    <div class="radar-rows">
      ${data
        .map(
          (d) => `
        <div class="radar-row">
          <span class="radar-label">${esc(d.label)}</span>
          <div class="radar-track">
            <div class="radar-line"></div>
            <div class="radar-fill" style="width:${d.score}%; background:${d.color}"></div>
            <div class="radar-dot" style="left:${d.score}%; background:${d.color}"></div>
            <div class="radar-target" style="left:80%; border-color:${d.color}"></div>
          </div>
          <span class="radar-score" style="color:${d.color}">${d.score}%</span>
        </div>`,
        )
        .join("")}
    </div>
    <div class="radar-legend">
      <span><span class="radar-legend-dot" style="background:${T.slate500}"></span> Current Score</span>
      <span><span class="radar-legend-target" style="border-color:${T.slate500}"></span> Ready Target (80%)</span>
    </div>
  </div>`;
}

function renderCategoryCard(cat: CategoryScore): string {
  const meta = CATEGORY_METADATA[cat.category];
  const threshold = ASSESSMENT_STATUS_THRESHOLDS.find(
    (t) => cat.percentage >= t.min,
  );
  const pct = Math.round(cat.percentage * 100);
  const subRows = cat.subCategories
    .map((s) => {
      const subPct = Math.round(s.percentage * 100);
      const subTh = ASSESSMENT_STATUS_THRESHOLDS.find(
        (t) => s.percentage >= t.min,
      );
      return `
        <div class="cat-sub-row">
          <span class="cat-sub-label">${esc(s.subCategory)}</span>
          <div class="cat-sub-track">
            <div class="cat-sub-fill" style="width:${subPct}%; background:${subTh?.color}"></div>
          </div>
          <span class="cat-sub-score" style="color:${subTh?.color}">${subPct}%</span>
        </div>`;
    })
    .join("");
  return `
    <div class="cat-card">
      <header class="cat-header">
        <div class="cat-icon" style="background:${meta.color}20; color:${meta.color}">${categoryIcon(meta.icon)}</div>
        <div class="cat-title-block">
          <h3 class="cat-title">${esc(meta.label)}</h3>
          <p class="cat-subtitle">${cat.answeredCount}/${cat.questionCount} answered</p>
        </div>
        <div class="cat-score-block">
          <p class="cat-pct" style="color:${threshold?.color}">${pct}%</p>
          <span class="cat-badge" style="background:${threshold?.color}">${esc(threshold?.label || "")}</span>
        </div>
      </header>
      <div class="cat-progress-track">
        <div class="cat-progress-fill" style="width:${pct}%; background:${threshold?.color}"></div>
      </div>
      <div class="cat-subs">${subRows}</div>
      <p class="cat-description">${esc(cat.statusDescription || "")}</p>
    </div>`;
}

function renderAssessment(
  assessment: AssessmentData | null,
  resolveUcName: (id: string) => string,
): string {
  if (!assessment?.scores) return "";
  const scores = assessment.scores;
  const overallPct = Math.round(scores.overallPercentage * 100);
  const overallTh = ASSESSMENT_STATUS_THRESHOLDS.find(
    (t) => scores.overallPercentage >= t.min,
  );

  // Top gaps across all use cases
  const allGaps = scores.useCaseScores
    .flatMap((uc: UseCaseAssessmentScore) =>
      uc.gaps.map((g) => ({
        ...g,
        useCaseName: resolveUcName(uc.useCaseName),
      })),
    )
    .sort((a, b) => b.gapSize - a.gapSize)
    .slice(0, 5);

  const gapsRows = allGaps
    .map((g) => {
      const color =
        g.gapSize >= 3 ? T.red : g.gapSize >= 2 ? T.amber : T.lightBlue;
      const catMeta = CATEGORY_METADATA[g.category];
      return `
      <tr>
        <td class="td-name td-gap-q">
          <p>${esc(g.questionText)}</p>
          <p class="td-gap-sub">${esc(g.subCategory)}</p>
        </td>
        <td><span style="color:${catMeta?.color}; font-weight:500">${esc(catMeta?.label || g.category)}</span></td>
        <td class="ctr">${g.currentScore}</td>
        <td class="ctr">${g.targetScore}</td>
        <td class="ctr"><span class="gap-pill" style="background:${color}">${g.gapSize}</span></td>
        <td class="td-gap-uc">${esc(g.useCaseName)}</td>
      </tr>`;
    })
    .join("");

  const ucRows = scores.useCaseScores
    .map((uc: UseCaseAssessmentScore) => {
      const ucPct = Math.round(uc.percentage * 100);
      const ucTh = ASSESSMENT_STATUS_THRESHOLDS.find(
        (t) => uc.percentage >= t.min,
      );
      const gapsList =
        uc.gaps.length > 0
          ? `
        <tr class="uc-gap-row">
          <td colspan="4">
            <div class="uc-gap-inner">
              ${uc.gaps
                .map((g) => {
                  const sev =
                    g.gapSize >= 3
                      ? T.red
                      : g.gapSize >= 2
                        ? T.amber
                        : T.lightBlue;
                  const tip =
                    g.tip || assessment.gapGuidance?.[g.questionId] || "";
                  return `
                  <div class="uc-gap-card">
                    <div class="uc-gap-meta">
                      <span class="gap-pill-mini" style="background:${sev}">Gap: ${g.gapSize}</span>
                      <span class="uc-gap-cat">${esc(g.category)}</span>
                      <span class="uc-gap-sep">|</span>
                      <span class="uc-gap-sub">${esc(g.subCategory)}</span>
                      <span class="uc-gap-spacer"></span>
                      <span class="uc-gap-scores">Current: ${g.currentScore} → Target: ${g.targetScore}</span>
                    </div>
                    <p class="uc-gap-question">${esc(g.questionText)}</p>
                    ${tip ? `<p class="uc-gap-tip">${esc(tip)}</p>` : ""}
                  </div>`;
                })
                .join("")}
            </div>
          </td>
        </tr>`
          : "";
      return `
      <tr>
        <td class="td-name">${esc(resolveUcName(uc.useCaseName))} <span class="td-name-pct">(${ucPct}%)</span></td>
        <td class="ctr"><span class="status-pill" style="background:${ucTh?.color}">${esc(ucTh?.label || "")}</span></td>
        <td class="ctr">${uc.mappedQuestionIds.length}</td>
        <td class="ctr">${
          uc.gaps.length > 0
            ? `<span class="gap-count">${uc.gaps.length}</span>`
            : `<span class="ok-pill" style="color:${T.green}">OK</span>`
        }</td>
      </tr>
      ${gapsList}`;
    })
    .join("");

  return `
  <section class="section section-assessment page-break-before">
    <h2 class="section-heading">AI Readiness Assessment</h2>
    <p class="section-lede">
      Organizational readiness across skills, data, infrastructure, and
      governance dimensions.
    </p>

    <div class="assess-overall">
      <p class="assess-overall-label">Overall AI Readiness</p>
      <p class="assess-overall-pct" style="color:${overallTh?.color}">${overallPct}%</p>
      <span class="assess-overall-badge" style="background:${overallTh?.color}">${esc(overallTh?.label || "")}</span>
      ${scores.overallStatusDescription ? `<p class="assess-overall-desc">${esc(scores.overallStatusDescription)}</p>` : ""}
      <p class="assess-overall-completion">${scores.answeredQuestions} of ${scores.totalQuestions} questions answered (${Math.round(scores.completionPercentage * 100)}% complete)</p>
    </div>

    <div class="assess-cats-grid">
      <div class="cat-grid">${scores.categories.map(renderCategoryCard).join("")}</div>
      ${renderRadar(scores.categories)}
    </div>

    ${
      allGaps.length > 0
        ? `
    <div class="section-block">
      <h3 class="subsection-heading">Top Readiness Gaps</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Area</th>
              <th>Category</th>
              <th class="ctr">Current</th>
              <th class="ctr">Target</th>
              <th class="ctr">Gap</th>
              <th>Use Case</th>
            </tr>
          </thead>
          <tbody>${gapsRows}</tbody>
        </table>
      </div>
    </div>`
        : ""
    }

    ${
      scores.useCaseScores.length > 0
        ? `
    <div class="section-block">
      <h3 class="subsection-heading">Use Case Readiness</h3>
      <div class="table-wrap">
        <table class="data-table data-table-uc">
          <thead>
            <tr>
              <th>Use Case</th>
              <th class="ctr">Status</th>
              <th class="ctr">Questions</th>
              <th class="ctr">Gaps</th>
            </tr>
          </thead>
          <tbody>${ucRows}</tbody>
        </table>
      </div>
    </div>`
        : ""
    }
  </section>`;
}

function renderFooter(logoWhite: string): string {
  return `
  <footer class="page-footer">
    <img src="${logoWhite}" alt="BlueAlly" class="footer-logo" />
    <p class="footer-text">Confidential &mdash; BlueAlly Technology Solutions</p>
  </footer>`;
}

// =========================================================================
// INLINE SVG ICONS
// =========================================================================
function clockIcon(c: string) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
}
function dollarIcon(c: string) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
}
function boltIcon(c: string) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
}
function chartIcon(c: string) {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`;
}
function svgUsers(c: string = T.slate500) {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
}
function svgBot(c: string = T.slate500) {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`;
}
function svgZap(c: string = T.slate500) {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`;
}
function svgShield(c: string = T.slate500) {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"/></svg>`;
}
function svgArrowRight(c: string = T.slate400) {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
}
function svgChevronDown(c: string = T.slate300) {
  return `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`;
}
function categoryIcon(name: string) {
  switch (name) {
    case "Database":
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"/></svg>`;
    case "Server":
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`;
    case "Shield":
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z"/></svg>`;
    case "Users":
    default:
      return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  }
}

// =========================================================================
// STYLES
// =========================================================================
function styles(): string {
  return `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: ${T.slate900};
    background: ${T.slate50};
    -webkit-font-smoothing: antialiased;
  }
  img { display: block; max-width: 100%; }

  /* ── Layout ────────────────────────────────────────────────────────── */
  .report { max-width: 960px; margin: 0 auto; }
  main { padding: 40px 32px; display: flex; flex-direction: column; gap: 40px; }
  .section { display: flex; flex-direction: column; gap: 8px; }
  .section-block { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; }
  .section-heading {
    font-size: 22px; font-weight: 700; color: ${T.slate800};
    margin: 0 0 8px; letter-spacing: -0.01em;
  }
  .subsection-heading {
    font-size: 14px; font-weight: 600; color: ${T.slate700};
    margin: 0 0 8px;
  }
  .section-lede { font-size: 14px; color: ${T.slate500}; margin: -4px 0 8px; }

  /* ── Hero ──────────────────────────────────────────────────────────── */
  .hero {
    background: linear-gradient(135deg, ${T.navy} 0%, ${T.blue} 100%);
    color: ${T.white};
    padding: 56px 32px;
    position: relative;
    overflow: hidden;
  }
  .hero-inner { max-width: 960px; margin: 0 auto; position: relative; }
  .hero-logo { height: 28px; margin-bottom: 24px; }
  .hero-title { font-size: 36px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
  .hero-subtitle { font-size: 18px; color: #bfdbfe; margin: 4px 0 0; }
  .hero-metrics { display: flex; gap: 48px; margin-top: 32px; flex-wrap: wrap; }
  .hero-metric-label {
    font-size: 11px; font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.15em;
    color: #93c5fd; margin: 0;
  }
  .hero-metric-value { font-size: 32px; font-weight: 700; margin: 4px 0 0; }
  .hero-footer-line {
    margin-top: 32px; display: flex; gap: 24px; flex-wrap: wrap;
    font-size: 11px; color: #93c5fd; align-items: center;
  }
  .hero-confidential { text-transform: uppercase; letter-spacing: 0.2em; font-weight: 600; }
  .hero-divider { opacity: 0.5; }

  /* ── KPI cards ─────────────────────────────────────────────────────── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  .kpi-card {
    background: ${T.white};
    border: 1px solid ${T.slate200};
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .kpi-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .kpi-value { font-size: 28px; font-weight: 700; margin: 12px 0 2px; color: ${T.slate900}; font-variant-numeric: tabular-nums; }
  .kpi-label { font-size: 12px; font-weight: 500; color: ${T.slate500}; margin: 0; }

  /* ── Tables ────────────────────────────────────────────────────────── */
  .table-wrap {
    background: ${T.white};
    border: 1px solid ${T.slate200};
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .data-table thead { background: ${T.slate50}; }
  .data-table th {
    text-align: left; padding: 12px 16px;
    font-size: 11px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.05em;
    color: ${T.slate500};
    border-bottom: 1px solid ${T.slate200};
  }
  .data-table td {
    padding: 12px 16px; vertical-align: top;
    border-bottom: 1px solid ${T.slate100};
  }
  .data-table tbody tr:last-child td { border-bottom: none; }
  .data-table tfoot td {
    background: ${T.slate50}; font-weight: 600; color: ${T.slate900};
    border-top: 2px solid ${T.slate300};
  }
  .td-name { font-weight: 500; color: ${T.slate800}; }
  .td-name-pct { color: ${T.slate400}; font-weight: 400; font-size: 11px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; color: ${T.slate600}; }
  .num-strong { font-weight: 600; color: ${T.slate800}; }
  .num-muted { text-align: center; color: ${T.slate400}; }
  .ctr { text-align: center; }

  /* ── Status badges ─────────────────────────────────────────────────── */
  .status-badge {
    display: inline-block; padding: 2px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 500; border: 1px solid;
  }
  .status-high   { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
  .status-medium { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
  .status-low    { background: #fef3c7; color: #92400e; border-color: #fde68a; }
  .status-mapped { background: ${T.slate100}; color: ${T.slate600}; border-color: ${T.slate200}; }
  .status-pill, .gap-pill, .gap-pill-mini, .ok-pill {
    display: inline-block; padding: 2px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; color: ${T.white};
  }
  .gap-pill-mini { font-size: 10px; padding: 1px 8px; }
  .ok-pill { background: transparent; color: ${T.green}; }
  .gap-count { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #fee2e2; color: #b91c1c; font-weight: 600; font-size: 11px; }
  .integ-chip {
    display: inline-block; padding: 1px 8px; border-radius: 999px;
    background: ${T.slate100}; color: ${T.slate600};
    font-size: 11px; margin-right: 2px;
  }
  .integ-chip.integ-none { background: #fee2e2; color: #b91c1c; }
  .heat-bar { width: 80px; height: 6px; background: ${T.slate100}; border-radius: 999px; overflow: hidden; }
  .heat-bar-fill { height: 100%; background: ${T.lightBlue}; border-radius: 999px; }

  /* ── Workflow cards ────────────────────────────────────────────────── */
  .workflow-stack { display: flex; flex-direction: column; gap: 16px; }
  .workflow-card {
    background: ${T.white};
    border: 1px solid ${T.slate200};
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .workflow-card-header {
    padding: 16px 20px;
    display: flex; align-items: center; gap: 12px;
    background: ${T.white};
    border-bottom: 1px solid ${T.slate100};
  }
  .workflow-title { font-size: 15px; font-weight: 600; color: ${T.slate800}; flex: 1; }
  .workflow-pattern {
    display: inline-block; padding: 2px 10px; border-radius: 999px;
    background: ${T.lightBlue}; color: ${T.white};
    font-size: 11px; font-weight: 500;
  }
  .workflow-body { padding: 20px; display: flex; flex-direction: column; gap: 20px; }

  /* ── Metric deltas ─────────────────────────────────────────────────── */
  .metric-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
  }
  .metric-delta {
    border: 1px solid ${T.slate200}; background: ${T.white};
    border-radius: 8px; padding: 12px; min-height: 96px;
    display: flex; flex-direction: column;
  }
  .metric-delta-label {
    font-size: 11px; font-weight: 500;
    text-transform: uppercase; letter-spacing: 0.05em;
    color: ${T.slate500}; margin: 0;
  }
  .metric-delta-values { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 13px; flex-wrap: nowrap; }
  .metric-before { color: ${T.slate600}; }
  .metric-after { color: ${T.slate900}; font-weight: 600; }
  .metric-arrow { display: inline-flex; }
  .metric-improvement { margin: auto 0 0; padding-top: 4px; font-size: 11px; font-weight: 600; color: ${T.green}; }
  .metric-improvement-empty { margin: auto 0 0; height: 16px; }

  /* ── Step stats ────────────────────────────────────────────────────── */
  .step-stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .step-stat {
    display: flex; align-items: center; gap: 12px;
    background: ${T.slate50}; border: 1px solid ${T.slate100};
    border-radius: 8px; padding: 10px 14px;
  }
  .step-stat-value { font-size: 18px; font-weight: 700; color: ${T.slate800}; margin: 0; font-variant-numeric: tabular-nums; }
  .step-stat-label { font-size: 11px; color: ${T.slate500}; margin: 0; }

  /* ── Process comparison ────────────────────────────────────────────── */
  .process-comparison { border-top: 1px solid ${T.slate100}; padding-top: 16px; }
  .process-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px; }
  .process-label {
    display: inline-block; padding: 2px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; margin-bottom: 12px;
  }
  .process-label-current { background: ${T.slate100}; color: ${T.slate600}; }
  .process-label-target { background: ${T.green}; color: ${T.white}; }
  .process-list { display: flex; flex-direction: column; gap: 2px; }
  .node-row { display: flex; flex-direction: column; }
  .node-box {
    display: flex; align-items: flex-start; gap: 10px;
    border: 1px solid ${T.slate100}; border-radius: 8px;
    padding: 10px 12px;
  }
  .node-current { background: ${T.slate50}; }
  .node-target { background: ${T.white}; }
  .node-circle {
    width: 24px; height: 24px; border-radius: 999px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; flex-shrink: 0;
  }
  .node-body { flex: 1; min-width: 0; }
  .node-name { font-size: 13px; font-weight: 500; color: ${T.slate800}; margin: 0 0 4px; }
  .node-chips { display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; color: ${T.slate500}; align-items: center; }
  .node-chip { display: inline-flex; align-items: center; gap: 3px; }
  .node-badges { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10px; font-weight: 500; }
  .badge-emerald { background: #d1fae5; color: #065f46; }
  .badge-blue { background: #dbeafe; color: #1e40af; text-transform: capitalize; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .node-arrow { display: flex; justify-content: center; padding: 2px 0; }

  /* ── Assessment overall ─────────────────────────────────────────────── */
  .assess-overall {
    background: ${T.white}; border: 1px solid ${T.slate200};
    border-radius: 12px; padding: 32px; text-align: center;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .assess-overall-label {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em;
    color: ${T.slate500}; font-weight: 500; margin: 0 0 8px;
  }
  .assess-overall-pct { font-size: 56px; font-weight: 700; margin: 0; line-height: 1; }
  .assess-overall-badge {
    display: inline-block; padding: 4px 14px; border-radius: 999px;
    font-size: 13px; font-weight: 600; color: ${T.white}; margin-top: 12px;
  }
  .assess-overall-desc { font-size: 13px; color: ${T.slate600}; max-width: 480px; margin: 12px auto 0; }
  .assess-overall-completion { font-size: 11px; color: ${T.slate400}; margin: 8px 0 0; }

  /* ── Category grid + radar ─────────────────────────────────────────── */
  .assess-cats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 24px; }
  .cat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .cat-card {
    background: ${T.white}; border: 1px solid ${T.slate200};
    border-radius: 12px; padding: 16px;
    display: flex; flex-direction: column; gap: 10px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .cat-header { display: flex; align-items: center; gap: 10px; }
  .cat-icon {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .cat-title-block { flex: 1; min-width: 0; }
  .cat-title { font-size: 14px; font-weight: 600; color: ${T.slate800}; margin: 0; }
  .cat-subtitle { font-size: 11px; color: ${T.slate500}; margin: 2px 0 0; }
  .cat-score-block { text-align: right; }
  .cat-pct { font-size: 22px; font-weight: 700; margin: 0; }
  .cat-badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; color: ${T.white}; }
  .cat-progress-track { height: 6px; background: ${T.slate100}; border-radius: 999px; overflow: hidden; }
  .cat-progress-fill { height: 100%; border-radius: 999px; }
  .cat-subs { display: flex; flex-direction: column; gap: 6px; }
  .cat-sub-row { display: flex; align-items: center; gap: 8px; font-size: 11px; }
  .cat-sub-label { flex: 1; color: ${T.slate500}; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cat-sub-track { width: 80px; height: 4px; background: ${T.slate100}; border-radius: 999px; overflow: hidden; }
  .cat-sub-fill { height: 100%; border-radius: 999px; }
  .cat-sub-score { width: 32px; text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
  .cat-description { font-size: 11px; color: ${T.slate500}; font-style: italic; margin: 0; }

  .radar-card {
    background: ${T.white}; border: 1px solid ${T.slate200};
    border-radius: 12px; padding: 16px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .radar-title { font-size: 14px; font-weight: 600; color: ${T.slate800}; margin: 0 0 16px; }
  .radar-rows { display: flex; flex-direction: column; gap: 18px; padding: 8px 0; }
  .radar-row { display: flex; align-items: center; gap: 12px; }
  .radar-label { width: 96px; font-size: 11px; font-weight: 500; color: ${T.slate500}; text-align: right; flex-shrink: 0; }
  .radar-track { flex: 1; position: relative; height: 24px; }
  .radar-line { position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: ${T.slate200}; transform: translateY(-50%); }
  .radar-fill { position: absolute; top: 50%; left: 0; height: 2px; transform: translateY(-50%); border-radius: 999px; }
  .radar-dot { position: absolute; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; border-radius: 999px; }
  .radar-target {
    position: absolute; top: 50%; transform: translate(-50%, -50%);
    width: 14px; height: 14px; border-radius: 999px;
    background: ${T.white}; border-style: solid; border-width: 2px;
  }
  .radar-score { width: 40px; font-size: 11px; font-weight: 700; text-align: right; font-variant-numeric: tabular-nums; flex-shrink: 0; }
  .radar-legend {
    display: flex; gap: 16px; margin-top: 16px; padding-top: 12px;
    border-top: 1px solid ${T.slate200}; font-size: 10px; color: ${T.slate500};
  }
  .radar-legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 999px; vertical-align: middle; margin-right: 4px; }
  .radar-legend-target { display: inline-block; width: 10px; height: 10px; border-radius: 999px; border: 2px solid; background: ${T.white}; vertical-align: middle; margin-right: 4px; }

  /* ── Gap rows in use case table ────────────────────────────────────── */
  .uc-gap-row td { padding: 0; background: #f8fafc40; border-bottom: 1px solid ${T.slate100}; }
  .uc-gap-inner { padding: 12px 16px 12px 36px; display: flex; flex-direction: column; gap: 8px; }
  .uc-gap-card {
    background: ${T.white}; border: 1px solid ${T.slate200};
    border-radius: 8px; padding: 10px 12px; font-size: 11px;
  }
  .uc-gap-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
  .uc-gap-cat { color: ${T.slate600}; font-weight: 600; text-transform: capitalize; }
  .uc-gap-sub { color: ${T.slate500}; }
  .uc-gap-sep { color: ${T.slate300}; }
  .uc-gap-spacer { flex: 1; }
  .uc-gap-scores { color: ${T.slate400}; font-size: 10px; font-variant-numeric: tabular-nums; }
  .uc-gap-question { color: ${T.slate600}; margin: 0 0 4px; }
  .uc-gap-tip { color: ${T.slate500}; font-style: italic; margin: 6px 0 0; padding-left: 8px; border-left: 2px solid ${T.slate300}; }
  .td-gap-q p { margin: 0; }
  .td-gap-sub { color: ${T.slate400}; font-size: 11px; margin-top: 2px; }
  .td-gap-uc { font-size: 11px; color: ${T.slate500}; max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ── Footer ────────────────────────────────────────────────────────── */
  .page-footer {
    background: ${T.navy}; color: ${T.white};
    padding: 32px; text-align: center; margin-top: 16px;
  }
  .footer-logo { height: 24px; margin: 0 auto 12px; }
  .footer-text { font-size: 11px; color: #93c5fd; margin: 0; }

  /* ── Print discipline ──────────────────────────────────────────────── */
  @page {
    size: A4;
    margin: 14mm 12mm 14mm 12mm;
  }

  @media print {
    html, body { background: ${T.white}; }
    .report { max-width: none; }
    main { padding: 16px 0; gap: 24px; }
    .hero { padding: 32px 24px; margin: -14mm -12mm 0; }
    .page-footer { padding: 20px; margin: 24px -12mm -14mm; }
    .kpi-card, .workflow-card, .metric-delta, .step-stat,
    .assess-overall, .cat-card, .radar-card, .uc-gap-card,
    .data-table tr {
      box-shadow: none !important;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .workflow-card, .assess-overall, .cat-card { page-break-inside: avoid; }
    .section-heading, .subsection-heading {
      page-break-after: avoid;
      break-after: avoid;
    }
    .section { page-break-inside: auto; }
    .page-break-before { page-break-before: always; break-before: page; }
    .kpi-grid, .step-stat-grid, .metric-grid, .process-grid,
    .assess-cats-grid, .cat-grid {
      page-break-inside: avoid; break-inside: avoid;
    }
    .data-table { page-break-inside: auto; }
    .data-table tr { page-break-inside: avoid; break-inside: avoid; }
    .data-table thead { display: table-header-group; }
    .data-table tfoot { display: table-row-group; }
    body, .data-table, .kpi-card, .workflow-card, .cat-card,
    .assess-overall, .radar-card, .metric-delta, .step-stat,
    .hero, .page-footer {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }

  /* ── Narrow viewport fallback ──────────────────────────────────────── */
  @media (max-width: 720px) {
    .kpi-grid, .metric-grid, .step-stat-grid, .cat-grid,
    .assess-cats-grid, .process-grid {
      grid-template-columns: 1fr 1fr;
    }
  }
  `;
}

// =========================================================================
// MAIN RENDERER
// =========================================================================

export function renderHTMLReport(project: Project, scenario: Scenario): string {
  const workflows = ((scenario.workflowMaps as any[]) || []) as WorkflowMap[];
  const useCases = (scenario.useCases as any[]) || [];
  const assessment = (scenario.assessment as AssessmentData | null) || null;
  const generatedAt = (() => {
    const raw = scenario.updatedAt || scenario.createdAt;
    if (!raw) return "—";
    return new Date(raw as any).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  })();

  const ucNameMap = new Map<string, string>();
  for (const uc of useCases) {
    if (uc.id && uc.name) ucNameMap.set(uc.id, uc.name);
  }
  for (const wf of workflows) {
    if (wf.useCaseId && wf.useCaseName)
      ucNameMap.set(wf.useCaseId, wf.useCaseName);
  }
  const resolveUcName = (id: string) => ucNameMap.get(id) || id;

  const rows = workflows.map(computeWorkflowMetrics);
  const totals = {
    hoursSaved: rows.reduce((s, r) => s + r.hoursSaved, 0),
    costSaved: rows.reduce((s, r) => s + r.costSaved, 0),
    automation:
      rows.length > 0
        ? rows.reduce((s, r) => s + r.automationPct, 0) / rows.length
        : 0,
  };

  const systems = aggregateSystems(workflows);

  const logoBlue = loadLogo("blueally-logo.png");
  const logoWhite = loadLogo("blueally-logo-white.png");

  const title = `${project.companyName} — AI Workflow Assessment`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="generator" content="BlueAlly AI Workflow" />
  <title>${esc(title)}</title>
  <style>${styles()}</style>
</head>
<body>
  <div class="report">
    ${renderHero(project.companyName, totals.hoursSaved, totals.costSaved, generatedAt, logoWhite)}
    <main>
      ${renderKpis(totals.hoursSaved, totals.costSaved, totals.automation, rows.length)}
      ${renderBenefitsTable(rows)}
      ${renderWorkflows(workflows)}
      ${renderSystems(systems)}
      ${renderAssessment(assessment, resolveUcName)}
    </main>
    ${renderFooter(logoWhite)}
  </div>
  <script>
    // Logo color swap is unnecessary — we use white logo on dark, blue logo elsewhere
    // via inline data URIs. Reserved here for future inline interactivity.
    void ${JSON.stringify(logoBlue.slice(0, 32))};
  </script>
</body>
</html>`;
}
