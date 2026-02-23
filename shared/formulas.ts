// =========================================================================
// DETERMINISTIC CALCULATION ENGINE
// All formulas replicated from the BlueAlly AI Assessment JSON structure.
// Pure TypeScript — no external math library needed.
// =========================================================================

// -------------------------------------------------------------------------
// BENEFIT CALCULATIONS
// -------------------------------------------------------------------------

export function calculateCostBenefit(
  hoursSaved: number,
  loadedRate: number,
  benefitsLoading: number,
  adoptionRate: number,
  dataMaturity: number,
): number {
  return hoursSaved * loadedRate * benefitsLoading * adoptionRate * dataMaturity;
}

export function calculateRevenueBenefit(
  revenueUpliftPct: number,
  revenueAtRisk: number,
  realizationFactor: number,
  dataMaturity: number,
): number {
  return revenueUpliftPct * revenueAtRisk * realizationFactor * dataMaturity;
}

export function calculateRiskBenefit(
  riskReductionPct: number,
  riskExposure: number,
  realizationFactor: number,
  dataMaturity: number,
): number {
  return riskReductionPct * riskExposure * realizationFactor * dataMaturity;
}

export function calculateCashFlowBenefit(
  annualRevenue: number,
  daysImproved: number,
  costOfCapital: number,
  realizationFactor: number,
  dataMaturity: number,
): number {
  return (
    annualRevenue *
    (daysImproved / 365) *
    costOfCapital *
    realizationFactor *
    dataMaturity
  );
}

export function calculateTotalAnnualValue(
  cost: number,
  revenue: number,
  risk: number,
  cashFlow: number,
): number {
  return cost + revenue + risk + cashFlow;
}

export function calculateExpectedValue(
  totalAnnual: number,
  probabilityOfSuccess: number,
): number {
  return totalAnnual * probabilityOfSuccess;
}

// -------------------------------------------------------------------------
// READINESS CALCULATIONS
// -------------------------------------------------------------------------

// Weights aligned with assumptions Excel: Org 30%, Data 30%, Tech 20%, Gov 20%
export const READINESS_WEIGHTS = {
  organizational: 0.30,
  data: 0.30,
  technical: 0.20,
  governance: 0.20,
};

export function calculateReadinessScore(
  data: number,
  technical: number,
  organizational: number,
  governance: number,
): number {
  return (
    organizational * READINESS_WEIGHTS.organizational +
    data * READINESS_WEIGHTS.data +
    technical * READINESS_WEIGHTS.technical +
    governance * READINESS_WEIGHTS.governance
  );
}

export function calculateMonthlyTokens(
  runsPerMonth: number,
  inputTokensPerRun: number,
  outputTokensPerRun: number,
): number {
  return runsPerMonth * (inputTokensPerRun + outputTokensPerRun);
}

// Claude pricing: $3 per 1M input tokens, $15 per 1M output tokens
const INPUT_PRICE_PER_TOKEN = 3 / 1_000_000;
const OUTPUT_PRICE_PER_TOKEN = 15 / 1_000_000;

export function calculateAnnualTokenCost(
  runsPerMonth: number,
  inputTokensPerRun: number,
  outputTokensPerRun: number,
): number {
  const monthlyInputCost =
    runsPerMonth * inputTokensPerRun * INPUT_PRICE_PER_TOKEN;
  const monthlyOutputCost =
    runsPerMonth * outputTokensPerRun * OUTPUT_PRICE_PER_TOKEN;
  return (monthlyInputCost + monthlyOutputCost) * 12;
}

// -------------------------------------------------------------------------
// PRIORITY CALCULATIONS
// -------------------------------------------------------------------------

/**
 * Value Ratio: Expected Value / Friction Annual Cost
 * Measures ROI per friction dollar — how much value each dollar of friction generates.
 */
export function calculateValueRatio(
  expectedValue: number,
  frictionAnnualCost: number,
): number {
  return frictionAnnualCost > 0 ? expectedValue / frictionAnnualCost : 0;
}

/**
 * Value Score: Normalized to 1-10 scale from the raw value ratios.
 * Formula: 1 + ((ratio - minRatio) / (maxRatio - minRatio)) * 9
 *
 * When frictionPoints are not available (backward compat), falls back to
 * the legacy formula: (expectedValue / maxExpectedValue) * 10
 */
