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

const READINESS_WEIGHTS = {
  data: 0.3,
  technical: 0.25,
  organizational: 0.25,
  governance: 0.2,
};

export function calculateReadinessScore(
  data: number,
  technical: number,
  organizational: number,
  governance: number,
): number {
  return (
    data * READINESS_WEIGHTS.data +
    technical * READINESS_WEIGHTS.technical +
    organizational * READINESS_WEIGHTS.organizational +
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

export function calculateValueScore(
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

export function calculatePriorityScore(
  valueScore: number,
  readinessScore: number,
  ttvScore: number,
): number {
  return valueScore * 0.5 + readinessScore * 0.3 + ttvScore * 0.2;
}

export function determinePriorityTier(
  valueScore: number,
  readinessScore: number,
): string {
  if (valueScore >= 7 && readinessScore >= 6) return "Tier 1 — Champions";
  if (readinessScore >= 6 && valueScore < 7) return "Tier 2 — Quick Wins";
  if (valueScore >= 7 && readinessScore < 6) return "Tier 3 — Strategic";
  return "Tier 4 — Foundation";
}

export function determineQuadrant(
  valueScore: number,
  readinessScore: number,
): string {
  if (valueScore >= 6 && readinessScore >= 6) return "quick_win";
  if (valueScore >= 6 && readinessScore < 6) return "strategic";
  if (valueScore < 6 && readinessScore >= 6) return "fill_in";
  return "deprioritize";
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
