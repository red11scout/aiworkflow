import {
  calculateCostBenefit,
  calculateRevenueBenefit,
  calculateRiskBenefit,
  calculateCashFlowBenefit,
  calculateCostBenefitWithTrace,
  calculateRevenueBenefitWithTrace,
  calculateRiskBenefitWithTrace,
  calculateCashFlowBenefitWithTrace,
  calculateReadinessScoreWithTrace,
  calculateTotalAnnualValue,
  calculateExpectedValue,
  calculateReadinessScore,
  calculateMonthlyTokens,
  calculateAnnualTokenCost,
  calculateValueScore,
  calculateValueScoreLegacy,
  calculateValueRatio,
  calculateTTVScore,
  calculatePriorityScore,
  determinePriorityTier,
  determineQuadrant,
  determinePhase,
  calculateNPV,
  calculateIRR,
  calculatePaybackMonths,
  formatCurrency,
  parseCurrencyString,
  SCENARIO_MULTIPLIERS,
  type ScenarioMultipliers,
  type FormulaTrace,
} from "@shared/formulas";
import { clampInput } from "@shared/assumptions";
import type {
  BenefitQuantification,
  ReadinessModel,
  PriorityScore,
  ScenarioAnalysis,
  MultiYearProjection,
  ExecutiveDashboard,
  UseCase,
  FrictionPoint,
} from "@shared/types";

// =========================================================================
// RECALCULATE BENEFITS for a set of use cases
// =========================================================================

export function recalculateBenefits(
  benefits: BenefitQuantification[],
  multipliers: ScenarioMultipliers = SCENARIO_MULTIPLIERS.base,
): BenefitQuantification[] {
  return benefits.map((b) => {
    const costComponents = b.costFormulaLabels.components;
    const revComponents = b.revenueFormulaLabels.components;
    const riskComponents = b.riskFormulaLabels.components;
    const cfComponents = b.cashFlowFormulaLabels.components;

    // Calculate each benefit from components (with input validation + traces)
    const traces: Record<string, FormulaTrace> = {};

    let cost = 0;
    if (costComponents.length >= 2) {
      const hoursSaved = clampInput("hoursSaved", costComponents.find((c) => c.label === "Hours Saved")?.value || 0);
      const rate = clampInput("loadedHourlyRate", costComponents.find((c) => c.label === "Loaded Hourly Rate")?.value || 0);
      const loading = costComponents.find((c) => c.label === "Benefits Loading")?.value || 1.35;
      const adoption = costComponents.find((c) => c.label === "Adoption Rate")?.value || 0.9;
      const maturity = costComponents.find((c) => c.label === "Data Maturity")?.value || 0.75;
      const result = calculateCostBenefitWithTrace(hoursSaved, rate, loading, adoption, maturity);
      cost = result.value;
      traces.cost = result.trace;
    }

    let revenue = 0;
    if (revComponents.length >= 2) {
      const uplift = clampInput("upliftPct", revComponents.find((c) => c.label === "Revenue Uplift %")?.value || 0);
      const atRisk = clampInput("baselineRevenueAtRisk", revComponents.find((c) => c.label === "Revenue at Risk")?.value || 0);
      const realization = revComponents.find((c) => c.label === "Realization Factor")?.value || 0.95;
      const maturity = revComponents.find((c) => c.label === "Data Maturity")?.value || 0.75;
      const result = calculateRevenueBenefitWithTrace(uplift, atRisk, realization, maturity);
      revenue = result.value;
      traces.revenue = result.trace;
    }

    let risk = 0;
    if (riskComponents.length >= 2) {
      const reduction = riskComponents.find((c) => c.label === "Risk Reduction %")?.value || 0;
      const exposure = riskComponents.find((c) => c.label === "Risk Exposure")?.value || 0;
      const realization = riskComponents.find((c) => c.label === "Realization Factor")?.value || 0.8;
      const maturity = riskComponents.find((c) => c.label === "Data Maturity")?.value || 0.75;
      const result = calculateRiskBenefitWithTrace(reduction, exposure, realization, maturity);
      risk = result.value;
      traces.risk = result.trace;
    }

    let cashFlow = 0;
    if (cfComponents.length >= 2) {
      const annualRev = clampInput("annualRevenue", cfComponents.find((c) => c.label === "Annual Revenue")?.value || 0);
      const days = clampInput("daysImprovement", cfComponents.find((c) => c.label === "Days Improved")?.value || 0);
      const capital = clampInput("costOfCapital", cfComponents.find((c) => c.label === "Cost of Capital")?.value || 0.08);
      const realization = cfComponents.find((c) => c.label === "Realization Factor")?.value || 0.85;
      const maturity = cfComponents.find((c) => c.label === "Data Maturity")?.value || 0.75;
      const result = calculateCashFlowBenefitWithTrace(annualRev, days, capital, realization, maturity);
      cashFlow = result.value;
      traces.cashFlow = result.trace;
    }

    // Apply scenario multiplier
    cost *= multipliers.benefitMultiplier;
    revenue *= multipliers.benefitMultiplier;
    risk *= multipliers.benefitMultiplier;
    cashFlow *= multipliers.benefitMultiplier;

    const total = calculateTotalAnnualValue(cost, revenue, risk, cashFlow);
    const prob = Math.min(1, b.probabilityOfSuccess * multipliers.probabilityMultiplier);
    const expected = calculateExpectedValue(total, prob);

    return {
      ...b,
      costBenefit: formatCurrency(cost),
      revenueBenefit: formatCurrency(revenue),
      riskBenefit: formatCurrency(risk),
      cashFlowBenefit: formatCurrency(cashFlow),
      totalAnnualValue: formatCurrency(total),
      expectedValue: formatCurrency(expected),
      probabilityOfSuccess: prob,
      _traces: traces,
    };
  });
}

