import { describe, it, expect } from "vitest";
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
  crossValidateUseCases,
  READINESS_WEIGHTS,
  SCENARIO_MULTIPLIERS,
  GUARDRAIL_LIMITS,
} from "@shared/formulas";
import { clampInput, INPUT_BOUNDS, FRICTION_RECOVERY_RATE } from "@shared/assumptions";

// =========================================================================
// BENEFIT CALCULATIONS
// =========================================================================

describe("calculateCostBenefit", () => {
  it("computes cost benefit with standard inputs", () => {
    // 34000 hours × $150/hr × 1.35 loading × 0.9 adoption × 0.75 maturity
    const result = calculateCostBenefit(34000, 150, 1.35, 0.9, 0.75);
    expect(result).toBeCloseTo(34000 * 150 * 1.35 * 0.9 * 0.75);
  });

  it("returns 0 for zero hours", () => {
    expect(calculateCostBenefit(0, 150, 1.35, 0.9, 0.75)).toBe(0);
  });

  it("returns 0 for zero rate", () => {
    expect(calculateCostBenefit(34000, 0, 1.35, 0.9, 0.75)).toBe(0);
  });
});

describe("calculateRevenueBenefit", () => {
  it("computes revenue benefit with standard inputs", () => {
    const result = calculateRevenueBenefit(0.05, 10_000_000, 0.95, 0.75);
    expect(result).toBeCloseTo(0.05 * 10_000_000 * 0.95 * 0.75);
  });

  it("returns 0 for zero uplift", () => {
    expect(calculateRevenueBenefit(0, 10_000_000, 0.95, 0.75)).toBe(0);
  });
});

describe("calculateRiskBenefit", () => {
  it("computes risk benefit with standard inputs", () => {
    const result = calculateRiskBenefit(0.3, 5_000_000, 0.8, 0.75);
    expect(result).toBeCloseTo(0.3 * 5_000_000 * 0.8 * 0.75);
  });
});

describe("calculateCashFlowBenefit", () => {
  it("computes cash flow benefit correctly", () => {
    // $365M revenue, 15 days improvement, 8% cost of capital
    const result = calculateCashFlowBenefit(365_000_000, 15, 0.08, 0.85, 0.75);
    const expected = 365_000_000 * (15 / 365) * 0.08 * 0.85 * 0.75;
    expect(result).toBeCloseTo(expected);
  });

  it("returns 0 for zero days", () => {
    expect(calculateCashFlowBenefit(365_000_000, 0, 0.08, 0.85, 0.75)).toBe(0);
  });
});

describe("calculateTotalAnnualValue", () => {
  it("sums all four benefit types", () => {
    expect(calculateTotalAnnualValue(100, 200, 300, 400)).toBe(1000);
  });
});

describe("calculateExpectedValue", () => {
  it("multiplies by probability", () => {
    expect(calculateExpectedValue(1_000_000, 0.75)).toBe(750_000);
  });

  it("returns 0 for zero probability", () => {
    expect(calculateExpectedValue(1_000_000, 0)).toBe(0);
  });
});

// =========================================================================
// READINESS CALCULATIONS
// =========================================================================

describe("READINESS_WEIGHTS", () => {
  it("sums to 1.0", () => {
    const sum =
      READINESS_WEIGHTS.organizational +
      READINESS_WEIGHTS.data +
      READINESS_WEIGHTS.technical +
      READINESS_WEIGHTS.governance;
    expect(sum).toBeCloseTo(1.0);
  });

  it("has correct individual weights", () => {
    expect(READINESS_WEIGHTS.organizational).toBe(0.30);
    expect(READINESS_WEIGHTS.data).toBe(0.30);
    expect(READINESS_WEIGHTS.technical).toBe(0.20);
    expect(READINESS_WEIGHTS.governance).toBe(0.20);
  });
});

