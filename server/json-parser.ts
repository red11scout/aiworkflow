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
import { parseCurrencyString, formatCurrency } from "@shared/formulas";

/**
 * Maps CognoResearcher "Primary Pattern" display names to aiworkflow pattern IDs.
 * Falls back to empty string if no match found.
 */
function mapPrimaryPatternToId(patternName: string | undefined): string {
  if (!patternName) return "";
  const map: Record<string, string> = {
    "Reflection": "reflection",
    "Tool Use": "tool_use",
    "Planning": "planning",
    "ReAct Loop": "react",
    "Prompt Chaining": "planning",
    "Semantic Router": "planning",
    "Constitutional Guardrail": "reflection",
    "Orchestrator-Workers": "orchestrator_worker",
    "Agent Handoff": "agent_handoff",
    "Parallelization": "parallelization",
    "Generator-Critic": "generator_critic",
    "Group Chat": "group_chat",
  };
  return map[patternName] || "";
}

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
      frictionType: f["Friction Type"] || "",
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
    agenticPattern: u["Agentic Pattern"] || mapPrimaryPatternToId(u["Primary Pattern"]) || "",
    patternRationale: u["Pattern Rationale"] || "",
    desiredOutcomes: Array.isArray(u["Desired Outcomes"])
      ? u["Desired Outcomes"]
      : typeof u["Desired Outcomes"] === "string"
        ? u["Desired Outcomes"].split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
    dataTypes: Array.isArray(u["Data Types"])
      ? u["Data Types"]
      : typeof u["Data Types"] === "string"
        ? u["Data Types"].split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
    integrations: Array.isArray(u["Integrations"])
      ? u["Integrations"]
      : typeof u["Integrations"] === "string"
        ? u["Integrations"].split(",").map((s: string) => s.trim()).filter(Boolean)
        : [],
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

  // -----------------------------------------------------------------------
  // 1:1:1 VALIDATION — detect unmapped friction points and auto-generate
  // placeholder use cases, benefits, and readiness entries to close the gap.
  // -----------------------------------------------------------------------
  const validationWarnings: string[] = [];

  const mappedFrictionTexts = new Set(useCases.map((uc) => uc.targetFriction));
  const unmappedFrictions = frictionPoints.filter(
    (fp) => !mappedFrictionTexts.has(fp.frictionPoint),
  );

  if (unmappedFrictions.length > 0) {
    validationWarnings.push(
      `${unmappedFrictions.length} friction point(s) have no matching use case and were auto-generated: ${unmappedFrictions.map((fp) => `"${fp.frictionPoint.slice(0, 60)}…"`).join("; ")}`,
    );

    unmappedFrictions.forEach((fp, i) => {
      const ucNum = useCases.length + i + 1;
      const ucId = `UC-${String(ucNum).padStart(2, "0")}`;
      const shortName = fp.frictionPoint.split(" ").slice(0, 6).join(" ");

      // Auto-generate use case
      useCases.push({
        id: ucId,
        name: `AI-Assisted ${shortName}`,
        description: `Auto-generated use case targeting unmapped friction: ${fp.frictionPoint}`,
        function: fp.function || "",
        subFunction: fp.subFunction || "",
        aiPrimitives: ["Workflow Automation"],
        hitlCheckpoint: "Manager review and approval before execution",
        targetFriction: fp.frictionPoint,
        strategicTheme: fp.strategicTheme || "",
        agenticPattern: "",
        patternRationale: "",
        desiredOutcomes: [],
        dataTypes: [],
        integrations: [],
      });

      // Auto-generate conservative benefit (25% friction recovery)
      const frictionCost = parseCurrencyString(fp.estimatedAnnualCost);
      const hoursSaved = Math.round((fp.annualHours || 0) * 0.25);
      const rate = fp.loadedHourlyRate || fp.hourlyRate || 65;
      const costBenefit = hoursSaved * rate * 1.35 * 0.9 * 0.75;
      const prob = 0.6;

      benefits.push({
        id: ucId,
        useCaseId: ucId,
        useCaseName: `AI-Assisted ${shortName}`,
        strategicTheme: fp.strategicTheme || "",
        costBenefit: formatCurrency(costBenefit),
        costFormula: `${hoursSaved} hrs × $${rate}/hr × 1.35 × 0.9 × 0.75`,
        costFormulaLabels: {
          components: [
            { label: "Hours Saved", value: hoursSaved },
            { label: "Loaded Hourly Rate", value: rate },
            { label: "Benefits Loading", value: 1.35 },
            { label: "Adoption Rate", value: 0.9 },
            { label: "Data Maturity", value: 0.75 },
          ],
        },
        revenueBenefit: "$0",
        revenueFormula: "No direct impact",
        revenueFormulaLabels: { components: [] },
        riskBenefit: "$0",
        riskFormula: "No direct impact",
        riskFormulaLabels: { components: [] },
        cashFlowBenefit: "$0",
        cashFlowFormula: "No direct impact",
        cashFlowFormulaLabels: { components: [] },
        totalAnnualValue: formatCurrency(costBenefit),
        expectedValue: formatCurrency(costBenefit * prob),
        probabilityOfSuccess: prob,
      });

      // Auto-generate midpoint readiness entry
      readiness.push({
        id: ucId,
        useCaseId: ucId,
        useCaseName: `AI-Assisted ${shortName}`,
        strategicTheme: fp.strategicTheme || "",
        dataAvailability: 5,
        technicalInfrastructure: 5,
        organizationalCapacity: 5,
        governance: 5,
        readinessScore: 5,
        timeToValue: 12,
        runsPerMonth: 100,
        inputTokensPerRun: 2000,
        outputTokensPerRun: 1000,
        monthlyTokens: 300000,
        annualTokenCost: "$16",
      });
    });
  }

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
    validationWarnings,
  };
}