// =========================================================================
// RECALCULATE READINESS scores
// =========================================================================

export function recalculateReadiness(
  readiness: ReadinessModel[],
): ReadinessModel[] {
  return readiness.map((r) => {
    const score = calculateReadinessScore(
      r.dataAvailability,
      r.technicalInfrastructure,
      r.organizationalCapacity,
      r.governance,
    );
    const monthly = calculateMonthlyTokens(
      r.runsPerMonth,
      r.inputTokensPerRun,
      r.outputTokensPerRun,
    );
    const annualCost = calculateAnnualTokenCost(
      r.runsPerMonth,
      r.inputTokensPerRun,
      r.outputTokensPerRun,
    );

    return {
      ...r,
      readinessScore: Math.round(score * 10) / 10,
      monthlyTokens: monthly,
      annualTokenCost: formatCurrency(annualCost),
    };
  });
}

// =========================================================================
// RECALCULATE PRIORITIES
// =========================================================================

/**
 * Find the friction annual cost for a given benefit by tracing:
 * benefit → use case (via useCaseId) → friction point (via targetFriction text match)
 */
function findFrictionCostForBenefit(
  benefit: BenefitQuantification,
  useCases: UseCase[],
  frictionPoints: FrictionPoint[],
): number {
  const uc = useCases.find((u) => u.id === benefit.useCaseId);
  if (!uc) return 0;

  // Match by targetFriction text against fp.frictionPoint
  const fp = frictionPoints.find(
    (f) => f.frictionPoint === uc.targetFriction || f.id === uc.id,
  );
  if (!fp) return 0;

  return parseCurrencyString(fp.estimatedAnnualCost);
}

export function recalculatePriorities(
  benefits: BenefitQuantification[],
  readiness: ReadinessModel[],
  frictionPoints?: FrictionPoint[],
  useCases?: UseCase[],
): PriorityScore[] {
  const expectedValues = benefits.map((b) => parseCurrencyString(b.expectedValue));

  // Determine if we can use the friction-based value score
  const hasFrictionData = frictionPoints && frictionPoints.length > 0 && useCases && useCases.length > 0;

  // Pre-compute all value ratios for normalization (friction-based path)
  let allRatios: number[] = [];
  if (hasFrictionData) {
    allRatios = benefits.map((b, idx) => {
      const frictionCost = findFrictionCostForBenefit(b, useCases!, frictionPoints!);
      return calculateValueRatio(expectedValues[idx], frictionCost);
    });
  }

  return benefits.map((b, idx) => {
    const r = readiness.find((r) => r.useCaseId === b.useCaseId);
    const readinessScore = r?.readinessScore || 5;
    const ttv = r?.timeToValue || 12;
    const ev = expectedValues[idx];

    // Use friction-based value score when data is available, otherwise legacy
    let valueScore: number;
    if (hasFrictionData) {
      const frictionCost = findFrictionCostForBenefit(b, useCases!, frictionPoints!);
      valueScore = calculateValueScore(ev, frictionCost, allRatios);
    } else {
      valueScore = calculateValueScoreLegacy(ev, expectedValues);
    }

    const ttvScore = calculateTTVScore(ttv);
    const priority = calculatePriorityScore(
      valueScore,
      readinessScore,
      ttvScore,
    );

    return {
      id: b.useCaseId,
      useCaseId: b.useCaseId,
      useCaseName: b.useCaseName,
      strategicTheme: b.strategicTheme,
      valueScore: Math.round(valueScore * 100) / 100,
      readinessScore: Math.round(readinessScore * 100) / 100,
      ttvScore: Math.round(ttvScore * 100) / 100,
      priorityScore: Math.round(priority * 100) / 100,
      priorityTier: determinePriorityTier(valueScore, readinessScore),
      recommendedPhase: determinePhase(priority),
    };
  });
}

