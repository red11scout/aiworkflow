import { describe, it, expect, afterEach } from "vitest";
import {
  BenefitsCalculationEngine,
  ReadinessCalculationEngine,
  WorkflowMetricsEngine,
  ProjectionEngine,
} from "../shared/hyperformula-engine";
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
  calculateNPV,
  calculatePaybackMonths,
} from "../shared/formulas";

// =========================================================================
// BENEFITS ENGINE — PARITY TESTS
// Verify HyperFormula produces identical results to raw formulas.
// =========================================================================

describe("BenefitsCalculationEngine — parity with formulas.ts", () => {
  let engine: BenefitsCalculationEngine;

  afterEach(() => {
    engine?.destroy();
  });

  it("matches calculateCostBenefit for typical inputs", () => {
    engine = new BenefitsCalculationEngine();
    const inputs = [{
      hoursSaved: 2000, loadedRate: 85, benefitsLoading: 1.35,
      adoptionRate: 0.9, dataMaturityCost: 0.75,
      upliftPct: 0, revenueAtRisk: 0, realizationRev: 0, dataMaturityRev: 0,
      riskReduction: 0, riskExposure: 0, realizationRisk: 0, dataMaturityRisk: 0,
      annualRevenue: 0, daysImproved: 0, costOfCapital: 0, realizationCf: 0, dataMaturityCf: 0,
      probabilityOfSuccess: 0.85,
    }];

    const results = engine.loadAndCalculate(inputs);
    const expected = calculateCostBenefit(2000, 85, 1.35, 0.9, 0.75);

    expect(results[0].costBenefit).toBeCloseTo(expected, 2);
    expect(results[0].revenueBenefit).toBe(0);
    expect(results[0].riskBenefit).toBe(0);
    expect(results[0].cashFlowBenefit).toBe(0);
    expect(results[0].totalAnnualValue).toBeCloseTo(expected, 2);
    expect(results[0].expectedValue).toBeCloseTo(expected * 0.85, 2);
  });

  it("matches all four benefit types simultaneously", () => {
    engine = new BenefitsCalculationEngine();
    const inputs = [{
      hoursSaved: 1500, loadedRate: 95, benefitsLoading: 1.35,
      adoptionRate: 0.9, dataMaturityCost: 0.8,
      upliftPct: 0.05, revenueAtRisk: 5000000, realizationRev: 0.95, dataMaturityRev: 0.8,
      riskReduction: 0.15, riskExposure: 2000000, realizationRisk: 0.8, dataMaturityRisk: 0.75,
      annualRevenue: 50000000, daysImproved: 10, costOfCapital: 0.08,
      realizationCf: 0.85, dataMaturityCf: 0.7,
      probabilityOfSuccess: 0.9,
    }];

    const results = engine.loadAndCalculate(inputs);

    const expectedCost = calculateCostBenefit(1500, 95, 1.35, 0.9, 0.8);
    const expectedRev = calculateRevenueBenefit(0.05, 5000000, 0.95, 0.8);
    const expectedRisk = calculateRiskBenefit(0.15, 2000000, 0.8, 0.75);
    const expectedCf = calculateCashFlowBenefit(50000000, 10, 0.08, 0.85, 0.7);
    const expectedTotal = calculateTotalAnnualValue(expectedCost, expectedRev, expectedRisk, expectedCf);
    const expectedEv = calculateExpectedValue(expectedTotal, 0.9);

    expect(results[0].costBenefit).toBeCloseTo(expectedCost, 2);
    expect(results[0].revenueBenefit).toBeCloseTo(expectedRev, 2);
    expect(results[0].riskBenefit).toBeCloseTo(expectedRisk, 2);
    expect(results[0].cashFlowBenefit).toBeCloseTo(expectedCf, 2);
    expect(results[0].totalAnnualValue).toBeCloseTo(expectedTotal, 2);
    expect(results[0].expectedValue).toBeCloseTo(expectedEv, 2);
  });

  it("applies scenario multipliers correctly", () => {
    engine = new BenefitsCalculationEngine();
    const inputs = [{
      hoursSaved: 1000, loadedRate: 100, benefitsLoading: 1.35,
      adoptionRate: 0.9, dataMaturityCost: 0.8,
      upliftPct: 0, revenueAtRisk: 0, realizationRev: 0, dataMaturityRev: 0,
      riskReduction: 0, riskExposure: 0, realizationRisk: 0, dataMaturityRisk: 0,
      annualRevenue: 0, daysImproved: 0, costOfCapital: 0, realizationCf: 0, dataMaturityCf: 0,
      probabilityOfSuccess: 0.85,
      benefitMultiplier: 0.6,      // Conservative
      probabilityMultiplier: 0.85,
    }];

    const results = engine.loadAndCalculate(inputs);
    const baseCost = calculateCostBenefit(1000, 100, 1.35, 0.9, 0.8);

    expect(results[0].costBenefit).toBeCloseTo(baseCost, 2);
    expect(results[0].costBenefitAdj).toBeCloseTo(baseCost * 0.6, 2);
    expect(results[0].adjustedProbability).toBeCloseTo(Math.min(1, 0.85 * 0.85), 4);
  });

  it("handles multiple use cases", () => {
    engine = new BenefitsCalculationEngine();
    const inputs = [
      {
        hoursSaved: 500, loadedRate: 75, benefitsLoading: 1.35,
        adoptionRate: 0.9, dataMaturityCost: 0.8,
        upliftPct: 0, revenueAtRisk: 0, realizationRev: 0, dataMaturityRev: 0,
        riskReduction: 0, riskExposure: 0, realizationRisk: 0, dataMaturityRisk: 0,
        annualRevenue: 0, daysImproved: 0, costOfCapital: 0, realizationCf: 0, dataMaturityCf: 0,
        probabilityOfSuccess: 0.8,
      },
      {
        hoursSaved: 3000, loadedRate: 120, benefitsLoading: 1.35,
        adoptionRate: 0.95, dataMaturityCost: 0.9,
        upliftPct: 0, revenueAtRisk: 0, realizationRev: 0, dataMaturityRev: 0,
        riskReduction: 0, riskExposure: 0, realizationRisk: 0, dataMaturityRisk: 0,
        annualRevenue: 0, daysImproved: 0, costOfCapital: 0, realizationCf: 0, dataMaturityCf: 0,
        probabilityOfSuccess: 0.9,
      },
    ];

    const results = engine.loadAndCalculate(inputs);

    expect(results[0].costBenefit).toBeCloseTo(calculateCostBenefit(500, 75, 1.35, 0.9, 0.8), 2);
    expect(results[1].costBenefit).toBeCloseTo(calculateCostBenefit(3000, 120, 1.35, 0.95, 0.9), 2);
  });

  it("handles zero inputs gracefully", () => {
    engine = new BenefitsCalculationEngine();
    const inputs = [{
      hoursSaved: 0, loadedRate: 0, benefitsLoading: 0,
      adoptionRate: 0, dataMaturityCost: 0,
      upliftPct: 0, revenueAtRisk: 0, realizationRev: 0, dataMaturityRev: 0,
      riskReduction: 0, riskExposure: 0, realizationRisk: 0, dataMaturityRisk: 0,
      annualRevenue: 0, daysImproved: 0, costOfCapital: 0, realizationCf: 0, dataMaturityCf: 0,
      probabilityOfSuccess: 0,
    }];

    const results = engine.loadAndCalculate(inputs);
    expect(results[0].costBenefit).toBe(0);
    expect(results[0].totalAnnualValue).toBe(0);
    expect(results[0].expectedValue).toBe(0);
  });

  it("supports cell-level updates via updateInput", () => {
    engine = new BenefitsCalculationEngine();
    const inputs = [{
      hoursSaved: 1000, loadedRate: 100, benefitsLoading: 1.35,
      adoptionRate: 0.9, dataMaturityCost: 0.8,
      upliftPct: 0, revenueAtRisk: 0, realizationRev: 0, dataMaturityRev: 0,
      riskReduction: 0, riskExposure: 0, realizationRisk: 0, dataMaturityRisk: 0,
      annualRevenue: 0, daysImproved: 0, costOfCapital: 0, realizationCf: 0, dataMaturityCf: 0,
      probabilityOfSuccess: 0.85,
    }];

    engine.loadAndCalculate(inputs);

    // Update hours saved from 1000 to 2000
    const updated = engine.updateInput(0, "hoursSaved", 2000);
    const expected = calculateCostBenefit(2000, 100, 1.35, 0.9, 0.8);
    expect(updated.costBenefit).toBeCloseTo(expected, 2);
  });
});