export function calculateValueScore(
  expectedValue: number,
  frictionAnnualCost: number,
  allRatios: number[],
): number {
  const rawRatio = frictionAnnualCost > 0 ? expectedValue / frictionAnnualCost : 0;
  const minRatio = Math.min(...allRatios);
  const maxRatio = Math.max(...allRatios);

  // All ratios equal (or single use case) → midpoint
  if (maxRatio === minRatio) return 5.5;

  return 1 + ((rawRatio - minRatio) / (maxRatio - minRatio)) * 9;
}

/**
 * Legacy fallback when friction data is unavailable.
 */
export function calculateValueScoreLegacy(
  expectedValue: number,
  allExpectedValues: number[],
): number {
  const max = Math.max(...allExpectedValues);
  if (max === 0) return 0;
  return (expectedValue / max) * 10;
}

export function calculateTTVScore(timeToValue: number): number {
  const base = Math.max(0, (18 - timeToValue) / 18);
  const bonus = timeToValue < 10 ? 0.25 : 0;
  return Math.min(1, base + bonus);
}

// Priority = Readiness 50% + NormalizedValue 50% (per assumptions Excel)
// TTV is kept as display-only, not used in priority scoring
export function calculatePriorityScore(
  valueScore: number,
  readinessScore: number,
  _ttvScore?: number,
): number {
  return readinessScore * 0.50 + valueScore * 0.50;
}

// Tier thresholds per assumptions Excel:
// Champions: Value ≥ 5.5 AND Readiness ≥ 5.5 (high-high quadrant)
// Quick Wins: Value < 5.5 AND Readiness ≥ 5.5
// Strategic: Value ≥ 5.5 AND Readiness < 5.5
// Foundation: Value < 5.5 AND Readiness < 5.5
export function determinePriorityTier(
  valueScore: number,
  readinessScore: number,
): string {
  if (valueScore >= 5.5 && readinessScore >= 5.5) return "Tier 1 — Champions";
  if (valueScore < 5.5 && readinessScore >= 5.5) return "Tier 2 — Quick Wins";
  if (valueScore >= 5.5 && readinessScore < 5.5) return "Tier 3 — Strategic";
  return "Tier 4 — Foundation";
}

export function determineQuadrant(
  valueScore: number,
  readinessScore: number,
): string {
  if (valueScore >= 5.5 && readinessScore >= 5.5) return "champions";
  if (valueScore >= 5.5 && readinessScore < 5.5) return "strategic";
  if (valueScore < 5.5 && readinessScore >= 5.5) return "quick_wins";
  return "foundation";
}

export function determinePhase(priorityScore: number): string {
  if (priorityScore >= 7) return "Q1";
  if (priorityScore >= 5.5) return "Q2";
  if (priorityScore >= 4) return "Q3";
  return "Q4";
}

// -------------------------------------------------------------------------
// SCENARIO ADJUSTMENTS
// -------------------------------------------------------------------------

export interface ScenarioMultipliers {
  benefitMultiplier: number;
  probabilityMultiplier: number;
}

export const SCENARIO_MULTIPLIERS: Record<string, ScenarioMultipliers> = {
  base: { benefitMultiplier: 1.0, probabilityMultiplier: 1.0 },
  conservative: { benefitMultiplier: 0.6, probabilityMultiplier: 0.85 },
  optimistic: { benefitMultiplier: 1.3, probabilityMultiplier: 1.0 },
};

export function applyScenarioMultiplier(
  value: number,
  multiplier: ScenarioMultipliers,
): number {
  return value * multiplier.benefitMultiplier;
}

// -------------------------------------------------------------------------
// MULTI-YEAR PROJECTIONS
// -------------------------------------------------------------------------

export function calculateNPV(
  annualBenefit: number,
  years: number = 3,
  discountRate: number = 0.1,
  initialInvestment: number = 0,
): number {
  let npv = -initialInvestment;
  for (let t = 1; t <= years; t++) {
    npv += annualBenefit / Math.pow(1 + discountRate, t);
  }
  return npv;
}

