/**
 * Shared workflow metrics computation utilities.
 * Used by Dashboard.tsx, PDFReport.tsx, and SharedReport.tsx.
 */
import type { WorkflowMap } from "@shared/types";
import { parseCurrencyString } from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseCaseRow {
  useCaseId: string;
  useCaseName: string;
  currentHours: number;
  targetHours: number;
  hoursSaved: number;
  costSaved: number;
  automationPct: number;
  status: string;
}

export interface SystemEntry {
  name: string;
  useCaseCount: number;
  useCases: string[];
}

export interface TypeCount {
  type: string;
  count: number;
}

export interface SystemsSummary {
  systems: SystemEntry[];
  integrationTypes: TypeCount[];
  dataTypes: TypeCount[];
}

// ---------------------------------------------------------------------------
// Enriched types for heat map + insights
// ---------------------------------------------------------------------------

export interface EnrichedSystemEntry {
  name: string;
  useCaseCount: number;
  useCases: string[];
  useCaseStepCounts: Record<string, number>;
  integrationAvailable: boolean | null;
  integrationTypes: string[];
  dataTypes: string[];
  totalStepReferences: number;
}

export interface DataTypeInsight {
  type: string;
  count: number;
  useCases: string[];
  category: "structured" | "semi_structured" | "unstructured" | "real_time";
}

export interface IntegrationGap {
  systemName: string;
  useCases: string[];
  currentIntegrationType: string;
  impactScore: number;
}

export interface SystemsInsight {
  type: "most_used_system" | "integration_gap" | "vectorization_needed" | "high_demand_data";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  relatedEntity: string;
}

export interface EnrichedSystemsSummary {
  enrichedSystems: EnrichedSystemEntry[];
  dataTypeInsights: DataTypeInsight[];
  integrationGaps: IntegrationGap[];
  insights: SystemsInsight[];
  heatMapMatrix: {
    systems: string[];
    useCases: string[];
    cells: number[][];
  };
  systems: SystemEntry[];
  integrationTypes: TypeCount[];
  dataTypes: TypeCount[];
}

// ---------------------------------------------------------------------------
// Duration parsing
// ---------------------------------------------------------------------------

