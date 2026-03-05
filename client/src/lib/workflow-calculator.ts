// =========================================================================
// CLIENT-SIDE WORKFLOW CALCULATOR
// Uses HyperFormula for real-time metric updates as users edit workflow nodes.
// Runs entirely in the browser — no API calls needed.
// =========================================================================

import {
  WorkflowMetricsEngine,
  type WorkflowStepInput,
  type WorkflowMetricsOutput,
} from "@shared/hyperformula-engine";
import type { InteractiveWorkflowNode, WorkflowLiveMetrics } from "@shared/types";

// Singleton engine instance (reused across edits for performance)
let engineInstance: WorkflowMetricsEngine | null = null;

function getEngine(): WorkflowMetricsEngine {
  if (!engineInstance) {
    engineInstance = new WorkflowMetricsEngine();
  }
  return engineInstance;
}

/**
 * Map automation level string to the expected type.
 */
function normalizeAutomationLevel(
  level: string | undefined,
): "full" | "assisted" | "supervised" | "manual" {
  if (level === "full" || level === "assisted" || level === "supervised" || level === "manual") {
    return level;
  }
  return "manual";
}

/**
 * Convert InteractiveWorkflowNodes to WorkflowStepInputs for the engine.
 */
function nodesToStepInputs(nodes: InteractiveWorkflowNode[]): WorkflowStepInput[] {
  return nodes.map((node) => ({
    employeeCount: node.employeeCount ?? 1,
    avgHourlyCost: node.avgHourlyCost ?? 75,
    hoursPerTask: node.hoursPerTask ?? 1,
    tasksPerMonth: node.tasksPerMonth ?? 20,
    isAIEnabled: node.isAIEnabled || false,
    automationLevel: normalizeAutomationLevel(node.automationLevel),
  }));
}

/**
 * Calculate live workflow metrics from current-state and target-state nodes.
 * This is the main function called from the Workflows page whenever
 * a node is added, removed, or edited.
 */
export function calculateWorkflowMetrics(
  currentNodes: InteractiveWorkflowNode[],
  targetNodes: InteractiveWorkflowNode[],
): WorkflowLiveMetrics {
  const engine = getEngine();

  const currentSteps = nodesToStepInputs(currentNodes);
  const targetSteps = nodesToStepInputs(targetNodes);

  const hitlCount = targetNodes.filter((n) => n.hitlCheckpoint).length;

  const result = engine.calculate(currentSteps, targetSteps, hitlCount);

  return {
    currentTotalHours: round2(result.currentTotalHours),
    targetTotalHours: round2(result.targetTotalHours),
    hoursSaved: round2(result.hoursSaved),
    costSaved: round2(result.costSaved),
    timeReductionPct: round1(result.timeReductionPct),
    costReductionPct: round1(result.costReductionPct),
    fteEquivalent: round1(result.fteEquivalent),
    automationPct: round1(result.automationPct),
    hitlCheckpointCount: hitlCount,
  };
}

/**
 * Get the raw engine output with per-step breakdown.
 */
export function calculateWorkflowMetricsDetailed(
  currentNodes: InteractiveWorkflowNode[],
  targetNodes: InteractiveWorkflowNode[],
): WorkflowMetricsOutput {
  const engine = getEngine();
  const currentSteps = nodesToStepInputs(currentNodes);
  const targetSteps = nodesToStepInputs(targetNodes);
  const hitlCount = targetNodes.filter((n) => n.hitlCheckpoint).length;
  return engine.calculate(currentSteps, targetSteps, hitlCount);
}

/**
 * Format a cost value for display.
 */
export function formatWorkflowCost(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

/**
 * Format hours for display.
 */
export function formatWorkflowHours(hours: number): string {
  if (hours >= 1000) return `${(hours / 1000).toFixed(1)}K hrs`;
  return `${hours.toFixed(0)} hrs`;
}

/**
 * Clean up the engine when component unmounts.
 */
export function destroyCalculator(): void {
  if (engineInstance) {
    engineInstance.destroy();
    engineInstance = null;
  }
}

// -------------------------------------------------------------------------
// Rounding helpers
// -------------------------------------------------------------------------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
