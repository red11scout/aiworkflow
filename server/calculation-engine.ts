import {
  calculateCostBenefit,
  calculateRevenueBenefit,
  calculateRiskBenefit,
  calculateCashFlowBenefit,
  calculateTotalAnnualValue,
  calculateExpectedValue,
  calculateReadinessScore,
  calculateMonthlyTokens,
  calculateAnnualTokenCost,
  calculateValueScore,
  calculateTTVScore,
  calculatePriorityScore,
  determinePriorityTier,
  determineQuadrant,
  determinePhase,
  calculateNPV,
  calculateIRR,
  calculatePaybackMonths,
  formatCurrency,
  SCENARIO_MULTIPLIERS,
  type ScenarioMultipliers,
} from "@shared/formulas";
import type {
  BenefitQuantification,
  ReadinessModel,
  PriorityScore,
  ScenarioAnalysis,
  MultiYearProjection,
  ExecutiveDashboard,
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

    // Calculate each benefit from components
    let cost = 0;
    if (costComponents.length >= 2) {
      const hoursSaved = costComponents.find((c) => c.label === "Hours Saved")?.value || 0;
      const rate = costComponents.find((c) => c.label === "Loaded Hourly Rate")?.value || 0;
      const loading = costComponents.find((c) => c.label === "Benefits Loading")?.value || 1.35;
      const adoption = costComponents.find((c) => c.label === "Adoption Rate")?.value || 0.9;
      const maturity = costComponents.find((c) => c.label === "Data Maturity")?.value || 0.75;
      cost = calculateCostBenefit(hoursSaved, rate, loading, adoption, maturity);
    }

    let revenue = 0;
    if (revComponents.length >= 2) {
      const uplift = revComponents.find((c) => c.label === "Revenue Uplift %")?.value || 0;
      const atRisk = revComponents.find((c) => c.label === "Revenue at Risk")?.value || 0;
      const realization = revComponents.find((c) => c.label === "Realization Factor")?.value || 0.95;
      const maturity = revComponents.find((c) => c.label === "Data Maturity")?.value || 0.75;
      revenue = calculateRevenueBenefit(uplift, atRisk, realization, maturity);
    }

    let risk = 0;
    if (riskComponents.length >= 2) {
      const reduction = riskComponents.find((c) => c.label === "Risk Reduction %")?.value || 0;
      const exposure = riskComponents.find((c) => c.label === "Risk Exposure")?.value || 0;
      const realization = riskComponents.find((c) => c.label === "Realization Factor")?.value || 0.8;
      const maturity = riskComponents.find((c) => c.label === "Data Maturity")?.value || 0.75;
      risk = calculateRiskBenefit(reduction, exposure, realization, maturity);
    }

    let cashFlow = 0;
    if (cfComponents.length >= 2) {
      const annualRev = cfComponents.find((c) => c.label === "Annual Revenue")?.value || 0;
      const days = cfComponents.find((c) => c.label === "Days Improved")?.value || 0;
      const capital = cfComponents.find((c) => c.label === "Cost of Capital")?.value || 0.08;
      const realization = cfComponents.find((c) => c.label === "Realization Factor")?.value || 0.85;
      const maturity = cfComponents.find((c) => c.label === "Data Maturity")?.value || 0.75;
      cashFlow = calculateCashFlowBenefit(annualRev, days, capital, realization, maturity);
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

export function recalculatePriorities(
  benefits: BenefitQuantification[],
  readiness: ReadinessModel[],
): PriorityScore[] {
  // Parse expected values for normalization
  const expectedValues = benefits.map((b) => {
    const clean = b.expectedValue.replace(/[,$]/g, "");
    if (clean.endsWith("M")) return parseFloat(clean) * 1_000_000;
    if (clean.endsWith("K")) return parseFloat(clean) * 1_000;
    return parseFloat(clean) || 0;
  });

  return benefits.map((b, idx) => {
    const r = readiness.find((r) => r.useCaseId === b.useCaseId);
    const readinessScore = r?.readinessScore || 5;
    const ttv = r?.timeToValue || 12;
    const ev = expectedValues[idx];

    const valueScore = calculateValueScore(ev, expectedValues);
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

export function generateScenarioAnalysis(
  benefits: BenefitQuantification[],
): ScenarioAnalysis {
  const calcTotal = (multiplier: ScenarioMultipliers): number => {
    const recalc = recalculateBenefits(benefits, multiplier);
    return recalc.reduce((sum, b) => {
      const clean = b.expectedValue.replace(/[,$]/g, "");
      let val = 0;
      if (clean.endsWith("M")) val = parseFloat(clean) * 1_000_000;
      else if (clean.endsWith("K")) val = parseFloat(clean) * 1_000;
      else val = parseFloat(clean) || 0;
      return sum + val;
    }, 0);
  };

  const conservative = calcTotal(SCENARIO_MULTIPLIERS.conservative);
  const moderate = calcTotal(SCENARIO_MULTIPLIERS.base);
  const aggressive = calcTotal(SCENARIO_MULTIPLIERS.optimistic);

  return {
    conservative: {
      npv: formatCurrency(calculateNPV(conservative)),
      annualBenefit: formatCurrency(conservative),
      paybackMonths: 0,
    },
    moderate: {
      npv: formatCurrency(calculateNPV(moderate)),
      annualBenefit: formatCurrency(moderate),
      paybackMonths: 0,
    },
    aggressive: {
      npv: formatCurrency(calculateNPV(aggressive)),
      annualBenefit: formatCurrency(aggressive),
      paybackMonths: 0,
    },
  };
}

// =========================================================================
// GENERATE MULTI-YEAR PROJECTION
// =========================================================================

export function generateMultiYearProjection(
  benefits: BenefitQuantification[],
): MultiYearProjection {
  const totalAnnual = benefits.reduce((sum, b) => {
    const clean = b.expectedValue.replace(/[,$]/g, "");
    let val = 0;
    if (clean.endsWith("M")) val = parseFloat(clean) * 1_000_000;
    else if (clean.endsWith("K")) val = parseFloat(clean) * 1_000;
    else val = parseFloat(clean) || 0;
    return sum + val;
  }, 0);

  const npv = calculateNPV(totalAnnual, 3, 0.1);
  const irr = calculateIRR(totalAnnual, 3, totalAnnual * 0.2);
  const payback = calculatePaybackMonths(totalAnnual, totalAnnual * 0.2);
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
  const parseValue = (s: string): number => {
    const clean = s.replace(/[,$]/g, "");
    if (clean.endsWith("M")) return parseFloat(clean) * 1_000_000;
    if (clean.endsWith("K")) return parseFloat(clean) * 1_000;
    return parseFloat(clean) || 0;
  };

  const topUseCases = priorities
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .map((p, i) => {
      const b = benefits.find((b) => b.useCaseId === p.useCaseId);
      const r = readiness.find((r) => r.useCaseId === p.useCaseId);
      return {
        rank: i + 1,
        useCase: p.useCaseName,
        annualValue: b ? parseValue(b.totalAnnualValue) : 0,
        monthlyTokens: r?.monthlyTokens || 0,
        priorityScore: p.priorityScore,
      };
    });

  const totalAnnualValue = topUseCases.reduce(
    (s, u) => s + u.annualValue,
    0,
  );
  const totalCost = benefits.reduce(
    (s, b) => s + parseValue(b.costBenefit),
    0,
  );
  const totalRevenue = benefits.reduce(
    (s, b) => s + parseValue(b.revenueBenefit),
    0,
  );
  const totalRisk = benefits.reduce(
    (s, b) => s + parseValue(b.riskBenefit),
    0,
  );
  const totalCashFlow = benefits.reduce(
    (s, b) => s + parseValue(b.cashFlowBenefit),
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