export function parseDurationToHours(duration: string): number {
  if (!duration || duration === "--") return 0;
  const lower = duration.toLowerCase().trim();

  // "2 hours", "45 minutes", "5 min", "3 days", etc.
  const num = parseFloat(lower.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return 0;

  if (lower.includes("day")) return num * 8;
  if (lower.includes("hour") || lower.includes("hr")) return num;
  if (lower.includes("min")) return num / 60;
  if (lower.includes("sec")) return num / 3600;
  if (lower.includes("week")) return num * 40;

  // Default to hours if no unit
  return num;
}

// ---------------------------------------------------------------------------
// Per-use-case workflow metrics
// ---------------------------------------------------------------------------

export function computeWorkflowMetrics(wf: WorkflowMap): UseCaseRow {
  const currentNodes = wf.currentState || [];
  const targetNodes = wf.targetState || [];

  let currentHours = 0;
  let targetHours = 0;
  const totalNodes = targetNodes.length;
  let aiEnabledNodes = 0;

  for (const node of currentNodes) {
    currentHours += parseDurationToHours(node.duration);
  }
  for (const node of targetNodes) {
    targetHours += parseDurationToHours(node.duration);
    if ((node as any).isAIEnabled) aiEnabledNodes++;
  }

  const hoursSaved = Math.max(0, currentHours - targetHours);
  const automationPct = totalNodes > 0 ? (aiEnabledNodes / totalNodes) * 100 : 0;

  // Cost savings from comparisonMetrics if available
  let costSaved = 0;
  const cm = wf.comparisonMetrics;
  if (cm?.costReduction) {
    const before = parseCurrencyString(cm.costReduction.before || "0");
    const after = parseCurrencyString(cm.costReduction.after || "0");
    costSaved = Math.max(0, before - after);
  }

  // Determine status from comparison metrics improvement %
  let status = "Mapped";
  if (cm?.timeReduction?.improvement) {
    const impStr = cm.timeReduction.improvement.replace(/[^0-9.]/g, "");
    const impNum = parseFloat(impStr);
    if (!isNaN(impNum)) {
      if (impNum >= 70) status = "High Impact";
      else if (impNum >= 40) status = "Medium Impact";
      else status = "Low Impact";
    }
  }

  return {
    useCaseId: wf.useCaseId,
    useCaseName: wf.useCaseName,
    currentHours,
    targetHours,
    hoursSaved,
    costSaved,
    automationPct,
    status,
  };
}

// ---------------------------------------------------------------------------
// Cross-use-case systems/data/integrations aggregation
// ---------------------------------------------------------------------------

export function aggregateSystemsSummary(workflowMaps: WorkflowMap[]): SystemsSummary {
  const systemMap = new Map<string, Set<string>>(); // system name → set of use case names
  const integrationTypeMap = new Map<string, number>(); // type → count
  const dataTypeMap = new Map<string, number>(); // type → count

  for (const wf of workflowMaps) {
    const allNodes = [...(wf.currentState || []), ...(wf.targetState || [])];

    for (const node of allNodes) {
      // Collect from node.systems[]
      for (const sys of (node.systems || [])) {
        if (!sys) continue;
        if (!systemMap.has(sys)) systemMap.set(sys, new Set());
        systemMap.get(sys)!.add(wf.useCaseName);
      }

      // Collect from node.systemDetails[]
      for (const sd of ((node as any).systemDetails || [])) {
        if (sd.name) {
          if (!systemMap.has(sd.name)) systemMap.set(sd.name, new Set());
          systemMap.get(sd.name)!.add(wf.useCaseName);
        }
        if (sd.integrationType) {
          integrationTypeMap.set(
            sd.integrationType,
            (integrationTypeMap.get(sd.integrationType) || 0) + 1,
          );
        }
        if (sd.dataType) {
          dataTypeMap.set(sd.dataType, (dataTypeMap.get(sd.dataType) || 0) + 1);
        }
      }
    }

    // Also collect from workflow-level dataTypes[] and integrations[]
    for (const dt of (wf.dataTypes || [])) {
      if (dt) dataTypeMap.set(dt, (dataTypeMap.get(dt) || 0) + 1);
    }
    for (const ig of (wf.integrations || [])) {
      if (!ig) continue;
      if (!systemMap.has(ig)) systemMap.set(ig, new Set());
      systemMap.get(ig)!.add(wf.useCaseName);
    }
  }

  // Sort by frequency (descending)
  const systems = [...systemMap.entries()]
    .map(([name, ucSet]) => ({
      name,
      useCaseCount: ucSet.size,
      useCases: [...ucSet],
    }))
    .sort((a, b) => b.useCaseCount - a.useCaseCount);

  const integrationTypes = [...integrationTypeMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const dataTypes = [...dataTypeMap.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return { systems, integrationTypes, dataTypes };
}

// ---------------------------------------------------------------------------
// Enriched cross-use-case aggregation with heat map + insights
// ---------------------------------------------------------------------------

export function aggregateEnrichedSystemsSummary(
  workflowMaps: WorkflowMap[],
): EnrichedSystemsSummary {
  // Get the base summary
  const base = aggregateSystemsSummary(workflowMaps);

  // Build enriched per-system data
  const sysData = new Map<
    string,
    {
      useCases: Set<string>;
      stepCounts: Record<string, number>;
      integAvail: boolean | null;
      integTypes: Set<string>;
      dataTypes: Set<string>;
      totalRefs: number;
    }
  >();

  // Build data type → use cases mapping
  const dataTypeUseCases = new Map<string, Set<string>>();

  const useCaseNames: string[] = [];
  const useCaseNameSet = new Set<string>();

  for (const wf of workflowMaps) {
    if (!useCaseNameSet.has(wf.useCaseName)) {
      useCaseNameSet.add(wf.useCaseName);
      useCaseNames.push(wf.useCaseName);
    }

    const allNodes = [...(wf.currentState || []), ...(wf.targetState || [])];

    for (const node of allNodes) {
      // From node.systems[]
      for (const sys of node.systems || []) {
        if (!sys) continue;
        if (!sysData.has(sys)) {
          sysData.set(sys, {
            useCases: new Set(),
            stepCounts: {},
            integAvail: null,
            integTypes: new Set(),
            dataTypes: new Set(),
            totalRefs: 0,
          });
        }
        const d = sysData.get(sys)!;
        d.useCases.add(wf.useCaseName);
        d.stepCounts[wf.useCaseName] = (d.stepCounts[wf.useCaseName] || 0) + 1;
        d.totalRefs++;
      }

      // From node.systemDetails[]
      for (const sd of (node as any).systemDetails || []) {
        if (!sd.name) continue;
        if (!sysData.has(sd.name)) {
          sysData.set(sd.name, {
            useCases: new Set(),
            stepCounts: {},
            integAvail: null,
            integTypes: new Set(),
            dataTypes: new Set(),
            totalRefs: 0,
          });
        }
        const d = sysData.get(sd.name)!;
        d.useCases.add(wf.useCaseName);
        d.stepCounts[wf.useCaseName] = (d.stepCounts[wf.useCaseName] || 0) + 1;
        d.totalRefs++;
        if (sd.integrationAvailable != null) {
          // Use false if any node says false, otherwise true
          d.integAvail = d.integAvail === false ? false : sd.integrationAvailable;
        }
        if (sd.integrationType) d.integTypes.add(sd.integrationType);
        if (sd.dataType) d.dataTypes.add(sd.dataType);
      }
    }

    // Workflow-level dataTypes
    for (const dt of wf.dataTypes || []) {
      if (!dt) continue;
      if (!dataTypeUseCases.has(dt)) dataTypeUseCases.set(dt, new Set());
      dataTypeUseCases.get(dt)!.add(wf.useCaseName);
    }

    // Workflow-level integrations → also track as systems
    for (const ig of wf.integrations || []) {
      if (!ig) continue;
      if (!sysData.has(ig)) {
        sysData.set(ig, {
          useCases: new Set(),
          stepCounts: {},
          integAvail: null,
          integTypes: new Set(),
          dataTypes: new Set(),
          totalRefs: 0,
        });
      }
      const d = sysData.get(ig)!;
      d.useCases.add(wf.useCaseName);
      d.stepCounts[wf.useCaseName] = (d.stepCounts[wf.useCaseName] || 0) + 1;
      d.totalRefs++;
    }
  }

  // Build enriched systems sorted by total references
  const enrichedSystems: EnrichedSystemEntry[] = [...sysData.entries()]
    .map(([name, d]) => ({
      name,
      useCaseCount: d.useCases.size,
      useCases: [...d.useCases],
      useCaseStepCounts: d.stepCounts,
      integrationAvailable: d.integAvail,
      integrationTypes: [...d.integTypes],
      dataTypes: [...d.dataTypes],
      totalStepReferences: d.totalRefs,
    }))
    .sort((a, b) => b.totalStepReferences - a.totalStepReferences);

  // Build data type insights
  const validCategories = new Set(["structured", "semi_structured", "unstructured", "real_time"]);
  const dataTypeInsights: DataTypeInsight[] = [...dataTypeUseCases.entries()]
    .map(([type, ucs]) => ({
      type,
      count: ucs.size,
      useCases: [...ucs],
      category: (validCategories.has(type) ? type : "structured") as DataTypeInsight["category"],
    }))
    .sort((a, b) => b.count - a.count);

  // Build integration gaps: systems where integration is manual/none or unavailable
  const integrationGaps: IntegrationGap[] = enrichedSystems
    .filter((s) => {
      const hasGap =
        s.integrationAvailable === false ||
        s.integrationTypes.some((t) => t === "manual" || t === "none");
      return hasGap && s.useCaseCount > 0;
    })
    .map((s) => ({
      systemName: s.name,
      useCases: s.useCases,
      currentIntegrationType:
        s.integrationTypes.find((t) => t === "manual" || t === "none") ||
        (s.integrationAvailable === false ? "unavailable" : "unknown"),
      impactScore: s.useCaseCount * s.totalStepReferences,
    }))
    .sort((a, b) => b.impactScore - a.impactScore);

  // Build heat map matrix
  const topSystems = enrichedSystems.slice(0, 15);
  const heatMapMatrix = {
    systems: topSystems.map((s) => s.name),
    useCases: useCaseNames,
    cells: topSystems.map((sys) =>
      useCaseNames.map((uc) => sys.useCaseStepCounts[uc] || 0),
    ),
  };

  // Generate actionable insights
  const insights: SystemsInsight[] = [];

  // Most-used system
  if (enrichedSystems.length > 0) {
    const top = enrichedSystems[0];
    insights.push({
      type: "most_used_system",
      severity: "high",
      title: `${top.name} is the most critical integration point`,
      description: `Referenced in ${top.totalStepReferences} workflow steps across ${top.useCaseCount} use case${top.useCaseCount !== 1 ? "s" : ""}. Ensuring robust API connectivity and uptime for this system should be a top priority.`,
      relatedEntity: top.name,
    });
  }

  // Top integration gap
  if (integrationGaps.length > 0) {
    const gap = integrationGaps[0];
    insights.push({
      type: "integration_gap",
      severity: "high",
      title: `${gap.systemName} lacks API integration`,
      description: `Currently using ${gap.currentIntegrationType} integration across ${gap.useCases.length} use case${gap.useCases.length !== 1 ? "s" : ""}. Building an API connector would eliminate manual data transfer and reduce error rates.`,
      relatedEntity: gap.systemName,
    });
  }

  // Vectorization needed for unstructured data
  const unstructured = dataTypeInsights.find((d) => d.category === "unstructured");
  if (unstructured) {
    insights.push({
      type: "vectorization_needed",
      severity: "medium",
      title: "Unstructured data requires vectorization",
      description: `Unstructured data (documents, images, audio) appears in ${unstructured.count} use case${unstructured.count !== 1 ? "s" : ""}. These will need embedding pipelines for AI retrieval and processing.`,
      relatedEntity: "Unstructured",
    });
  }

  // High-demand data type
  if (dataTypeInsights.length > 0) {
    const top = dataTypeInsights[0];
    const label = top.type.replace(/_/g, " ");
    insights.push({
      type: "high_demand_data",
      severity: "medium",
      title: `${label.charAt(0).toUpperCase() + label.slice(1)} data has the highest demand`,
      description: `Consumed by ${top.count} use case${top.count !== 1 ? "s" : ""}. Plan for caching and rehydration strategies to handle concurrent access across workflows.`,
      relatedEntity: top.type,
    });
  }

  // Additional integration gaps (if more than one)
  if (integrationGaps.length > 1) {
    insights.push({
      type: "integration_gap",
      severity: "low",
      title: `${integrationGaps.length} systems need integration upgrades`,
      description: `${integrationGaps.map((g) => g.systemName).join(", ")} are currently using manual or no integrations. Prioritize by impact score to build an integration roadmap.`,
      relatedEntity: `${integrationGaps.length} systems`,
    });
  }

  return {
    enrichedSystems,
    dataTypeInsights,
    integrationGaps,
    insights,
    heatMapMatrix,
    ...base,
  };
}
