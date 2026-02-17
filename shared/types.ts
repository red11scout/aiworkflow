// =========================================================================
// STRATEGIC THEMES (Step 1)
// =========================================================================

export interface StrategicTheme {
  id: string;
  name: string;
  currentState: string;
  targetState: string;
  primaryDriverImpact: string;
  secondaryDriver: string;
}

// =========================================================================
// BUSINESS FUNCTIONS & KPIs (Step 2)
// =========================================================================

export interface BusinessFunction {
  id: string;
  function: string;
  subFunction: string;
  kpiName: string;
  direction: string;
  baselineValue: string;
  targetValue: string;
  timeframe: string;
  benchmarkAvg: string;
  benchmarkIndustryBest: string;
  benchmarkOverallBest: string;
  strategicTheme: string;
}

// =========================================================================
// FRICTION POINTS (Step 3)
// =========================================================================

export interface FrictionPoint {
  id: string;
  role: string;
  roleId: string;
  function: string;
  subFunction: string;
  frictionPoint: string;
  severity: string;
  annualHours: number;
  hourlyRate: number;
  loadedHourlyRate: number;
  costFormula: string;
  estimatedAnnualCost: string;
  primaryDriverImpact: string;
  strategicTheme: string;
}

// =========================================================================
// AI USE CASES (Step 4)
// =========================================================================

export interface UseCase {
  id: string;
  name: string;
  description: string;
  function: string;
  subFunction: string;
  aiPrimitives: string[];
  agenticPattern?: string;
  patternRationale?: string;
  hitlCheckpoint: string;
  targetFriction: string;
  strategicTheme: string;
  desiredOutcomes?: string[];
  dataTypes?: string[];
  integrations?: string[];
}

// =========================================================================
// BENEFITS QUANTIFICATION (Step 5)
// =========================================================================

export interface FormulaComponent {
  label: string;
  value: number;
}

export interface FormulaLabels {
  components: FormulaComponent[];
}

export interface BenefitQuantification {
  id: string;
  useCaseId: string;
  useCaseName: string;
  strategicTheme: string;
  costBenefit: string;
  costFormula: string;
  costFormulaLabels: FormulaLabels;
  revenueBenefit: string;
  revenueFormula: string;
  revenueFormulaLabels: FormulaLabels;
  riskBenefit: string;
  riskFormula: string;
  riskFormulaLabels: FormulaLabels;
  cashFlowBenefit: string;
  cashFlowFormula: string;
  cashFlowFormulaLabels: FormulaLabels;
  totalAnnualValue: string;
  expectedValue: string;
  probabilityOfSuccess: number;
}

// =========================================================================
// READINESS & TOKEN MODELING (Step 6)
// =========================================================================

export interface ReadinessModel {
  id: string;
  useCaseId: string;
  useCaseName: string;
  strategicTheme: string;
  dataAvailability: number;
  technicalInfrastructure: number;
  organizationalCapacity: number;
  governance: number;
  readinessScore: number;
  timeToValue: number;
  runsPerMonth: number;
  inputTokensPerRun: number;
  outputTokensPerRun: number;
  monthlyTokens: number;
  annualTokenCost: string;
}

// =========================================================================
// PRIORITY SCORING (Step 7)
// =========================================================================

export interface PriorityScore {
  id: string;
  useCaseId: string;
  useCaseName: string;
  strategicTheme: string;
  valueScore: number;
  readinessScore: number;
  ttvScore: number;
  priorityScore: number;
  priorityTier: string;
  recommendedPhase: string;
}

// =========================================================================
// WORKFLOW VISUALIZATION
// =========================================================================

export interface WorkflowNode {
  id: string;
  stepNumber: number;
  name: string;
  description: string;
  actorType: "human" | "system" | "ai_agent";
  actorName: string;
  duration: string;
  systems: string[];
  isBottleneck: boolean;
  isDecisionPoint: boolean;
  painPoints: string[];
}

export interface TargetWorkflowNode extends WorkflowNode {
  isAIEnabled: boolean;
  isHumanInTheLoop: boolean;
  aiCapabilities: string[];
  automationLevel: "full" | "assisted" | "supervised" | "manual";
}

export interface WorkflowMap {
  useCaseId: string;
  useCaseName: string;
  agenticPattern: string;
  patternRationale: string;
  currentState: WorkflowNode[];
  targetState: TargetWorkflowNode[];
  comparisonMetrics: {
    timeReduction: { before: string; after: string; improvement: string };
    costReduction: { before: string; after: string; improvement: string };
    qualityImprovement: { before: string; after: string; improvement: string };
    throughputIncrease: { before: string; after: string; improvement: string };
  };
  desiredOutcomes: string[];
  dataTypes: string[];
  integrations: string[];
}

// =========================================================================
// SCENARIO ANALYSIS
// =========================================================================

export interface ScenarioProjection {
  npv: string;
  annualBenefit: string;
  paybackMonths: number;
}

export interface ScenarioAnalysis {
  conservative: ScenarioProjection;
  moderate: ScenarioProjection;
  aggressive: ScenarioProjection;
}

export interface MultiYearProjection {
  irr: string;
  npv: string;
  paybackMonths: number;
  totalBenefitOverPeriod: string;
}

// =========================================================================
// EXECUTIVE SUMMARY
// =========================================================================

export interface ExecutiveFinding {
  title: string;
  body: string;
  value: string;
}

export interface ExecutiveSummary {
  headline: string;
  context: string;
  findings: ExecutiveFinding[];
  opportunityTable: {
    rows: Array<{ metric: string; value: string }>;
  };
}

export interface ExecutiveDashboard {
  topUseCases: Array<{
    rank: number;
    useCase: string;
    annualValue: number;
    monthlyTokens: number;
    priorityScore: number;
  }>;
  totalAnnualValue: number;
  totalCostBenefit: number;
  totalRevenueBenefit: number;
  totalRiskBenefit: number;
  totalCashFlowBenefit: number;
  totalMonthlyTokens: number;
  valuePerMillionTokens: number;
}

export interface FrictionRecovery {
  frictionPoint: string;
  recoveries: Array<{
    useCaseId: string;
    recoveryPct: number;
    recoveryAmount: number;
  }>;
}

// =========================================================================
// FULL IMPORTED JSON STRUCTURE
// =========================================================================

export interface ImportedAnalysis {
  companyName: string;
  generatedAt: string;
  analysis: {
    steps: Array<{
      step: number;
      title: string;
      content: string;
      data: any;
    }>;
    summary: string;
    executiveSummary: ExecutiveSummary;
    executiveDashboard: ExecutiveDashboard;
    scenarioAnalysis: ScenarioAnalysis;
    multiYearProjection: MultiYearProjection;
    frictionRecovery: FrictionRecovery[];
    benefitsCapped: boolean;
    capScaleFactor: number;
    validationWarnings: string[];
  };
}