describe("calculateReadinessScore", () => {
  it("uses correct weights (org=0.30, data=0.30, tech=0.20, gov=0.20)", () => {
    // data=8, tech=6, org=7, gov=5
    const result = calculateReadinessScore(8, 6, 7, 5);
    const expected = 7 * 0.30 + 8 * 0.30 + 6 * 0.20 + 5 * 0.20;
    expect(result).toBeCloseTo(expected);
  });

  it("produces maximum score of 10 with all 10s", () => {
    const result = calculateReadinessScore(10, 10, 10, 10);
    expect(result).toBe(10);
  });

  it("produces minimum score of 1 with all 1s", () => {
    const result = calculateReadinessScore(1, 1, 1, 1);
    expect(result).toBe(1);
  });
});

describe("calculateMonthlyTokens", () => {
  it("computes total monthly tokens", () => {
    expect(calculateMonthlyTokens(100, 5000, 2000)).toBe(100 * 7000);
  });
});

describe("calculateAnnualTokenCost", () => {
  it("computes annual cost with Claude pricing", () => {
    // 100 runs/month × 5000 input × $3/1M + 100 × 2000 output × $15/1M, × 12
    const result = calculateAnnualTokenCost(100, 5000, 2000);
    const monthlyInput = 100 * 5000 * (3 / 1_000_000);
    const monthlyOutput = 100 * 2000 * (15 / 1_000_000);
    expect(result).toBeCloseTo((monthlyInput + monthlyOutput) * 12);
  });
});

// =========================================================================
// PRIORITY CALCULATIONS
// =========================================================================

describe("calculateValueScore", () => {
  it("normalizes to 0-10 scale", () => {
    const result = calculateValueScore(500_000, [250_000, 500_000, 1_000_000]);
    expect(result).toBeCloseTo(5);
  });

  it("returns 10 for highest value", () => {
    const result = calculateValueScore(1_000_000, [250_000, 500_000, 1_000_000]);
    expect(result).toBe(10);
  });

  it("returns 0 when all values are 0", () => {
    expect(calculateValueScore(0, [0, 0, 0])).toBe(0);
  });
});

describe("calculateTTVScore", () => {
  it("returns 1 for very fast TTV (< 10 months)", () => {
    const result = calculateTTVScore(3);
    expect(result).toBe(1); // clamped at 1
  });

  it("returns 0 for TTV >= 18 months", () => {
    expect(calculateTTVScore(18)).toBe(0);
  });

  it("includes bonus for TTV < 10 months", () => {
    const with9 = calculateTTVScore(9);
    const with11 = calculateTTVScore(11);
    // 9 months: base = (18-9)/18 = 0.5, bonus = 0.25 → 0.75
    expect(with9).toBeCloseTo(0.75);
    // 11 months: base = (18-11)/18 ≈ 0.389, no bonus → 0.389
    expect(with11).toBeCloseTo(7 / 18);
  });
});

describe("calculatePriorityScore", () => {
  it("is 50% readiness + 50% value", () => {
    const result = calculatePriorityScore(8, 6);
    expect(result).toBeCloseTo(7); // 8*0.5 + 6*0.5
  });

  it("ignores TTV parameter", () => {
    const withTTV = calculatePriorityScore(8, 6, 0.9);
    const withoutTTV = calculatePriorityScore(8, 6);
    expect(withTTV).toBe(withoutTTV);
  });
});

describe("determinePriorityTier", () => {
  it("Champions when value >= 5.5 AND readiness >= 5.5", () => {
    expect(determinePriorityTier(7, 7)).toBe("Tier 1 — Champions");
    expect(determinePriorityTier(5.5, 5.5)).toBe("Tier 1 — Champions");
  });

  it("Quick Wins when value < 5.5 AND readiness >= 5.5", () => {
    expect(determinePriorityTier(4, 7)).toBe("Tier 2 — Quick Wins");
  });

  it("Strategic when value >= 5.5 AND readiness < 5.5", () => {
    expect(determinePriorityTier(7, 4)).toBe("Tier 3 — Strategic");
  });

  it("Foundation when both < 5.5", () => {
    expect(determinePriorityTier(4, 4)).toBe("Tier 4 — Foundation");
  });
});

describe("determineQuadrant", () => {
  it("returns correct quadrant strings", () => {
    expect(determineQuadrant(7, 7)).toBe("champions");
    expect(determineQuadrant(7, 4)).toBe("strategic");
    expect(determineQuadrant(4, 7)).toBe("quick_wins");
    expect(determineQuadrant(4, 4)).toBe("foundation");
  });
});