// =========================================================================
// READINESS ENGINE — PARITY TESTS
// =========================================================================

describe("ReadinessCalculationEngine — parity with formulas.ts", () => {
  let engine: ReadinessCalculationEngine;

  afterEach(() => {
    engine?.destroy();
  });

  it("matches calculateReadinessScore", () => {
    engine = new ReadinessCalculationEngine();
    const inputs = [{
      dataAvailability: 7,
      technicalInfrastructure: 6,
      organizationalCapacity: 8,
      governance: 5,
      runsPerMonth: 1000,
      inputTokensPerRun: 5000,
      outputTokensPerRun: 2000,
    }];

    const results = engine.loadAndCalculate(inputs);
    const expectedReadiness = calculateReadinessScore(7, 6, 8, 5);
    const expectedTokens = calculateMonthlyTokens(1000, 5000, 2000);
    const expectedCost = calculateAnnualTokenCost(1000, 5000, 2000);

    expect(results[0].readinessScore).toBeCloseTo(expectedReadiness, 4);
    expect(results[0].monthlyTokens).toBeCloseTo(expectedTokens, 0);
    expect(results[0].annualTokenCost).toBeCloseTo(expectedCost, 2);
  });

  it("handles multiple use cases", () => {
    engine = new ReadinessCalculationEngine();
    const inputs = [
      { dataAvailability: 9, technicalInfrastructure: 8, organizationalCapacity: 7, governance: 6, runsPerMonth: 500, inputTokensPerRun: 3000, outputTokensPerRun: 1000 },
      { dataAvailability: 4, technicalInfrastructure: 3, organizationalCapacity: 5, governance: 4, runsPerMonth: 200, inputTokensPerRun: 8000, outputTokensPerRun: 4000 },
    ];

    const results = engine.loadAndCalculate(inputs);

    expect(results[0].readinessScore).toBeCloseTo(calculateReadinessScore(9, 8, 7, 6), 4);
    expect(results[1].readinessScore).toBeCloseTo(calculateReadinessScore(4, 3, 5, 4), 4);
  });
});