export function calculateIRR(
  annualBenefit: number,
  years: number = 3,
  initialInvestment: number = 0,
  tolerance: number = 0.0001,
  maxIterations: number = 100,
): number {
  if (initialInvestment <= 0) return 0;

  let rate = 0.5; // Start guess
  for (let i = 0; i < maxIterations; i++) {
    let npv = -initialInvestment;
    let dnpv = 0;
    for (let t = 1; t <= years; t++) {
      const factor = Math.pow(1 + rate, t);
      npv += annualBenefit / factor;
      dnpv -= (t * annualBenefit) / (factor * (1 + rate));
    }
    if (Math.abs(npv) < tolerance) break;
    if (dnpv === 0) break;
    rate -= npv / dnpv;
  }
  return rate;
}

export function calculatePaybackMonths(
  annualBenefit: number,
  initialInvestment: number = 0,
): number {
  if (annualBenefit <= 0) return 0;
  if (initialInvestment <= 0) return 0;
  return Math.ceil((initialInvestment / annualBenefit) * 12);
}

// -------------------------------------------------------------------------
// FORMATTING HELPERS
// -------------------------------------------------------------------------

export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function parseCurrencyString(value: string): number {
  const clean = value.replace(/[,$\s]/g, "");
  if (clean.endsWith("M")) return parseFloat(clean) * 1_000_000;
  if (clean.endsWith("K")) return parseFloat(clean) * 1_000;
  if (clean.endsWith("B")) return parseFloat(clean) * 1_000_000_000;
  return parseFloat(clean) || 0;
}

// -------------------------------------------------------------------------
// AUDIT TRACE TYPES & TRACED CALCULATIONS
// Server-side wrappers that return both value AND a full audit trail.
// -------------------------------------------------------------------------

export interface FormulaTrace {
  formula: string;
  inputs: Record<string, number>;
  intermediates?: Record<string, number>;
  output: number;
}

export interface CalculationResult {
  value: number;
  trace: FormulaTrace;
}

export function calculateCostBenefitWithTrace(
  hoursSaved: number,
  loadedRate: number,
  benefitsLoading: number,
  adoptionRate: number,
  dataMaturity: number,
): CalculationResult {
  const value = calculateCostBenefit(hoursSaved, loadedRate, benefitsLoading, adoptionRate, dataMaturity);
  return {
    value,
    trace: {
      formula: "HoursSaved × LoadedRate × BenefitsLoading × AdoptionRate × DataMaturity",
      inputs: { hoursSaved, loadedRate, benefitsLoading, adoptionRate, dataMaturity },
      output: value,
    },
  };
}

export function calculateRevenueBenefitWithTrace(
  revenueUpliftPct: number,
  revenueAtRisk: number,
  realizationFactor: number,
  dataMaturity: number,
): CalculationResult {
  const value = calculateRevenueBenefit(revenueUpliftPct, revenueAtRisk, realizationFactor, dataMaturity);
  return {
    value,
    trace: {
      formula: "UpliftPct × RevenueAtRisk × RealizationFactor × DataMaturity",
      inputs: { revenueUpliftPct, revenueAtRisk, realizationFactor, dataMaturity },
      output: value,
    },
  };
}

export function calculateRiskBenefitWithTrace(
  riskReductionPct: number,
  riskExposure: number,
  realizationFactor: number,
  dataMaturity: number,
): CalculationResult {
  const value = calculateRiskBenefit(riskReductionPct, riskExposure, realizationFactor, dataMaturity);
  return {
    value,
    trace: {
      formula: "RiskReductionPct × RiskExposure × RealizationFactor × DataMaturity",
      inputs: { riskReductionPct, riskExposure, realizationFactor, dataMaturity },
      output: value,
    },
  };
}

export function calculateCashFlowBenefitWithTrace(
  annualRevenue: number,
  daysImproved: number,
  costOfCapital: number,
  realizationFactor: number,
  dataMaturity: number,
): CalculationResult {
  const workingCapitalFreed = annualRevenue * (daysImproved / 365);
  const value = calculateCashFlowBenefit(annualRevenue, daysImproved, costOfCapital, realizationFactor, dataMaturity);
  return {
    value,
    trace: {
      formula: "AnnualRevenue × (DaysImproved / 365) × CostOfCapital × RealizationFactor × DataMaturity",
      inputs: { annualRevenue, daysImproved, costOfCapital, realizationFactor, dataMaturity },
      intermediates: { workingCapitalFreed },
      output: value,
    },
  };
}