describe("determinePhase", () => {
  it("Q1 for score >= 7", () => {
    expect(determinePhase(7)).toBe("Q1");
    expect(determinePhase(10)).toBe("Q1");
  });

  it("Q2 for score >= 5.5", () => {
    expect(determinePhase(5.5)).toBe("Q2");
    expect(determinePhase(6.9)).toBe("Q2");
  });

  it("Q3 for score >= 4", () => {
    expect(determinePhase(4)).toBe("Q3");
    expect(determinePhase(5.4)).toBe("Q3");
  });

  it("Q4 for score < 4", () => {
    expect(determinePhase(3.9)).toBe("Q4");
    expect(determinePhase(0)).toBe("Q4");
  });
});

// =========================================================================
// SCENARIO MULTIPLIERS
// =========================================================================

describe("SCENARIO_MULTIPLIERS", () => {
  it("conservative = 0.6 benefit, 0.85 probability", () => {
    expect(SCENARIO_MULTIPLIERS.conservative.benefitMultiplier).toBe(0.6);
    expect(SCENARIO_MULTIPLIERS.conservative.probabilityMultiplier).toBe(0.85);
  });

  it("base = 1.0 / 1.0", () => {
    expect(SCENARIO_MULTIPLIERS.base.benefitMultiplier).toBe(1.0);
    expect(SCENARIO_MULTIPLIERS.base.probabilityMultiplier).toBe(1.0);
  });

  it("optimistic = 1.3 / 1.0", () => {
    expect(SCENARIO_MULTIPLIERS.optimistic.benefitMultiplier).toBe(1.3);
    expect(SCENARIO_MULTIPLIERS.optimistic.probabilityMultiplier).toBe(1.0);
  });
});

// =========================================================================
// FINANCIAL PROJECTIONS
// =========================================================================

describe("calculateNPV", () => {
  it("returns positive NPV for profitable project", () => {
    const npv = calculateNPV(1_000_000, 3, 0.1, 500_000);
    expect(npv).toBeGreaterThan(0);
  });

  it("returns -investment when annual benefit is 0", () => {
    const npv = calculateNPV(0, 3, 0.1, 500_000);
    expect(npv).toBe(-500_000);
  });

  it("produces correct 3-year NPV", () => {
    // $1M annual, 10% discount, $200K investment
    const npv = calculateNPV(1_000_000, 3, 0.1, 200_000);
    const y1 = 1_000_000 / 1.1;
    const y2 = 1_000_000 / (1.1 * 1.1);
    const y3 = 1_000_000 / (1.1 * 1.1 * 1.1);
    expect(npv).toBeCloseTo(-200_000 + y1 + y2 + y3);
  });
});

describe("calculateIRR", () => {
  it("returns 0 when investment is 0", () => {
    expect(calculateIRR(1_000_000, 3, 0)).toBe(0);
  });

  it("returns positive rate for profitable project", () => {
    const irr = calculateIRR(1_000_000, 3, 500_000);
    expect(irr).toBeGreaterThan(0);
  });
});

describe("calculatePaybackMonths", () => {
  it("returns correct months", () => {
    // $200K investment, $1M annual → 0.2 years → ceil(2.4) = 3 months
    expect(calculatePaybackMonths(1_000_000, 200_000)).toBe(3);
  });

  it("returns 0 when annual benefit is 0", () => {
    expect(calculatePaybackMonths(0, 200_000)).toBe(0);
  });

  it("returns 0 when investment is 0", () => {
    expect(calculatePaybackMonths(1_000_000, 0)).toBe(0);
  });

  it("returns 12 for break-even in 1 year", () => {
    expect(calculatePaybackMonths(1_000_000, 1_000_000)).toBe(12);
  });
});

// =========================================================================
// FORMATTING & PARSING
// =========================================================================

describe("formatCurrency", () => {
  it("formats millions correctly", () => {
    expect(formatCurrency(2_500_000)).toBe("$2.5M");
  });

  it("formats thousands correctly", () => {
    expect(formatCurrency(150_000)).toBe("$150K");
  });

  it("formats small values correctly", () => {
    expect(formatCurrency(500)).toBe("$500");
  });

  it("handles negative millions", () => {
    expect(formatCurrency(-2_500_000)).toBe("$-2.5M");
  });
});

