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
  frictionType?: string;
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
// EPOCH FRAMEWORK (Human-in-the-Loop Decision Categories)
// =========================================================================

export type EpochCategory = "ethical" | "political" | "operational" | "creative" | "human";

export interface HITLCheckpoint {
  id: string;
  epochCategory: EpochCategory;
  description: string;
  approverRole: string;
  isRequired: boolean;
  estimatedMinutes: number;
}

// =========================================================================
// DATA SPECIFICATIONS
// =========================================================================

export interface WorkflowDataSpec {
  name: string;
  type: "structured" | "semi_structured" | "unstructured" | "real_time";
  source?: string;
  format?: string;
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
// INTERACTIVE WORKFLOW BUILDER (extends base workflow types)
// =========================================================================

export interface InteractiveWorkflowNode extends TargetWorkflowNode {
  /** Number of employees performing this task */
  employeeCount?: number;
  /** Average hourly cost (pre-populated from StandardizedRole) */
  avgHourlyCost?: number;
  /** Hours per single execution of this task */
  hoursPerTask?: number;
  /** Number of executions per month */
  tasksPerMonth?: number;
  /** Input data specifications */
  inputs?: WorkflowDataSpec[];
  /** Output data specifications */
  outputs?: WorkflowDataSpec[];
  /** Data sources this step accesses */
  dataSources?: string[];
  /** HITL checkpoint (if this node is a decision gate) */
  hitlCheckpoint?: HITLCheckpoint;
  /** Friction type associated with this step */
  frictionType?: "process" | "data" | "technology" | "knowledge";
  /** Connections to next nodes */
  nextNodeIds?: string[];
  /** Connections from previous nodes */
  prevNodeIds?: string[];
  /** React Flow position (for canvas rendering) */
  position?: { x: number; y: number };
}

export interface WorkflowStaffing {
  employeeCount: number;
  avgHourlyCost: number;
  hoursPerWeek: number;
}

export interface WorkflowLiveMetrics {
  currentTotalHours: number;
  targetTotalHours: number;
  hoursSaved: number;
  costSaved: number;
  timeReductionPct: number;
  costReductionPct: number;
  fteEquivalent: number;
  automationPct: number;
  hitlCheckpointCount: number;
}

export interface InteractiveWorkflowMap extends WorkflowMap {
  /** Builder version for forward compatibility */
  builderVersion: number;
  /** Last edited timestamp */
  lastEditedAt: string;
  /** Whether user has modified from imported/AI-generated state */
  isUserModified: boolean;
  /** Staffing estimates for cost calculations */
  currentStaffing?: WorkflowStaffing;
  /** Real-time calculated metrics (populated by HyperFormula) */
  liveMetrics?: WorkflowLiveMetrics;
  /** Interactive nodes with positions and extended data */
  currentStateInteractive?: InteractiveWorkflowNode[];
  /** Interactive target nodes */
  targetStateInteractive?: InteractiveWorkflowNode[];
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