export function calculateReadinessScoreWithTrace(
  data: number,
  technical: number,
  organizational: number,
  governance: number,
): CalculationResult {
  const value = calculateReadinessScore(data, technical, organizational, governance);
  return {
    value,
    trace: {
      formula: "Org×0.30 + Data×0.30 + Tech×0.20 + Gov×0.20",
      inputs: { organizational, data, technical, governance },
      intermediates: {
        orgWeighted: organizational * READINESS_WEIGHTS.organizational,
        dataWeighted: data * READINESS_WEIGHTS.data,
        techWeighted: technical * READINESS_WEIGHTS.technical,
        govWeighted: governance * READINESS_WEIGHTS.governance,
      },
      output: value,
    },
  };
}

// -------------------------------------------------------------------------
// CROSS-VALIDATION GUARDRAILS
// Ported from researchapp — prevents inflated or double-counted benefits
// -------------------------------------------------------------------------

export const GUARDRAIL_LIMITS = {
  benefitsCapPct: 0.50,         // Total benefits cap: 50% of annual revenue
  perUseCaseCapPct: 0.15,       // Per use-case cap: 15% of annual revenue
  revenueWarningPct: 0.30,      // Warn if revenue benefits > 30% of revenue
  fteWarningPct: 0.20,          // Warn if FTE savings > 20% of headcount
  annualHoursPerFTE: 2080,      // Standard annual working hours per FTE
};

export interface CrossValidationResult {
  warnings: string[];
  metrics: {
    totalBenefitsVsRevenue: number;
    revenueRatio: number;
    fteRatio: number;
    benefitsCapped: boolean;
    scaleFactor: number;
  };
}

export function crossValidateUseCases(
  useCaseBenefits: Array<{
    costBenefit: number;
    revenueBenefit: number;
    riskBenefit: number;
    cashFlowBenefit: number;
    hoursSaved?: number;
  }>,
  annualRevenue: number,
  totalEmployees: number,
): CrossValidationResult {
  const warnings: string[] = [];
  let totalCost = 0, totalRevenue = 0, totalRisk = 0, totalCashFlow = 0, totalHours = 0;

  for (const uc of useCaseBenefits) {
    totalCost += uc.costBenefit;
    totalRevenue += uc.revenueBenefit;
    totalRisk += uc.riskBenefit;
    totalCashFlow += uc.cashFlowBenefit;
    totalHours += uc.hoursSaved || 0;
  }

  const totalBenefits = totalCost + totalRevenue + totalRisk + totalCashFlow;
  const benefitsRatio = annualRevenue > 0 ? totalBenefits / annualRevenue : 0;
  const revenueRatio = annualRevenue > 0 ? totalRevenue / annualRevenue : 0;
  const fteEquivalent = totalHours / GUARDRAIL_LIMITS.annualHoursPerFTE;
  const fteRatio = totalEmployees > 0 ? fteEquivalent / totalEmployees : 0;

  if (annualRevenue > 0 && benefitsRatio > GUARDRAIL_LIMITS.benefitsCapPct) {
    warnings.push(
      `Total benefits (${formatCurrency(totalBenefits)}) exceed ${GUARDRAIL_LIMITS.benefitsCapPct * 100}% of annual revenue. Benefits may be proportionally scaled.`,
    );
  }

  if (annualRevenue > 0 && revenueRatio > GUARDRAIL_LIMITS.revenueWarningPct) {
    warnings.push(
      `Revenue benefits (${formatCurrency(totalRevenue)}) exceed 30% of annual revenue. Possible double-counting across use cases.`,
    );
  }

  if (totalEmployees > 0 && fteRatio > GUARDRAIL_LIMITS.fteWarningPct) {
    warnings.push(
      `Hours saved (${totalHours.toLocaleString()}) implies ${fteEquivalent.toFixed(0)} FTEs — more than 20% of ${totalEmployees} employees. Verify for double-counting.`,
    );
  }

  const cap = annualRevenue > 0 ? annualRevenue * GUARDRAIL_LIMITS.benefitsCapPct : Infinity;
  const scaleFactor = totalBenefits > cap ? cap / totalBenefits : 1.0;

  return {
    warnings,
    metrics: {
      totalBenefitsVsRevenue: benefitsRatio,
      revenueRatio,
      fteRatio,
      benefitsCapped: scaleFactor < 1.0,
      scaleFactor,
    },
  };
}