describe("parseCurrencyString", () => {
  it("parses $1.5M correctly", () => {
    expect(parseCurrencyString("$1.5M")).toBe(1_500_000);
  });

  it("parses $150K correctly", () => {
    expect(parseCurrencyString("$150K")).toBe(150_000);
  });

  it("parses $1.5B correctly", () => {
    expect(parseCurrencyString("$1.5B")).toBe(1_500_000_000);
  });

  it("parses plain numbers", () => {
    expect(parseCurrencyString("$1500")).toBe(1500);
  });

  it("handles commas", () => {
    expect(parseCurrencyString("$1,500,000")).toBe(1_500_000);
  });

  it("returns 0 for invalid input", () => {
    expect(parseCurrencyString("")).toBe(0);
    expect(parseCurrencyString("abc")).toBe(0);
  });
});

// =========================================================================
// INPUT VALIDATION
// =========================================================================

describe("clampInput", () => {
  it("clamps below minimum", () => {
    expect(clampInput("loadedHourlyRate", 10)).toBe(25);
  });

  it("clamps above maximum", () => {
    expect(clampInput("hoursSaved", 1_000_000)).toBe(500_000);
  });

  it("passes through valid values", () => {
    expect(clampInput("hoursSaved", 34000)).toBe(34000);
  });

  it("returns value unchanged for unknown field", () => {
    expect(clampInput("unknownField", 42)).toBe(42);
  });
});

describe("FRICTION_RECOVERY_RATE", () => {
  it("is 0.60 (60%)", () => {
    expect(FRICTION_RECOVERY_RATE).toBe(0.60);
  });
});

// =========================================================================
// CROSS-CONSISTENCY: Verify weights/multipliers match expectations
// =========================================================================

describe("Cross-consistency checks", () => {
  it("readiness weights match between formulas.ts export and expected values", () => {
    // These are the authoritative weights from the assumptions Excel
    expect(READINESS_WEIGHTS).toEqual({
      organizational: 0.30,
      data: 0.30,
      technical: 0.20,
      governance: 0.20,
    });
  });

  it("scenario multipliers contain all three scenarios", () => {
    expect(SCENARIO_MULTIPLIERS).toHaveProperty("base");
    expect(SCENARIO_MULTIPLIERS).toHaveProperty("conservative");
    expect(SCENARIO_MULTIPLIERS).toHaveProperty("optimistic");
  });

  it("INPUT_BOUNDS has entries for key fields", () => {
    const fields = INPUT_BOUNDS.map((b) => b.field);
    expect(fields).toContain("hoursSaved");
    expect(fields).toContain("loadedHourlyRate");
    expect(fields).toContain("upliftPct");
    expect(fields).toContain("daysImprovement");
    expect(fields).toContain("costOfCapital");
  });
});

// =========================================================================
// AUDIT TRACES
// =========================================================================