// =========================================================================
// WORKFLOW METRICS ENGINE TESTS
// =========================================================================

describe("WorkflowMetricsEngine", () => {
  let engine: WorkflowMetricsEngine;

  afterEach(() => {
    engine?.destroy();
  });

  it("calculates before/after metrics correctly", () => {
    engine = new WorkflowMetricsEngine();

    const current = [
      { employeeCount: 5, avgHourlyCost: 75, hoursPerTask: 2, tasksPerMonth: 100, isAIEnabled: false, automationLevel: "manual" as const },
      { employeeCount: 3, avgHourlyCost: 95, hoursPerTask: 4, tasksPerMonth: 50, isAIEnabled: false, automationLevel: "manual" as const },
    ];

    const target = [
      { employeeCount: 5, avgHourlyCost: 75, hoursPerTask: 2, tasksPerMonth: 100, isAIEnabled: true, automationLevel: "full" as const },
      { employeeCount: 3, avgHourlyCost: 95, hoursPerTask: 4, tasksPerMonth: 50, isAIEnabled: true, automationLevel: "assisted" as const },
    ];

    const result = engine.calculate(current, target, 1);

    // Current: 5*75*2*100 = 75000 + 3*95*4*50 = 57000 = 132000 total
    expect(result.currentTotalCost).toBeCloseTo(75000 + 57000, 0);

    // Target with full automation: cost reduction = (1 - 1.0) = 0, so full cost = 0
    // Target with assisted: cost reduction = (1 - 0.75) = 0.25, so cost = 57000 * 0.25 = 14250
    expect(result.targetTotalCost).toBeCloseTo(0 + 14250, 0);

    expect(result.costSaved).toBeCloseTo(132000 - 14250, 0);
    expect(result.automationPct).toBe(100); // Both target steps are AI-enabled
    expect(result.hitlCheckpointCount).toBe(1);
  });

  it("handles empty workflows", () => {
    engine = new WorkflowMetricsEngine();
    const result = engine.calculate([], [], 0);

    expect(result.currentTotalHours).toBe(0);
    expect(result.targetTotalHours).toBe(0);
    expect(result.hoursSaved).toBe(0);
    expect(result.costSaved).toBe(0);
  });
});

// =========================================================================
// PROJECTION ENGINE — NPV / PAYBACK PARITY
// =========================================================================

describe("ProjectionEngine — parity with formulas.ts", () => {
  let engine: ProjectionEngine;

  afterEach(() => {
    engine?.destroy();
  });

  it("matches calculateNPV", () => {
    engine = new ProjectionEngine();
    const annual = 1000000;
    const investment = 200000;

    const hfNpv = engine.calculateNPV(annual, 3, 0.1, investment);
    const rawNpv = calculateNPV(annual, 3, 0.1, investment);

    expect(hfNpv).toBeCloseTo(rawNpv, 0);
  });

  it("matches calculatePaybackMonths", () => {
    engine = new ProjectionEngine();
    const annual = 500000;
    const investment = 100000;

    const hfPayback = engine.calculatePaybackMonths(annual, investment);
    const rawPayback = calculatePaybackMonths(annual, investment);

    expect(hfPayback).toBe(rawPayback);
  });

  it("handles zero benefit", () => {
    engine = new ProjectionEngine();
    expect(engine.calculatePaybackMonths(0, 100000)).toBe(0);
  });
});
