// =========================================================================
// HYPERFORMULA CALCULATION ENGINE
// Wraps all deterministic formulas from formulas.ts in HyperFormula
// spreadsheet engine for verified, auditable calculations.
// =========================================================================

import HyperFormula from "hyperformula";

// -------------------------------------------------------------------------
// SHEET LAYOUT DEFINITIONS
// Each calculation domain gets a dedicated sheet with named columns.
// -------------------------------------------------------------------------

/**
 * Benefits Sheet Layout (one row per use case):
 * A: hoursSaved, B: loadedRate, C: benefitsLoading, D: adoptionRate, E: dataMaturity
 * F: =A*B*C*D*E (costBenefit)
 * G: upliftPct, H: revenueAtRisk, I: realizationFactor, J: dataMaturity_rev
 * K: =G*H*I*J (revenueBenefit)
 * L: riskReductionPct, M: riskExposure, N: realizationFactor_risk, O: dataMaturity_risk
 * P: =L*M*N*O (riskBenefit)
 * Q: annualRevenue, R: daysImproved, S: costOfCapital, T: realizationFactor_cf, U: dataMaturity_cf
 * V: =Q*(R/365)*S*T*U (cashFlowBenefit)
 * W: =F+K+P+V (totalAnnualValue)
 * X: probabilityOfSuccess
 * Y: =W*X (expectedValue)
 * Z: benefitMultiplier (scenario)
 * AA: =F*Z, AB: =K*Z, AC: =P*Z, AD: =V*Z (scenario-adjusted)
 * AE: =AA+AB+AC+AD (scenario total)
 * AF: probabilityMultiplier
 * AG: =MIN(1, X*AF) (adjusted probability)
 * AH: =AE*AG (scenario expected value)
 */

// Column indices for benefits sheet
const BEN = {
  HOURS_SAVED: 0, LOADED_RATE: 1, BENEFITS_LOADING: 2, ADOPTION_RATE: 3, DATA_MATURITY_COST: 4,
  COST_BENEFIT: 5,
  UPLIFT_PCT: 6, REV_AT_RISK: 7, REALIZATION_REV: 8, DATA_MATURITY_REV: 9,
  REVENUE_BENEFIT: 10,
  RISK_REDUCTION: 11, RISK_EXPOSURE: 12, REALIZATION_RISK: 13, DATA_MATURITY_RISK: 14,
  RISK_BENEFIT: 15,
  ANNUAL_REV: 16, DAYS_IMPROVED: 17, COST_OF_CAPITAL: 18, REALIZATION_CF: 19, DATA_MATURITY_CF: 20,
  CASHFLOW_BENEFIT: 21,
  TOTAL_ANNUAL: 22,
  PROB_SUCCESS: 23,
  EXPECTED_VALUE: 24,
  BENEFIT_MULT: 25,
  COST_ADJ: 26, REV_ADJ: 27, RISK_ADJ: 28, CF_ADJ: 29,
  TOTAL_ADJ: 30,
  PROB_MULT: 31,
  ADJ_PROB: 32,
  SCENARIO_EV: 33,
};

/**
 * Readiness Sheet Layout (one row per use case):
 * A: dataAvailability, B: technicalInfrastructure, C: organizationalCapacity, D: governance
 * E: =A*0.30 + B*0.20 + C*0.30 + D*0.20 (readinessScore)
 * F: runsPerMonth, G: inputTokensPerRun, H: outputTokensPerRun
 * I: =F*(G+H) (monthlyTokens)
 * J: =(F*G*3/1000000 + F*H*15/1000000)*12 (annualTokenCost)
 */

const READ = {
  DATA: 0, TECH: 1, ORG: 2, GOV: 3,
  READINESS: 4,
  RUNS: 5, INPUT_TOKENS: 6, OUTPUT_TOKENS: 7,
  MONTHLY_TOKENS: 8,
  ANNUAL_TOKEN_COST: 9,
};

/**
 * Workflow Metrics Sheet Layout (one row per workflow step):
 * A: employeeCount, B: avgHourlyCost, C: hoursPerTask, D: tasksPerMonth
 * E: =A*B*C*D (monthlyStepCost)
 * F: =C*D (monthlyHours)
 * G: isAIEnabled (1 or 0)
 * H: automationLevel (1=full, 0.75=assisted, 0.5=supervised, 0=manual)
 */

const WF = {
  EMPLOYEES: 0, HOURLY_COST: 1, HOURS_PER_TASK: 2, TASKS_PER_MONTH: 3,
  MONTHLY_COST: 4,
  MONTHLY_HOURS: 5,
  IS_AI: 6,
  AUTOMATION_LEVEL: 7,
};