describe("Traced calculations", () => {
  it("calculateCostBenefitWithTrace returns value and trace", () => {
    const result = calculateCostBenefitWithTrace(34000, 150, 1.35, 0.9, 0.75);
    expect(result.value).toBeCloseTo(34000 * 150 * 1.35 * 0.9 * 0.75);
    expect(result.trace.formula).toContain("HoursSaved");
    expect(result.trace.inputs.hoursSaved).toBe(34000);
    expect(result.trace.inputs.loadedRate).toBe(150);
    expect(result.trace.output).toBe(result.value);
  });

  it("calculateRevenueBenefitWithTrace returns value and trace", () => {
    const result = calculateRevenueBenefitWithTrace(0.05, 10_000_000, 0.95, 0.75);
    expect(result.value).toBeCloseTo(0.05 * 10_000_000 * 0.95 * 0.75);
    expect(result.trace.formula).toContain("UpliftPct");
    expect(result.trace.output).toBe(result.value);
  });

  it("calculateCashFlowBenefitWithTrace includes working capital intermediate", () => {
    const result = calculateCashFlowBenefitWithTrace(365_000_000, 15, 0.08, 0.85, 0.75);
    expect(result.trace.intermediates?.workingCapitalFreed).toBeCloseTo(365_000_000 * 15 / 365);
    expect(result.trace.output).toBe(result.value);
  });

  it("calculateReadinessScoreWithTrace includes weighted intermediates", () => {
    const result = calculateReadinessScoreWithTrace(8, 6, 7, 5);
    expect(result.trace.intermediates?.orgWeighted).toBeCloseTo(7 * 0.30);
    expect(result.trace.intermediates?.dataWeighted).toBeCloseTo(8 * 0.30);
    expect(result.trace.intermediates?.techWeighted).toBeCloseTo(6 * 0.20);
    expect(result.trace.intermediates?.govWeighted).toBeCloseTo(5 * 0.20);
    expect(result.value).toBeCloseTo(result.trace.output);
  });

  it("traced and non-traced versions produce identical values", () => {
    const plain = calculateCostBenefit(34000, 150, 1.35, 0.9, 0.75);
    const traced = calculateCostBenefitWithTrace(34000, 150, 1.35, 0.9, 0.75);
    expect(traced.value).toBe(plain);
  });
});

// =========================================================================
// CROSS-VALIDATION GUARDRAILS
// =========================================================================

describe("crossValidateUseCases", () => {
  it("warns when total benefits exceed 50% of annual revenue", () => {
    const result = crossValidateUseCases(
      [{ costBenefit: 60_000_000, revenueBenefit: 0, riskBenefit: 0, cashFlowBenefit: 0 }],
      100_000_000, // $100M revenue
      1000,
    );
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("50%");
    expect(result.metrics.benefitsCapped).toBe(true);
    expect(result.metrics.scaleFactor).toBeLessThan(1);
  });

  it("warns when revenue benefits exceed 30% of annual revenue", () => {
    const result = crossValidateUseCases(
      [{ costBenefit: 0, revenueBenefit: 40_000_000, riskBenefit: 0, cashFlowBenefit: 0 }],
      100_000_000,
      1000,
    );
    expect(result.warnings.some((w) => w.includes("30%"))).toBe(true);
  });

  it("warns when FTE savings exceed 20% of headcount", () => {
    const result = crossValidateUseCases(
      [{ costBenefit: 1_000_000, revenueBenefit: 0, riskBenefit: 0, cashFlowBenefit: 0, hoursSaved: 500_000 }],
      1_000_000_000,
      1000,
    );
    // 500K hours / 2080 = 240 FTEs, 240/1000 = 24% > 20%
    expect(result.warnings.some((w) => w.includes("20%"))).toBe(true);
    expect(result.metrics.fteRatio).toBeCloseTo(0.24, 1);
  });

  it("returns no warnings for reasonable benefits", () => {
    const result = crossValidateUseCases(
      [{ costBenefit: 2_000_000, revenueBenefit: 1_000_000, riskBenefit: 500_000, cashFlowBenefit: 200_000 }],
      100_000_000,
      1000,
    );
    expect(result.warnings).toHaveLength(0);
    expect(result.metrics.benefitsCapped).toBe(false);
    expect(result.metrics.scaleFactor).toBe(1.0);
  });

  it("computes correct scale factor when capped", () => {
    const result = crossValidateUseCases(
      [{ costBenefit: 80_000_000, revenueBenefit: 0, riskBenefit: 0, cashFlowBenefit: 0 }],
      100_000_000, // cap at $50M
      1000,
    );
    expect(result.metrics.scaleFactor).toBeCloseTo(50_000_000 / 80_000_000);
  });
});

describe("GUARDRAIL_LIMITS", () => {
  it("has expected default values", () => {
    expect(GUARDRAIL_LIMITS.benefitsCapPct).toBe(0.50);
    expect(GUARDRAIL_LIMITS.perUseCaseCapPct).toBe(0.15);
    expect(GUARDRAIL_LIMITS.revenueWarningPct).toBe(0.30);
    expect(GUARDRAIL_LIMITS.fteWarningPct).toBe(0.20);
    expect(GUARDRAIL_LIMITS.annualHoursPerFTE).toBe(2080);
  });
});