// =========================================================================
// GENERATE SCENARIO ANALYSIS
// =========================================================================

// Initial investment estimated as 20% of base annual benefit (same as generateMultiYearProjection)
const INVESTMENT_PCT_OF_ANNUAL = 0.20;

export function generateScenarioAnalysis(
  benefits: BenefitQuantification[],
): ScenarioAnalysis {
  const calcTotal = (multiplier: ScenarioMultipliers): number => {
    const recalc = recalculateBenefits(benefits, multiplier);
    return recalc.reduce((sum, b) => sum + parseCurrencyString(b.expectedValue), 0);
  };

  const conservative = calcTotal(SCENARIO_MULTIPLIERS.conservative);
  const moderate = calcTotal(SCENARIO_MULTIPLIERS.base);
  const aggressive = calcTotal(SCENARIO_MULTIPLIERS.optimistic);

  // Use moderate (base) scenario for investment estimation
  const initialInvestment = moderate * INVESTMENT_PCT_OF_ANNUAL;

  return {
    conservative: {
      npv: formatCurrency(calculateNPV(conservative, 3, 0.1, initialInvestment)),
      annualBenefit: formatCurrency(conservative),
      paybackMonths: calculatePaybackMonths(conservative, initialInvestment),
    },
    moderate: {
      npv: formatCurrency(calculateNPV(moderate, 3, 0.1, initialInvestment)),
      annualBenefit: formatCurrency(moderate),
      paybackMonths: calculatePaybackMonths(moderate, initialInvestment),
    },
    aggressive: {
      npv: formatCurrency(calculateNPV(aggressive, 3, 0.1, initialInvestment)),
      annualBenefit: formatCurrency(aggressive),
      paybackMonths: calculatePaybackMonths(aggressive, initialInvestment),
    },
  };
}

// =========================================================================
// GENERATE MULTI-YEAR PROJECTION
// =========================================================================

export function generateMultiYearProjection(
  benefits: BenefitQuantification[],
): MultiYearProjection {
  const totalAnnual = benefits.reduce(
    (sum, b) => sum + parseCurrencyString(b.expectedValue), 0,
  );

  const initialInvestment = totalAnnual * INVESTMENT_PCT_OF_ANNUAL;
  const npv = calculateNPV(totalAnnual, 3, 0.1, initialInvestment);
  const irr = calculateIRR(totalAnnual, 3, initialInvestment);
  const payback = calculatePaybackMonths(totalAnnual, initialInvestment);
  const totalBenefit = totalAnnual * 3;

  return {
    irr: `${(irr * 100).toFixed(1)}%`,
    npv: formatCurrency(npv),
    paybackMonths: payback,
    totalBenefitOverPeriod: formatCurrency(totalBenefit),
  };
}

// =========================================================================
// GENERATE EXECUTIVE DASHBOARD
// =========================================================================

export function generateExecutiveDashboard(
  benefits: BenefitQuantification[],
  readiness: ReadinessModel[],
  priorities: PriorityScore[],
): ExecutiveDashboard {
  const topUseCases = priorities
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((p, i) => {
      const b = benefits.find((b) => b.useCaseId === p.useCaseId);
      const r = readiness.find((r) => r.useCaseId === p.useCaseId);
      return {
        rank: i + 1,
        useCase: p.useCaseName,
        annualValue: b ? parseCurrencyString(b.totalAnnualValue) : 0,
        monthlyTokens: r?.monthlyTokens || 0,
        priorityScore: p.priorityScore,
      };
    });

  const totalAnnualValue = topUseCases.reduce(
    (s, u) => s + u.annualValue,
    0,
  );
  const totalCost = benefits.reduce(
    (s, b) => s + parseCurrencyString(b.costBenefit),
    0,
  );
  const totalRevenue = benefits.reduce(
    (s, b) => s + parseCurrencyString(b.revenueBenefit),
    0,
  );
  const totalRisk = benefits.reduce(
    (s, b) => s + parseCurrencyString(b.riskBenefit),
    0,
  );
  const totalCashFlow = benefits.reduce(
    (s, b) => s + parseCurrencyString(b.cashFlowBenefit),
    0,
  );
  const totalMonthlyTokens = readiness.reduce(
    (s, r) => s + r.monthlyTokens,
    0,
  );

  return {
    topUseCases,
    totalAnnualValue,
    totalCostBenefit: totalCost,
    totalRevenueBenefit: totalRevenue,
    totalRiskBenefit: totalRisk,
    totalCashFlowBenefit: totalCashFlow,
    totalMonthlyTokens,
    valuePerMillionTokens:
      totalMonthlyTokens > 0
        ? Math.round(totalAnnualValue / (totalMonthlyTokens / 1_000_000))
        : 0,
  };
}