// -------------------------------------------------------------------------
// HELPER: Convert column index to Excel column letter
// -------------------------------------------------------------------------

function colLetter(idx: number): string {
  let s = "";
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function cellRef(col: number, row: number): string {
  return `${colLetter(col)}${row + 1}`;
}

// -------------------------------------------------------------------------
// BENEFITS CALCULATION ENGINE
// -------------------------------------------------------------------------

export interface BenefitInputs {
  hoursSaved: number;
  loadedRate: number;
  benefitsLoading: number;
  adoptionRate: number;
  dataMaturityCost: number;
  upliftPct: number;
  revenueAtRisk: number;
  realizationRev: number;
  dataMaturityRev: number;
  riskReduction: number;
  riskExposure: number;
  realizationRisk: number;
  dataMaturityRisk: number;
  annualRevenue: number;
  daysImproved: number;
  costOfCapital: number;
  realizationCf: number;
  dataMaturityCf: number;
  probabilityOfSuccess: number;
  benefitMultiplier?: number;
  probabilityMultiplier?: number;
}

export interface BenefitOutputs {
  costBenefit: number;
  revenueBenefit: number;
  riskBenefit: number;
  cashFlowBenefit: number;
  totalAnnualValue: number;
  expectedValue: number;
  // Scenario-adjusted values
  costBenefitAdj: number;
  revenueBenefitAdj: number;
  riskBenefitAdj: number;
  cashFlowBenefitAdj: number;
  totalAnnualAdj: number;
  adjustedProbability: number;
  scenarioExpectedValue: number;
}

export class BenefitsCalculationEngine {
  private hf: HyperFormula;
  private sheetId: number;
  private rowCount: number = 0;

  constructor() {
    this.hf = HyperFormula.buildEmpty({ licenseKey: "gpl-v3" });
    this.hf.addSheet("Benefits");
    this.sheetId = this.hf.getSheetId("Benefits")!;
  }

  /**
   * Load benefit inputs for multiple use cases and compute all outputs.
   */
  loadAndCalculate(inputs: BenefitInputs[]): BenefitOutputs[] {
    // Clear existing data
    if (this.rowCount > 0) {
      this.hf.clearSheet(this.sheetId);
    }
    this.rowCount = inputs.length;

    // Set input values and formulas for each row
    const changes: Array<[number, number, number, any]> = [];

    for (let row = 0; row < inputs.length; row++) {
      const inp = inputs[row];
      const r = row + 1; // 1-indexed for formula references

      // Cost benefit inputs (A-E)
      changes.push([this.sheetId, row, BEN.HOURS_SAVED, inp.hoursSaved]);
      changes.push([this.sheetId, row, BEN.LOADED_RATE, inp.loadedRate]);
      changes.push([this.sheetId, row, BEN.BENEFITS_LOADING, inp.benefitsLoading]);
      changes.push([this.sheetId, row, BEN.ADOPTION_RATE, inp.adoptionRate]);
      changes.push([this.sheetId, row, BEN.DATA_MATURITY_COST, inp.dataMaturityCost]);
      // F: Cost Benefit formula
      changes.push([this.sheetId, row, BEN.COST_BENEFIT,
        `=A${r}*B${r}*C${r}*D${r}*E${r}`]);

      // Revenue benefit inputs (G-J)
      changes.push([this.sheetId, row, BEN.UPLIFT_PCT, inp.upliftPct]);
      changes.push([this.sheetId, row, BEN.REV_AT_RISK, inp.revenueAtRisk]);
      changes.push([this.sheetId, row, BEN.REALIZATION_REV, inp.realizationRev]);
      changes.push([this.sheetId, row, BEN.DATA_MATURITY_REV, inp.dataMaturityRev]);
      // K: Revenue Benefit formula
      changes.push([this.sheetId, row, BEN.REVENUE_BENEFIT,
        `=G${r}*H${r}*I${r}*J${r}`]);

      // Risk benefit inputs (L-O)
      changes.push([this.sheetId, row, BEN.RISK_REDUCTION, inp.riskReduction]);
      changes.push([this.sheetId, row, BEN.RISK_EXPOSURE, inp.riskExposure]);
      changes.push([this.sheetId, row, BEN.REALIZATION_RISK, inp.realizationRisk]);
      changes.push([this.sheetId, row, BEN.DATA_MATURITY_RISK, inp.dataMaturityRisk]);
      // P: Risk Benefit formula
      changes.push([this.sheetId, row, BEN.RISK_BENEFIT,
        `=L${r}*M${r}*N${r}*O${r}`]);

      // Cash flow benefit inputs (Q-U)
      changes.push([this.sheetId, row, BEN.ANNUAL_REV, inp.annualRevenue]);
      changes.push([this.sheetId, row, BEN.DAYS_IMPROVED, inp.daysImproved]);
      changes.push([this.sheetId, row, BEN.COST_OF_CAPITAL, inp.costOfCapital]);
      changes.push([this.sheetId, row, BEN.REALIZATION_CF, inp.realizationCf]);
      changes.push([this.sheetId, row, BEN.DATA_MATURITY_CF, inp.dataMaturityCf]);
      // V: Cash Flow Benefit formula
      changes.push([this.sheetId, row, BEN.CASHFLOW_BENEFIT,
        `=Q${r}*(R${r}/365)*S${r}*T${r}*U${r}`]);

      // W: Total Annual Value
      changes.push([this.sheetId, row, BEN.TOTAL_ANNUAL,
        `=F${r}+K${r}+P${r}+V${r}`]);

      // X: Probability of Success
      changes.push([this.sheetId, row, BEN.PROB_SUCCESS, inp.probabilityOfSuccess]);

      // Y: Expected Value
      changes.push([this.sheetId, row, BEN.EXPECTED_VALUE,
        `=W${r}*X${r}`]);

      // Scenario adjustments
      const bm = inp.benefitMultiplier ?? 1.0;
      const pm = inp.probabilityMultiplier ?? 1.0;

      // Z: Benefit Multiplier
      changes.push([this.sheetId, row, BEN.BENEFIT_MULT, bm]);

      // AA-AD: Scenario-adjusted benefits
      changes.push([this.sheetId, row, BEN.COST_ADJ, `=F${r}*Z${r}`]);
      changes.push([this.sheetId, row, BEN.REV_ADJ, `=K${r}*Z${r}`]);
      changes.push([this.sheetId, row, BEN.RISK_ADJ, `=P${r}*Z${r}`]);
      changes.push([this.sheetId, row, BEN.CF_ADJ, `=V${r}*Z${r}`]);

      // AE: Scenario Total
      changes.push([this.sheetId, row, BEN.TOTAL_ADJ,
        `=${colLetter(BEN.COST_ADJ)}${r}+${colLetter(BEN.REV_ADJ)}${r}+${colLetter(BEN.RISK_ADJ)}${r}+${colLetter(BEN.CF_ADJ)}${r}`]);

      // AF: Probability Multiplier
      changes.push([this.sheetId, row, BEN.PROB_MULT, pm]);

      // AG: Adjusted Probability = MIN(1, X * AF)
      changes.push([this.sheetId, row, BEN.ADJ_PROB,
        `=MIN(1,X${r}*${colLetter(BEN.PROB_MULT)}${r})`]);

      // AH: Scenario Expected Value
      changes.push([this.sheetId, row, BEN.SCENARIO_EV,
        `=${colLetter(BEN.TOTAL_ADJ)}${r}*${colLetter(BEN.ADJ_PROB)}${r}`]);
    }

    // Batch set all cells
    this.hf.batch(() => {
      for (const [sheet, row, col, value] of changes) {
        this.hf.setCellContents({ sheet, row, col }, value);
      }
    });

    // Read outputs
    return inputs.map((_, row) => ({
      costBenefit: this.getNumericValue(row, BEN.COST_BENEFIT),
      revenueBenefit: this.getNumericValue(row, BEN.REVENUE_BENEFIT),
      riskBenefit: this.getNumericValue(row, BEN.RISK_BENEFIT),
      cashFlowBenefit: this.getNumericValue(row, BEN.CASHFLOW_BENEFIT),
      totalAnnualValue: this.getNumericValue(row, BEN.TOTAL_ANNUAL),
      expectedValue: this.getNumericValue(row, BEN.EXPECTED_VALUE),
      costBenefitAdj: this.getNumericValue(row, BEN.COST_ADJ),
      revenueBenefitAdj: this.getNumericValue(row, BEN.REV_ADJ),
      riskBenefitAdj: this.getNumericValue(row, BEN.RISK_ADJ),
      cashFlowBenefitAdj: this.getNumericValue(row, BEN.CF_ADJ),
      totalAnnualAdj: this.getNumericValue(row, BEN.TOTAL_ADJ),
      adjustedProbability: this.getNumericValue(row, BEN.ADJ_PROB),
      scenarioExpectedValue: this.getNumericValue(row, BEN.SCENARIO_EV),
    }));
  }

  /**
   * Update a single input cell and return recalculated outputs for that row.
   */
  updateInput(row: number, field: keyof BenefitInputs, value: number): BenefitOutputs {
    const colMap: Record<string, number> = {
      hoursSaved: BEN.HOURS_SAVED,
      loadedRate: BEN.LOADED_RATE,
      benefitsLoading: BEN.BENEFITS_LOADING,
      adoptionRate: BEN.ADOPTION_RATE,
      dataMaturityCost: BEN.DATA_MATURITY_COST,
      upliftPct: BEN.UPLIFT_PCT,
      revenueAtRisk: BEN.REV_AT_RISK,
      realizationRev: BEN.REALIZATION_REV,
      dataMaturityRev: BEN.DATA_MATURITY_REV,
      riskReduction: BEN.RISK_REDUCTION,
      riskExposure: BEN.RISK_EXPOSURE,
      realizationRisk: BEN.REALIZATION_RISK,
      dataMaturityRisk: BEN.DATA_MATURITY_RISK,
      annualRevenue: BEN.ANNUAL_REV,
      daysImproved: BEN.DAYS_IMPROVED,
      costOfCapital: BEN.COST_OF_CAPITAL,
      realizationCf: BEN.REALIZATION_CF,
      dataMaturityCf: BEN.DATA_MATURITY_CF,
      probabilityOfSuccess: BEN.PROB_SUCCESS,
      benefitMultiplier: BEN.BENEFIT_MULT,
      probabilityMultiplier: BEN.PROB_MULT,
    };

    const col = colMap[field];
    if (col === undefined) throw new Error(`Unknown field: ${field}`);

    this.hf.setCellContents({ sheet: this.sheetId, row, col }, value);

    return {
      costBenefit: this.getNumericValue(row, BEN.COST_BENEFIT),
      revenueBenefit: this.getNumericValue(row, BEN.REVENUE_BENEFIT),
      riskBenefit: this.getNumericValue(row, BEN.RISK_BENEFIT),
      cashFlowBenefit: this.getNumericValue(row, BEN.CASHFLOW_BENEFIT),
      totalAnnualValue: this.getNumericValue(row, BEN.TOTAL_ANNUAL),
      expectedValue: this.getNumericValue(row, BEN.EXPECTED_VALUE),
      costBenefitAdj: this.getNumericValue(row, BEN.COST_ADJ),
      revenueBenefitAdj: this.getNumericValue(row, BEN.REV_ADJ),
      riskBenefitAdj: this.getNumericValue(row, BEN.RISK_ADJ),
      cashFlowBenefitAdj: this.getNumericValue(row, BEN.CF_ADJ),
      totalAnnualAdj: this.getNumericValue(row, BEN.TOTAL_ADJ),
      adjustedProbability: this.getNumericValue(row, BEN.ADJ_PROB),
      scenarioExpectedValue: this.getNumericValue(row, BEN.SCENARIO_EV),
    };
  }

  private getNumericValue(row: number, col: number): number {
    const val = this.hf.getCellValue({ sheet: this.sheetId, row, col });
    return typeof val === "number" ? val : 0;
  }

  destroy() {
    this.hf.destroy();
  }
}

// -------------------------------------------------------------------------
// READINESS CALCULATION ENGINE
// -------------------------------------------------------------------------

export interface ReadinessInputs {
  dataAvailability: number;
  technicalInfrastructure: number;
  organizationalCapacity: number;
  governance: number;
  runsPerMonth: number;
  inputTokensPerRun: number;
  outputTokensPerRun: number;
}

export interface ReadinessOutputs {
  readinessScore: number;
  monthlyTokens: number;
  annualTokenCost: number;
}

export class ReadinessCalculationEngine {
  private hf: HyperFormula;
  private sheetId: number;

  constructor() {
    this.hf = HyperFormula.buildEmpty({ licenseKey: "gpl-v3" });
    this.hf.addSheet("Readiness");
    this.sheetId = this.hf.getSheetId("Readiness")!;
  }

  loadAndCalculate(inputs: ReadinessInputs[]): ReadinessOutputs[] {
    this.hf.clearSheet(this.sheetId);

    this.hf.batch(() => {
      for (let row = 0; row < inputs.length; row++) {
        const inp = inputs[row];
        const r = row + 1;

        this.hf.setCellContents({ sheet: this.sheetId, row, col: READ.DATA }, inp.dataAvailability);
        this.hf.setCellContents({ sheet: this.sheetId, row, col: READ.TECH }, inp.technicalInfrastructure);
        this.hf.setCellContents({ sheet: this.sheetId, row, col: READ.ORG }, inp.organizationalCapacity);
        this.hf.setCellContents({ sheet: this.sheetId, row, col: READ.GOV }, inp.governance);
        // E: Readiness = Data*0.30 + Tech*0.20 + Org*0.30 + Gov*0.20
        this.hf.setCellContents({ sheet: this.sheetId, row, col: READ.READINESS },
          `=A${r}*0.3+B${r}*0.2+C${r}*0.3+D${r}*0.2`);

        this.hf.setCellContents({ sheet: this.sheetId, row, col: READ.RUNS }, inp.runsPerMonth);
        this.hf.setCellContents({ sheet: this.sheetId, row, col: READ.INPUT_TOKENS }, inp.inputTokensPerRun);
        this.hf.setCellContents({ sheet: this.sheetId, row, col: READ.OUTPUT_TOKENS }, inp.outputTokensPerRun);
        // I: Monthly Tokens = runs * (input + output)
        this.hf.setCellContents({ sheet: this.sheetId, row, col: READ.MONTHLY_TOKENS },
          `=F${r}*(G${r}+H${r})`);
        // J: Annual Token Cost = (runs*input*3/1M + runs*output*15/1M) * 12
        this.hf.setCellContents({ sheet: this.sheetId, row, col: READ.ANNUAL_TOKEN_COST },
          `=(F${r}*G${r}*3/1000000+F${r}*H${r}*15/1000000)*12`);
      }
    });

    return inputs.map((_, row) => ({
      readinessScore: this.getNumericValue(row, READ.READINESS),
      monthlyTokens: this.getNumericValue(row, READ.MONTHLY_TOKENS),
      annualTokenCost: this.getNumericValue(row, READ.ANNUAL_TOKEN_COST),
    }));
  }

  private getNumericValue(row: number, col: number): number {
    const val = this.hf.getCellValue({ sheet: this.sheetId, row, col });
    return typeof val === "number" ? val : 0;
  }

  destroy() {
    this.hf.destroy();
  }
}

// -------------------------------------------------------------------------
// WORKFLOW METRICS ENGINE (real-time, client-side)
// -------------------------------------------------------------------------

export interface WorkflowStepInput {
  employeeCount: number;
  avgHourlyCost: number;
  hoursPerTask: number;
  tasksPerMonth: number;
  isAIEnabled: boolean;
  automationLevel: "full" | "assisted" | "supervised" | "manual";
}

export interface WorkflowMetricsOutput {
  currentTotalHours: number;
  targetTotalHours: number;
  hoursSaved: number;
  currentTotalCost: number;
  targetTotalCost: number;
  costSaved: number;
  timeReductionPct: number;
  costReductionPct: number;
  fteEquivalent: number;
  automationPct: number;
  hitlCheckpointCount: number;
  stepMetrics: Array<{
    monthlyCost: number;
    monthlyHours: number;
  }>;
}

const AUTOMATION_MULTIPLIERS: Record<string, number> = {
  full: 1.0,
  assisted: 0.75,
  supervised: 0.5,
  manual: 0,
};

export class WorkflowMetricsEngine {
  private hf: HyperFormula;
  private currentSheetId: number;
  private targetSheetId: number;

  constructor() {
    this.hf = HyperFormula.buildEmpty({ licenseKey: "gpl-v3" });
    this.hf.addSheet("Current");
    this.hf.addSheet("Target");
    this.currentSheetId = this.hf.getSheetId("Current")!;
    this.targetSheetId = this.hf.getSheetId("Target")!;
  }

  calculate(
    currentSteps: WorkflowStepInput[],
    targetSteps: WorkflowStepInput[],
    hitlCount: number = 0,
  ): WorkflowMetricsOutput {
    this.hf.clearSheet(this.currentSheetId);
    this.hf.clearSheet(this.targetSheetId);

    this.hf.batch(() => {
      // Load current state
      for (let row = 0; row < currentSteps.length; row++) {
        const s = currentSteps[row];
        const r = row + 1;
        this.hf.setCellContents({ sheet: this.currentSheetId, row, col: WF.EMPLOYEES }, s.employeeCount);
        this.hf.setCellContents({ sheet: this.currentSheetId, row, col: WF.HOURLY_COST }, s.avgHourlyCost);
        this.hf.setCellContents({ sheet: this.currentSheetId, row, col: WF.HOURS_PER_TASK }, s.hoursPerTask);
        this.hf.setCellContents({ sheet: this.currentSheetId, row, col: WF.TASKS_PER_MONTH }, s.tasksPerMonth);
        this.hf.setCellContents({ sheet: this.currentSheetId, row, col: WF.MONTHLY_COST }, `=A${r}*B${r}*C${r}*D${r}`);
        this.hf.setCellContents({ sheet: this.currentSheetId, row, col: WF.MONTHLY_HOURS }, `=C${r}*D${r}`);
      }

      // Load target state
      for (let row = 0; row < targetSteps.length; row++) {
        const s = targetSteps[row];
        const r = row + 1;
        const autoMult = AUTOMATION_MULTIPLIERS[s.automationLevel] ?? 0;
        // For AI-enabled steps, reduce cost/hours by automation level
        const costReduction = s.isAIEnabled ? (1 - autoMult) : 1;

        this.hf.setCellContents({ sheet: this.targetSheetId, row, col: WF.EMPLOYEES }, s.employeeCount);
        this.hf.setCellContents({ sheet: this.targetSheetId, row, col: WF.HOURLY_COST }, s.avgHourlyCost);
        this.hf.setCellContents({ sheet: this.targetSheetId, row, col: WF.HOURS_PER_TASK }, s.hoursPerTask);
        this.hf.setCellContents({ sheet: this.targetSheetId, row, col: WF.TASKS_PER_MONTH }, s.tasksPerMonth);
        this.hf.setCellContents({ sheet: this.targetSheetId, row, col: WF.MONTHLY_COST },
          `=A${r}*B${r}*C${r}*D${r}*${costReduction}`);
        this.hf.setCellContents({ sheet: this.targetSheetId, row, col: WF.MONTHLY_HOURS },
          `=C${r}*D${r}*${costReduction}`);
        this.hf.setCellContents({ sheet: this.targetSheetId, row, col: WF.IS_AI }, s.isAIEnabled ? 1 : 0);
        this.hf.setCellContents({ sheet: this.targetSheetId, row, col: WF.AUTOMATION_LEVEL }, autoMult);
      }
    });

    // Read results
    let currentTotalHours = 0;
    let currentTotalCost = 0;
    for (let row = 0; row < currentSteps.length; row++) {
      currentTotalHours += this.getNumericValue(this.currentSheetId, row, WF.MONTHLY_HOURS);
      currentTotalCost += this.getNumericValue(this.currentSheetId, row, WF.MONTHLY_COST);
    }

    let targetTotalHours = 0;
    let targetTotalCost = 0;
    let aiEnabledCount = 0;
    const stepMetrics: WorkflowMetricsOutput["stepMetrics"] = [];

    for (let row = 0; row < targetSteps.length; row++) {
      const hours = this.getNumericValue(this.targetSheetId, row, WF.MONTHLY_HOURS);
      const cost = this.getNumericValue(this.targetSheetId, row, WF.MONTHLY_COST);
      targetTotalHours += hours;
      targetTotalCost += cost;
      stepMetrics.push({ monthlyCost: cost, monthlyHours: hours });

      if (this.getNumericValue(this.targetSheetId, row, WF.IS_AI) === 1) {
        aiEnabledCount++;
      }
    }

    const hoursSaved = currentTotalHours - targetTotalHours;
    const costSaved = currentTotalCost - targetTotalCost;
    const timeReductionPct = currentTotalHours > 0 ? (hoursSaved / currentTotalHours) * 100 : 0;
    const costReductionPct = currentTotalCost > 0 ? (costSaved / currentTotalCost) * 100 : 0;
    const fteEquivalent = hoursSaved > 0 ? hoursSaved / (2080 / 12) : 0; // Monthly FTE
    const automationPct = targetSteps.length > 0 ? (aiEnabledCount / targetSteps.length) * 100 : 0;

    return {
      currentTotalHours,
      targetTotalHours,
      hoursSaved,
      currentTotalCost,
      targetTotalCost,
      costSaved,
      timeReductionPct,
      costReductionPct,
      fteEquivalent,
      automationPct,
      hitlCheckpointCount: hitlCount,
      stepMetrics,
    };
  }

  private getNumericValue(sheetId: number, row: number, col: number): number {
    const val = this.hf.getCellValue({ sheet: sheetId, row, col });
    return typeof val === "number" ? val : 0;
  }

  destroy() {
    this.hf.destroy();
  }
}

// -------------------------------------------------------------------------
// NPV / IRR / Payback (using HyperFormula built-in functions)
// -------------------------------------------------------------------------

export class ProjectionEngine {
  private hf: HyperFormula;
  private sheetId: number;

  constructor() {
    this.hf = HyperFormula.buildEmpty({ licenseKey: "gpl-v3" });
    this.hf.addSheet("Projections");
    this.sheetId = this.hf.getSheetId("Projections")!;
  }

  calculateNPV(annualBenefit: number, years: number = 3, discountRate: number = 0.1, initialInvestment: number = 0): number {
    this.hf.clearSheet(this.sheetId);
    this.hf.batch(() => {
      // Row 0: inputs
      this.hf.setCellContents({ sheet: this.sheetId, row: 0, col: 0 }, annualBenefit);
      this.hf.setCellContents({ sheet: this.sheetId, row: 0, col: 1 }, discountRate);
      this.hf.setCellContents({ sheet: this.sheetId, row: 0, col: 2 }, initialInvestment);

      // Cash flows: -investment, then annual benefits for each year
      this.hf.setCellContents({ sheet: this.sheetId, row: 1, col: 0 }, -initialInvestment);
      for (let t = 1; t <= years; t++) {
        this.hf.setCellContents({ sheet: this.sheetId, row: 1, col: t }, annualBenefit);
      }

      // NPV formula using manual summation (more reliable than HF's NPV function)
      let formula = `=-C1`;
      for (let t = 1; t <= years; t++) {
        formula += `+A1/(1+B1)^${t}`;
      }
      this.hf.setCellContents({ sheet: this.sheetId, row: 2, col: 0 }, formula);
    });

    const val = this.hf.getCellValue({ sheet: this.sheetId, row: 2, col: 0 });
    return typeof val === "number" ? val : 0;
  }

  calculatePaybackMonths(annualBenefit: number, initialInvestment: number): number {
    if (annualBenefit <= 0 || initialInvestment <= 0) return 0;

    this.hf.clearSheet(this.sheetId);
    this.hf.batch(() => {
      this.hf.setCellContents({ sheet: this.sheetId, row: 0, col: 0 }, initialInvestment);
      this.hf.setCellContents({ sheet: this.sheetId, row: 0, col: 1 }, annualBenefit);
      // Payback months = CEILING(investment / benefit * 12, 1)
      this.hf.setCellContents({ sheet: this.sheetId, row: 0, col: 2 }, `=CEILING(A1/B1*12,1)`);
    });

    const val = this.hf.getCellValue({ sheet: this.sheetId, row: 0, col: 2 });
    return typeof val === "number" ? val : 0;
  }

  destroy() {
    this.hf.destroy();
  }
}

// =========================================================================
// ASSESSMENT CALCULATION ENGINE
// =========================================================================

const ASSESS_Q = {
  WEIGHT: 0,
  SCORE: 1,
  WEIGHTED_SCORE: 2,
  MAX_WEIGHTED_SCORE: 3,
  CATEGORY_INDEX: 4,
  IS_ANSWERED: 5,
};

const ASSESS_CAT = {
  INDEX: 0,
  RAW_SCORE: 1,
  MAX_SCORE: 2,
  PERCENTAGE: 3,
  ANSWERED_COUNT: 4,
};

export class AssessmentCalculationEngine {
  private hf: HyperFormula;
  private questionsSheetId: number;
  private categoriesSheetId: number;
  private useCasesSheetId: number;
  private questionCount: number = 0;
  private useCaseCount: number = 0;

  constructor() {
    this.hf = HyperFormula.buildEmpty({ licenseKey: "gpl-v3", useArrayArithmetic: true });
    this.hf.addSheet("Questions");
    this.hf.addSheet("Categories");
    this.hf.addSheet("UseCases");
    this.questionsSheetId = this.hf.getSheetId("Questions")!;
    this.categoriesSheetId = this.hf.getSheetId("Categories")!;
    this.useCasesSheetId = this.hf.getSheetId("UseCases")!;
  }

  /**
   * Load questions and compute all scores.
   * @param questions - Array of {weight, score (0=unanswered), categoryIndex (0-3)}
   * @param useCaseMappings - Array of arrays, each inner array contains question indices (0-based) mapped to that use case
   */
  loadAndCalculate(
    questions: Array<{ weight: number; score: number; categoryIndex: number }>,
    useCaseMappings: Array<{ questionIndices: number[] }>,
  ): {
    categoryScores: Array<{ rawScore: number; maxScore: number; percentage: number; answeredCount: number }>;
    useCaseScores: Array<{ rawScore: number; maxScore: number; percentage: number }>;
    overallPercentage: number;
  } {
    this.questionCount = questions.length;
    this.useCaseCount = useCaseMappings.length;

    // Column layout for Questions sheet:
    // A: weight, B: score, C: weighted, D: max weighted, E: categoryIndex, F: isAnswered
    // G onward: one column per use case with 0/1 flags (same column orientation as C/D)
    const FIRST_UC_COL = 6;

    // --- Questions Sheet ---
    const qData: (number | string)[][] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const row = i + 1; // 1-indexed for formulas
      const rowData: (number | string)[] = [
        q.weight,                                    // A: weight
        q.score,                                     // B: score (0 if unanswered)
        `=A${row}*B${row}`,                         // C: weighted score
        `=A${row}*5`,                               // D: max weighted score
        q.categoryIndex,                             // E: category index
        `=IF(B${row}>0,1,0)`,                       // F: is answered
      ];

      // Append use case flag columns (G, H, I, ...) — column vectors for SUMPRODUCT
      for (let u = 0; u < useCaseMappings.length; u++) {
        rowData.push(useCaseMappings[u].questionIndices.includes(i) ? 1 : 0);
      }

      qData.push(rowData);
    }
    this.hf.setSheetContent(this.questionsSheetId, qData);

    // --- Categories Sheet (4 categories + 1 overall row) ---
    const catData: (number | string)[][] = [];
    for (let c = 0; c < 4; c++) {
      const row = c + 1;
      catData.push([
        c,                                                                    // A: index
        `=SUMPRODUCT((Questions!E1:E${questions.length}=${c})*Questions!C1:C${questions.length})`,  // B: raw score
        `=SUMPRODUCT((Questions!E1:E${questions.length}=${c})*Questions!D1:D${questions.length})`,  // C: max score
        `=IF(C${row}>0,B${row}/C${row},0)`,                                  // D: percentage
        `=SUMPRODUCT((Questions!E1:E${questions.length}=${c})*Questions!F1:F${questions.length})`,  // E: answered count
      ]);
    }
    // Overall row (row 5)
    catData.push([
      -1,                             // A: sentinel
      `=SUM(B1:B4)`,                 // B: total raw
      `=SUM(C1:C4)`,                 // C: total max
      `=IF(C5>0,B5/C5,0)`,          // D: overall percentage
      `=SUM(E1:E4)`,                 // E: total answered
    ]);
    this.hf.setSheetContent(this.categoriesSheetId, catData);

    // --- UseCases Sheet ---
    // Each use case row has 3 columns: raw, max, pct
    // SUMPRODUCT uses column vectors from Questions sheet (flag col × score col)
    if (useCaseMappings.length > 0) {
      const ucData: (number | string)[][] = [];
      const qLen = questions.length;

      for (let u = 0; u < useCaseMappings.length; u++) {
        const ucFlagCol = this.colLetter(FIRST_UC_COL + u); // G, H, I, ...
        const r = u + 1;

        ucData.push([
          // A: raw score — SUMPRODUCT of flag column × weighted score column (both 67×1 columns)
          `=SUMPRODUCT(Questions!${ucFlagCol}1:${ucFlagCol}${qLen},Questions!C1:C${qLen})`,
          // B: max score — SUMPRODUCT of flag column × max weighted score column
          `=SUMPRODUCT(Questions!${ucFlagCol}1:${ucFlagCol}${qLen},Questions!D1:D${qLen})`,
          // C: percentage
          `=IF(B${r}>0,A${r}/B${r},0)`,
        ]);
      }
      this.hf.setSheetContent(this.useCasesSheetId, ucData);
    }

    // --- Extract results ---
    return this.extractResults();
  }

  /** Update a single question's score and recalculate */
  updateScore(questionIndex: number, newScore: number): void {
    const row = questionIndex; // 0-indexed in HyperFormula
    this.hf.setCellContents(
      { sheet: this.questionsSheetId, row, col: ASSESS_Q.SCORE },
      [[newScore]],
    );
  }

  private extractResults(): {
    categoryScores: Array<{ rawScore: number; maxScore: number; percentage: number; answeredCount: number }>;
    useCaseScores: Array<{ rawScore: number; maxScore: number; percentage: number }>;
    overallPercentage: number;
  } {
    const categoryScores: Array<{ rawScore: number; maxScore: number; percentage: number; answeredCount: number }> = [];
    for (let c = 0; c < 4; c++) {
      categoryScores.push({
        rawScore: this.getNum(this.categoriesSheetId, c, ASSESS_CAT.RAW_SCORE),
        maxScore: this.getNum(this.categoriesSheetId, c, ASSESS_CAT.MAX_SCORE),
        percentage: this.getNum(this.categoriesSheetId, c, ASSESS_CAT.PERCENTAGE),
        answeredCount: this.getNum(this.categoriesSheetId, c, ASSESS_CAT.ANSWERED_COUNT),
      });
    }

    const overallPercentage = this.getNum(this.categoriesSheetId, 4, ASSESS_CAT.PERCENTAGE);

    const useCaseScores: Array<{ rawScore: number; maxScore: number; percentage: number }> = [];
    for (let u = 0; u < this.useCaseCount; u++) {
      useCaseScores.push({
        rawScore: this.getNum(this.useCasesSheetId, u, 0),
        maxScore: this.getNum(this.useCasesSheetId, u, 1),
        percentage: this.getNum(this.useCasesSheetId, u, 2),
      });
    }

    return { categoryScores, useCaseScores, overallPercentage };
  }

  private getNum(sheetId: number, row: number, col: number): number {
    const val = this.hf.getCellValue({ sheet: sheetId, row, col });
    return typeof val === "number" ? val : 0;
  }

  private colLetter(index: number): string {
    let result = "";
    let n = index;
    while (n >= 0) {
      result = String.fromCharCode(65 + (n % 26)) + result;
      n = Math.floor(n / 26) - 1;
    }
    return result;
  }

  destroy(): void {
    this.hf.destroy();
  }
}
