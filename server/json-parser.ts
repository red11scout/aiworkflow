import type {
  ImportedAnalysis,
  StrategicTheme,
  BusinessFunction,
  FrictionPoint,
  UseCase,
  BenefitQuantification,
  ReadinessModel,
  PriorityScore,
} from "@shared/types";

/**
 * Parses the uploaded JSON assessment file and maps each step
 * to strongly-typed arrays for storage in scenario JSONB columns.
 */
export function parseImportedJSON(raw: ImportedAnalysis) {
  const steps = raw.analysis.steps;

  // Step 0: Company Overview (plain text)
  const companyOverview = steps.find((s) => s.step === 0)?.content || "";

  // Step 1: Strategic Themes
  const themesRaw = steps.find((s) => s.step === 1)?.data || [];
  const strategicThemes: StrategicTheme[] = themesRaw.map(
    (t: any, i: number) => ({
      id: `ST-${String(i + 1).padStart(2, "0")}`,
      name: t["Strategic Theme"] || "",
      currentState: t["Current State"] || "",
      targetState: t["Target State"] || "",
      primaryDriverImpact: t["Primary Driver Impact"] || "",
      secondaryDriver: t["Secondary Driver"] || "",
    }),
  );

  // Step 2: Business Functions & KPIs
  const bfRaw = steps.find((s) => s.step === 2)?.data || [];
  const businessFunctions: BusinessFunction[] = bfRaw.map(
    (b: any, i: number) => ({
      id: `BF-${String(i + 1).padStart(2, "0")}`,
      function: b["Function"] || "",
      subFunction: b["Sub-Function"] || "",
      kpiName: b["KPI Name"] || "",
      direction: b["Direction"] || "",
      baselineValue: b["Baseline Value"] || "",
      targetValue: b["Target Value"] || "",
      timeframe: b["Timeframe"] || "",
      benchmarkAvg: b["Benchmark (Avg)"] || "",
      benchmarkIndustryBest: b["Benchmark (Industry Best)"] || "",
      benchmarkOverallBest: b["Benchmark (Overall Best)"] || "",
      strategicTheme: b["Strategic Theme"] || "",
    }),
  );

  // Step 3: Friction Points
  const fpRaw = steps.find((s) => s.step === 3)?.data || [];
  const frictionPoints: FrictionPoint[] = fpRaw.map(
    (f: any, i: number) => ({
      id: `FP-${String(i + 1).padStart(2, "0")}`,
      role: f["Role"] || "",
      roleId: f["Role ID"] || "",
      function: f["Function"] || "",
      subFunction: f["Sub-Function"] || "",
      frictionPoint: f["Friction Point"] || "",
      severity: f["Severity"] || "Medium",
      annualHours: f["Annual Hours"] || 0,
      hourlyRate: f["Hourly Rate"] || 0,
      loadedHourlyRate: f["Loaded Hourly Rate"] || 0,
      costFormula: f["Cost Formula"] || "",
      estimatedAnnualCost: f["Estimated Annual Cost ($)"] || "$0",
      primaryDriverImpact: f["Primary Driver Impact"] || "",
      strategicTheme: f["Strategic Theme"] || "",
    }),
  );

  // Step 4: AI Use Cases
  const ucRaw = steps.find((s) => s.step === 4)?.data || [];
  const useCases: UseCase[] = ucRaw.map((u: any) => ({
    id: u["ID"] || "",
    name: u["Use Case Name"] || "",
    description: u["Description"] || "",
    function: u["Function"] || "",
    subFunction: u["Sub-Function"] || "",
    aiPrimitives: (u["AI Primitives"] || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
    hitlCheckpoint: u["Human-in-the-Loop Checkpoint"] || "",
    targetFriction: u["Target Friction"] || "",
    strategicTheme: u["Strategic Theme"] || "",
  }));

  // Step 5: Benefits Quantification
  const benRaw = steps.find((s) => s.step === 5)?.data || [];
  const benefits: BenefitQuantification[] = benRaw.map((b: any) => ({
    id: b["ID"] || "",
    useCaseId: b["ID"] || "",
    useCaseName: b["Use Case"] || "",
    strategicTheme: b["Strategic Theme"] || "",
    costBenefit: b["Cost Benefit ($)"] || "$0",
    costFormula: b["Cost Formula"] || "",
    costFormulaLabels: b["Cost Formula Labels"] || { components: [] },
    revenueBenefit: b["Revenue Benefit ($)"] || "$0",
    revenueFormula: b["Revenue Formula"] || "",
    revenueFormulaLabels: b["Revenue Formula Labels"] || { components: [] },
    riskBenefit: b["Risk Benefit ($)"] || "$0",
    riskFormula: b["Risk Formula"] || "",
    riskFormulaLabels: b["Risk Formula Labels"] || { components: [] },
    cashFlowBenefit: b["Cash Flow Benefit ($)"] || "$0",
    cashFlowFormula: b["Cash Flow Formula"] || "",
    cashFlowFormulaLabels: b["Cash Flow Formula Labels"] || {
      components: [],
    },
    totalAnnualValue: b["Total Annual Value ($)"] || "$0",
    expectedValue: b["Expected Value ($)"] || "$0",
    probabilityOfSuccess: b["Probability of Success"] || 0.75,
  }));

  // Step 6: Readiness & Token Modeling
  const readRaw = steps.find((s) => s.step === 6)?.data || [];
  const readiness: ReadinessModel[] = readRaw.map((r: any) => ({
    id: r["ID"] || "",
    useCaseId: r["ID"] || "",
    useCaseName: r["Use Case"] || "",
    strategicTheme: r["Strategic Theme"] || "",
    dataAvailability: r["Data Availability & Quality"] || 5,
    technicalInfrastructure: r["Technical Infrastructure"] || 5,
    organizationalCapacity: r["Organizational Capacity"] || 5,
    governance: r["Governance"] || 5,
    readinessScore: r["Readiness Score"] || 5,
    timeToValue: r["Time To Value"] || 12,
    runsPerMonth: r["Runs/Month"] || 0,
    inputTokensPerRun: r["Input Tokens/Run"] || 0,
    outputTokensPerRun: r["Output Tokens/Run"] || 0,
    monthlyTokens: r["Monthly Tokens"] || 0,
    annualTokenCost: r["Annual Token Cost"] || "$0",
  }));

  // Step 7: Priority Scoring
  const prioRaw = steps.find((s) => s.step === 7)?.data || [];
  const priorities: PriorityScore[] = prioRaw.map((p: any) => ({
    id: p["ID"] || "",
    useCaseId: p["ID"] || "",
    useCaseName: p["Use Case"] || "",
    strategicTheme: p["Strategic Theme"] || "",
    valueScore: p["Value Score"] || 0,
    readinessScore: p["Readiness Score"] || 0,
    ttvScore: p["TTV Score"] || 0,
    priorityScore: p["Priority Score"] || 0,
    priorityTier: p["Priority Tier"] || "",
    recommendedPhase: p["Recommended Phase"] || "Q4",
  }));

  return {
    companyOverview,
    strategicThemes,
    businessFunctions,
    frictionPoints,
    useCases,
    benefits,
    readiness,
    priorities,
    executiveSummary: raw.analysis.executiveSummary || null,
    executiveDashboard: raw.analysis.executiveDashboard || null,
    scenarioAnalysis: raw.analysis.scenarioAnalysis || null,
    multiYear: raw.analysis.multiYearProjection || null,
    frictionRecovery: raw.analysis.frictionRecovery || null,
    analysisSummary: raw.analysis.summary || "",
  };
}
