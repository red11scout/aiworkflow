import ExcelJS from "exceljs";
import type { Project, Scenario } from "@shared/schema";
import { formatCurrency, parseCurrencyString } from "@shared/formulas";
import type { AssessmentData, AssessmentAnswer, CategoryScore } from "@shared/types";
import { CATEGORY_METADATA, ASSESSMENT_STATUS_THRESHOLDS, ASSESSMENT_QUESTIONS, MATURITY_LEVELS } from "@shared/assessment-questions";

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

  // =========================================================================
  // ASSESSMENT SHEETS (only when assessment data with scores exists)
  // =========================================================================

  const assessment = scenario.assessment as AssessmentData | null;
  if (assessment?.scores) {
    const scores = assessment.scores;
    const answers = assessment.answers || [];
    const questions = assessment.questions || [];
    const gapGuidance = assessment.gapGuidance || {};

    // Build a lookup: questionId → answer score
    const answerMap = new Map<string, number | null>();
    answers.forEach((a: AssessmentAnswer) => answerMap.set(a.questionId, a.score));

    // Helper to get status label from key
    const statusLabel = (key: string): string => {
      const found = ASSESSMENT_STATUS_THRESHOLDS.find((t) => t.key === key);
      return found?.label || key;
    };

    // --- Assessment Summary sheet ---
    const assessSummarySheet = workbook.addWorksheet("Assessment Summary");
    assessSummarySheet.columns = [
      { header: "", key: "a", width: 30 },
      { header: "", key: "b", width: 18 },
      { header: "", key: "c", width: 18 },
      { header: "", key: "d", width: 14 },
      { header: "", key: "e", width: 18 },
    ];

    // Row 1: Title
    const titleRow = assessSummarySheet.getRow(1);
    titleRow.getCell(1).value = "AI Readiness Assessment Summary";
    titleRow.getCell(1).font = { bold: true, size: 14, color: { argb: "FF001278" } };
    titleRow.height = 28;

    // Row 3: Overall score
    const overallRow = assessSummarySheet.getRow(3);
    overallRow.getCell(1).value = "Overall Score";
    overallRow.getCell(1).font = { bold: true, size: 11 };
    overallRow.getCell(2).value = `${Math.round(scores.overallPercentage)}%`;
    overallRow.getCell(2).font = { bold: true, size: 11 };
    overallRow.getCell(3).value = statusLabel(scores.overallStatus);
    overallRow.getCell(3).font = { bold: true, size: 11 };

    // Row 5: Category Scores header
    const catHeaderRow = assessSummarySheet.getRow(5);
    catHeaderRow.values = ["Category", "Score", "Status", "Answered", "Total Questions"];
    catHeaderRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF001278" } };
      cell.font = { color: { argb: "FFFFFFFF" }, bold: true, size: 11 };
      cell.alignment = { vertical: "middle" };
    });
    catHeaderRow.height = 24;

    // Category rows
    let currentRow = 6;
    scores.categories.forEach((cat: CategoryScore) => {
      const meta = CATEGORY_METADATA[cat.category];
      const row = assessSummarySheet.getRow(currentRow);
      row.values = [
        meta?.label || cat.category,
        `${Math.round(cat.percentage)}%`,
        statusLabel(cat.status),
        cat.answeredCount,
        cat.questionCount,
      ];
      row.getCell(1).font = { bold: true };
      currentRow++;

      // Sub-category rows (indented)
      cat.subCategories.forEach((sub) => {
        const subRow = assessSummarySheet.getRow(currentRow);
        subRow.values = [
          `  ${sub.subCategory}`,
          `${Math.round(sub.percentage)}%`,
          statusLabel(sub.status),
          sub.answeredCount,
          sub.questionCount,
        ];
        subRow.getCell(1).font = { italic: true, color: { argb: "FF64748B" } };
        subRow.getCell(2).font = { color: { argb: "FF64748B" } };
        subRow.getCell(3).font = { color: { argb: "FF64748B" } };
        currentRow++;
      });
    });

    // --- Assessment Questions sheet ---
    const questionsSheet = workbook.addWorksheet("Assessment Questions");
    questionsSheet.columns = [
      { header: "Question ID", key: "id", width: 12 },
      { header: "Category", key: "category", width: 18 },
      { header: "Sub-Category", key: "subCategory", width: 22 },
      { header: "Question", key: "question", width: 60 },
      { header: "Weight", key: "weight", width: 8 },
      { header: "Score", key: "score", width: 8 },
      { header: "Max Score", key: "maxScore", width: 10 },
    ];
    styleHeader(questionsSheet);

    questions.forEach((q) => {
      const answer = answerMap.get(q.id);
      const score = answer != null ? answer : 0;
      const maxScore = q.weight * 5;
      const meta = CATEGORY_METADATA[q.category];
      const row = questionsSheet.addRow({
        id: q.id,
        category: meta?.label || q.category,
        subCategory: q.subCategory,
        question: q.questionText,
        weight: q.weight,
        score,
        maxScore,
      });

      // Conditional formatting: score cell background
      const scoreCell = row.getCell(6);
      if (answer != null) {
        if (answer <= 2) {
          scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
          scoreCell.font = { color: { argb: "FF991B1B" }, bold: true };
        } else if (answer === 3) {
          scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
          scoreCell.font = { color: { argb: "FF92400E" }, bold: true };
        } else {
          scoreCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } };
          scoreCell.font = { color: { argb: "FF166534" }, bold: true };
        }
      }
    });

    // --- Gap Analysis sheet ---
    const gapSheet = workbook.addWorksheet("Gap Analysis");
    gapSheet.columns = [
      { header: "Question ID", key: "id", width: 12 },
      { header: "Category", key: "category", width: 18 },
      { header: "Question", key: "question", width: 60 },
      { header: "Current Score", key: "currentScore", width: 14 },
      { header: "Weight", key: "weight", width: 8 },
      { header: "Gap Size", key: "gapSize", width: 10 },
      { header: "AI Guidance", key: "guidance", width: 60 },
    ];
    styleHeader(gapSheet);

    // Collect gaps: questions with score < 3
    const gaps: Array<{
      id: string;
      category: string;
      question: string;
      currentScore: number;
      weight: number;
      gapSize: number;
      guidance: string;
    }> = [];

    questions.forEach((q) => {
      const answer = answerMap.get(q.id);
      const score = answer != null ? answer : 0;
      if (score < 3) {
        const meta = CATEGORY_METADATA[q.category];
        const gapSize = (q.weight * 5) - (score * q.weight);
        gaps.push({
          id: q.id,
          category: meta?.label || q.category,
          question: q.questionText,
          currentScore: score,
          weight: q.weight,
          gapSize,
          guidance: gapGuidance[q.id] || "",
        });
      }
    });

    // Sort by gap size descending
    gaps.sort((a, b) => b.gapSize - a.gapSize);

    gaps.forEach((g) => {
      gapSheet.addRow({
        id: g.id,
        category: g.category,
        question: g.question,
        currentScore: g.currentScore,
        weight: g.weight,
        gapSize: g.gapSize,
        guidance: g.guidance,
      });
    });

    // --- Use Case Readiness sheet ---
    if (scores.useCaseScores && scores.useCaseScores.length > 0) {
      const ucReadinessSheet = workbook.addWorksheet("Use Case Readiness");
      ucReadinessSheet.columns = [
        { header: "Use Case", key: "useCaseName", width: 35 },
        { header: "Score", key: "score", width: 12 },
        { header: "Status", key: "status", width: 14 },
        { header: "Questions Mapped", key: "questionCount", width: 18 },
        { header: "Gaps", key: "gapCount", width: 10 },
      ];
      styleHeader(ucReadinessSheet);

      scores.useCaseScores.forEach((uc: any) => {
        const pct = Math.round((uc.percentage ?? 0) * 100);
        const row = ucReadinessSheet.addRow({
          useCaseName: uc.useCaseName || uc.useCaseId,
          score: `${pct}%`,
          status: statusLabel(uc.status),
          questionCount: uc.mappedQuestionIds?.length || 0,
          gapCount: uc.gaps?.length || 0,
        });

        // Color-code score cell
        const scoreCell = row.getCell(2);
        if (pct >= 80) {
          scoreCell.font = { bold: true, color: { argb: "FF166534" } };
        } else if (pct >= 60) {
          scoreCell.font = { bold: true, color: { argb: "FF1E40AF" } };
        } else if (pct >= 40) {
          scoreCell.font = { bold: true, color: { argb: "FF92400E" } };
        } else {
          scoreCell.font = { bold: true, color: { argb: "FF991B1B" } };
        }
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// =========================================================================
// ASSESSMENT TEMPLATE — downloadable Excel with use-case mappings
// =========================================================================

export async function generateAssessmentTemplate(
  project: Project,
  scenario: Scenario,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BlueAlly AI Workflow";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Complete Assessment");

  // Column widths
  sheet.columns = [
    { width: 5 },   // A: #
    { width: 22 },  // B: Category
    { width: 25 },  // C: Sub-Category
    { width: 60 },  // D: Question
    { width: 45 },  // E: Helpful Hint
    { width: 18 },  // F: Maturity Level
    { width: 40 },  // G: Notes
    { width: 40 },  // H: Use Case Impact
    { width: 8 },   // I: Weight
  ];

  const navyFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF001278" } };
  const lightGrayFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  const yellowFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFDE7" } };
  const whiteFont: Partial<ExcelJS.Font> = { color: { argb: "FFFFFFFF" }, bold: true };
  const navyFont: Partial<ExcelJS.Font> = { color: { argb: "FF001278" } };

  // --- Rows 1-7: Instructions ---

  // Row 1: Three sections — Title (A-D), Maturity Levels (E-F), Interpretation (G-I)
  const r1 = sheet.getRow(1);
  r1.height = 32;

  // Title section (A1:D1)
  sheet.mergeCells("A1:D1");
  r1.getCell(1).value = "AI READINESS ASSESSMENT";
  r1.getCell(1).font = { ...whiteFont, size: 14 };
  for (let c = 1; c <= 4; c++) { r1.getCell(c).fill = navyFill; }

  // Maturity definitions header (E1:F1)
  sheet.mergeCells("E1:F1");
  r1.getCell(5).value = "MATURITY LEVEL DEFINITIONS";
  r1.getCell(5).font = { ...whiteFont, size: 11 };
  for (let c = 5; c <= 6; c++) { r1.getCell(c).fill = navyFill; }

  // Interpretation header (G1:I1)
  sheet.mergeCells("G1:I1");
  r1.getCell(7).value = "HOW TO INTERPRET YOUR RESULTS";
  r1.getCell(7).font = { ...whiteFont, size: 11 };
  for (let c = 7; c <= 9; c++) { r1.getCell(c).fill = navyFill; }

  // Company info (rows 2-3, cols A-D)
  sheet.getCell("B2").value = `Company: ${project.companyName || ""}`;
  sheet.getCell("B2").font = { bold: true, size: 11 };
  sheet.getCell("B3").value = `Date: ${new Date().toLocaleDateString()}`;

  // Maturity level descriptions (rows 2-6, cols E-F)
  const levels = Object.entries(MATURITY_LEVELS) as [string, { label: string; description: string }][];
  levels.forEach(([num, lvl], i) => {
    const row = i + 2; // rows 2-6
    sheet.mergeCells(`E${row}:F${row}`);
    sheet.getCell(`E${row}`).value = `Level ${num} - ${lvl.label}: ${lvl.description}`;
    sheet.getCell(`E${row}`).font = { size: 9, color: { argb: "FF475569" } };
  });

  // Interpretation guide (rows 2-5, cols G-I)
  const interpretations = [
    "80-100%: Ready — Strong foundations for AI implementation",
    "60-79%: Developing — Good progress with some gaps to address",
    "40-59%: Building — Foundational work needed in key areas",
    "0-39%: Early Stage — Significant investment required",
  ];
  interpretations.forEach((text, i) => {
    sheet.mergeCells(`G${i + 2}:I${i + 2}`);
    sheet.getCell(`G${i + 2}`).value = text;
    sheet.getCell(`G${i + 2}`).font = { size: 9, color: { argb: "FF475569" } };
  });

  // Row 7: blank separator
  sheet.getRow(7).height = 8;

  // --- Row 8: Section header ---
  sheet.mergeCells("A8:I8");
  const r8 = sheet.getRow(8);
  r8.getCell(1).value = "COMPLETE ASSESSMENT";
  r8.getCell(1).font = { ...whiteFont, size: 12 };
  r8.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
  r8.height = 28;
  for (let c = 1; c <= 9; c++) { r8.getCell(c).fill = navyFill; }

  // --- Row 9: Description ---
  sheet.mergeCells("A9:I9");
  const r9 = sheet.getRow(9);
  r9.getCell(1).value = "Score each question from 1 (Exploring) to 5 (Realizing). Add notes in column G to capture context.";
  r9.getCell(1).font = { italic: true, size: 10, color: { argb: "FF64748B" } };
  r9.getCell(1).alignment = { horizontal: "center" };
  r9.height = 22;

  // --- Row 10: Column headers ---
  const headerRow = sheet.getRow(10);
  const headers = ["#", "Category", "Sub-Category", "Question", "Helpful Hint", "Maturity Level", "Notes", "Use Case Impact", "Weight"];
  headerRow.values = headers;
  headerRow.eachCell((cell) => {
    cell.fill = navyFill;
    cell.font = { ...whiteFont, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  headerRow.height = 24;

  // --- Build use case name lookup ---
  const useCases = (scenario.useCases || []) as any[];
  const ucNameMap = new Map<string, string>();
  useCases.forEach((uc: any) => {
    ucNameMap.set(uc.id, uc.name || uc.id);
  });

  // Get mapped questions from assessment data (if mapping complete)
  const assessmentQuestions = scenario.assessment?.useCaseMappingStatus === "complete"
    ? (scenario.assessment.questions || [])
    : [];
  const mappingLookup = new Map<string, string[]>();
  assessmentQuestions.forEach((q: any) => {
    if (q.useCasesImpacted?.length > 0) {
      mappingLookup.set(q.id, q.useCasesImpacted);
    }
  });

  // --- Rows 11-77: Questions ---
  let currentCategory = "";
  ASSESSMENT_QUESTIONS.forEach((q, idx) => {
    const rowNum = 11 + idx;
    const row = sheet.getRow(rowNum);
    const meta = CATEGORY_METADATA[q.category];
    const categoryLabel = meta?.label || q.category;

    // Resolve use case IDs to names
    const ucIds = mappingLookup.get(q.id) || [];
    const ucNames = ucIds.map((id) => ucNameMap.get(id) || id).join(", ");

    row.values = [
      idx + 1,           // A: #
      categoryLabel,     // B: Category
      q.subCategory,     // C: Sub-Category
      q.questionText,    // D: Question
      q.hint,            // E: Helpful Hint
      "",                // F: Maturity Level (blank — user fills in)
      "",                // G: Notes (blank — user fills in)
      ucNames,           // H: Use Case Impact
      q.weight,          // I: Weight
    ];

    // Style: wrap text on question and hint columns
    row.getCell(4).alignment = { wrapText: true, vertical: "top" };
    row.getCell(5).alignment = { wrapText: true, vertical: "top" };
    row.getCell(8).alignment = { wrapText: true, vertical: "top" };

    // Highlight fill-in columns F and G
    row.getCell(6).fill = yellowFill;
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };

    // Category section separator: light blue on first question of each new category
    if (categoryLabel !== currentCategory) {
      currentCategory = categoryLabel;
      for (let c = 1; c <= 9; c++) {
        if (c !== 6 && c !== 7) { // don't override yellow on F/G
          row.getCell(c).fill = lightGrayFill;
        }
      }
      row.getCell(2).font = { bold: true, ...navyFont };
    }

    // Data validation dropdown on Col F (Maturity Level)
    row.getCell(6).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"1 - Exploring,2 - Planning,3 - Implementing,4 - Scaling,5 - Realizing"'],
      showErrorMessage: true,
      errorTitle: "Invalid Score",
      error: "Please select a maturity level from 1 to 5",
    };

    row.height = 30;
  });

  // Freeze panes: freeze above row 11, after column 0 (scroll headers stay visible)
  sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 10, topLeftCell: "A11", activeCell: "F11" }];

  // Auto-filter on header row
  sheet.autoFilter = { from: "A10", to: "I10" };

  // Print setup
  sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// =========================================================================
// ASSESSMENT UPLOAD — parse completed Excel back into answer data
// =========================================================================

export async function parseAssessmentUpload(
  fileBuffer: Buffer,
): Promise<{ answers: Array<{ questionId: string; score: number | null; notes: string }>; warnings: string[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  // Find the right sheet
  const sheet = workbook.getWorksheet("Complete Assessment") || workbook.worksheets[0];
  if (!sheet) throw new Error("No worksheet found in uploaded file");

  // Find the data start row by scanning for the header row
  let dataStartRow = 11; // default for our template
  for (let r = 1; r <= 20; r++) {
    const row = sheet.getRow(r);
    const colA = getCellText(row.getCell(1)).toLowerCase();
    const colD = getCellText(row.getCell(4)).toLowerCase();
    if (colA === "#" && colD.includes("question")) {
      dataStartRow = r + 1;
      break;
    }
  }

  const answers: Array<{ questionId: string; score: number | null; notes: string }> = [];
  const warnings: string[] = [];
  let parsedScores = 0;

  for (let i = 0; i < ASSESSMENT_QUESTIONS.length; i++) {
    const rowIdx = dataStartRow + i;
    const row = sheet.getRow(rowIdx);
    const questionId = ASSESSMENT_QUESTIONS[i].id;

    // Validate row number matches (col A)
    const rowNumVal = getCellText(row.getCell(1));
    if (rowNumVal && parseInt(rowNumVal) !== i + 1) {
      // Row number mismatch — try to continue but warn
      warnings.push(`Row ${rowIdx}: Expected question #${i + 1} but found #${rowNumVal}`);
    }

    // Parse Col F: Maturity Level
    const rawScore = getCellText(row.getCell(6));
    let score: number | null = null;
    if (rawScore && rawScore.trim() !== "") {
      const scoreStr = rawScore.trim();
      const numMatch = scoreStr.match(/^(\d)/);
      if (numMatch) {
        const num = parseInt(numMatch[1]);
        if (num >= 1 && num <= 5) {
          score = num;
          parsedScores++;
        } else {
          warnings.push(`${questionId}: Score "${scoreStr}" out of range (1-5), skipped`);
        }
      } else {
        warnings.push(`${questionId}: Could not parse score "${scoreStr}"`);
      }
    }

    // Parse Col G: Notes
    const notes = getCellText(row.getCell(7)).trim();

    answers.push({ questionId, score, notes });
  }

  if (parsedScores === 0) {
    warnings.push("No scores found. Ensure scores are in column F (Maturity Level).");
  } else {
    const blank = ASSESSMENT_QUESTIONS.length - parsedScores;
    if (blank > 0) {
      warnings.push(`Parsed ${parsedScores} of ${ASSESSMENT_QUESTIONS.length} scores (${blank} blank)`);
    }
  }

  return { answers, warnings };
}

/** Extract text value from an ExcelJS cell (handles formulas, rich text, etc.) */
function getCellText(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (val == null) return "";
  if (typeof val === "object") {
    if ("result" in val) return String((val as any).result ?? "");
    if ("richText" in val) return (val as any).richText.map((rt: any) => rt.text).join("");
    if ("text" in val) return String((val as any).text ?? "");
  }
  return String(val);
}

// =========================================================================
// HTML REPORT (self-contained, print-to-PDF)
// Implementation lives in report-renderer.ts.
// =========================================================================

export { renderHTMLReport as generateHTMLReport } from "./report-renderer";

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
