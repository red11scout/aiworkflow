import { useMemo, useState } from "react";
import {
  Server,
  Database,
  Cable,
  AlertTriangle,
  Lightbulb,
  Info,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { EnrichedSystemsSummary, SystemsInsight } from "@/lib/workflow-metrics";

// ─── Design Tokens ──────────────────────────────────────────────────────────
const T = {
  navy: "#001278",
  lightBlue: "#02a2fd",
  green: "#36bf78",
};

// ─── Heat intensity colors (5 levels) ───────────────────────────────────────
function heatColor(value: number): string {
  if (value === 0) return "bg-slate-50 text-slate-300";
  if (value === 1) return "bg-blue-100 text-blue-700";
  if (value <= 3) return "bg-blue-300 text-blue-900";
  if (value <= 5) return "bg-blue-500 text-white";
  return "bg-[#001278] text-white";
}

// ─── Integration type color ─────────────────────────────────────────────────
function integrationColor(type: string): string {
  switch (type) {
    case "api":
      return "bg-emerald-100 text-emerald-800";
    case "database":
      return "bg-blue-100 text-blue-800";
    case "webhook":
      return "bg-cyan-100 text-cyan-800";
    case "file":
      return "bg-amber-100 text-amber-800";
    case "manual":
      return "bg-red-100 text-red-800";
    case "none":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

// ─── Data type label ────────────────────────────────────────────────────────
function dataTypeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Insight severity styling ───────────────────────────────────────────────
function insightStyle(severity: SystemsInsight["severity"]) {
  switch (severity) {
    case "high":
      return {
        border: "border-l-red-500",
        bg: "bg-red-50",
        icon: <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />,
      };
    case "medium":
      return {
        border: "border-l-amber-500",
        bg: "bg-amber-50",
        icon: <Info className="h-4 w-4 text-amber-500 shrink-0" />,
      };
    case "low":
      return {
        border: "border-l-blue-500",
        bg: "bg-blue-50",
        icon: <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />,
      };
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  summary: EnrichedSystemsSummary;
  variant: "dashboard" | "report";
}

export function SystemsHeatMap({ summary, variant }: Props) {
  const [showAllSystems, setShowAllSystems] = useState(false);
  const isReport = variant === "report";

  const {
    heatMapMatrix,
    enrichedSystems,
    integrationTypes,
    dataTypes,
    dataTypeInsights,
    integrationGaps,
    insights,
  } = summary;

  // Cap visible systems
  const visibleSystems = showAllSystems
    ? enrichedSystems
    : enrichedSystems.slice(0, 15);
  const hasMore = enrichedSystems.length > 15;

  // Max value for bar scaling
  const maxInteg = useMemo(
    () => Math.max(1, ...integrationTypes.map((t) => t.count)),
    [integrationTypes],
  );
  const maxDT = useMemo(
    () => Math.max(1, ...dataTypes.map((t) => t.count)),
    [dataTypes],
  );

  if (enrichedSystems.length === 0) return null;

  const cardClass = isReport
    ? "rounded-lg border border-slate-200 bg-white shadow-sm print:break-inside-avoid"
    : "rounded-lg border bg-card text-card-foreground shadow-sm";

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div>
        <h3 className={`text-lg font-semibold ${isReport ? "text-slate-800" : ""}`}>
          Systems, Data & Integrations
        </h3>
        <p className={`text-sm mt-1 ${isReport ? "text-slate-500" : "text-muted-foreground"}`}>
          Heat map and ranked analysis across use cases with actionable insights
        </p>
      </div>

      {/* A. Heat Map Grid */}
      {heatMapMatrix.useCases.length > 0 && heatMapMatrix.systems.length > 0 && (
        <div className={cardClass}>
          <div className="p-4 pb-2">
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-4 w-4" style={{ color: T.navy }} />
              <h4 className={`text-sm font-semibold ${isReport ? "text-slate-700" : ""}`}>
                System Usage Heat Map
              </h4>
              <span className={`text-xs ${isReport ? "text-slate-400" : "text-muted-foreground"}`}>
                (steps per use case)
              </span>
            </div>
          </div>
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2 pr-3 font-semibold text-slate-600 sticky left-0 bg-white z-10 min-w-[140px]">
                    System
                  </th>
                  {heatMapMatrix.useCases.map((uc) => (
                    <th
                      key={uc}
                      className="py-2 px-1 font-medium text-slate-500 text-center"
                      title={uc}
                    >
                      <div className="max-w-[100px] truncate mx-auto">
                        {uc}
                      </div>
                    </th>
                  ))}
                  <th className="py-2 px-2 font-semibold text-slate-600 text-center">
                    Total
                  </th>
                  <th className="py-2 px-2 font-semibold text-slate-600 text-center">
                    Integration
                  </th>
                </tr>
              </thead>
              <tbody>
                {heatMapMatrix.systems.map((sysName, sIdx) => {
                  const sys = enrichedSystems.find((s) => s.name === sysName);
                  return (
                    <tr key={sysName} className="border-t border-slate-100">
                      <td className="py-1.5 pr-3 font-medium text-slate-700 sticky left-0 bg-white z-10 truncate max-w-[160px]" title={sysName}>
                        <span className="text-xs font-semibold text-slate-400 mr-1.5">
                          {sIdx + 1}.
                        </span>
                        {sysName}
                      </td>
                      {heatMapMatrix.cells[sIdx].map((val, ucIdx) => (
                        <td key={ucIdx} className="py-1.5 px-1 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold ${heatColor(val)}`}
                          >
                            {val > 0 ? val : ""}
                          </span>
                        </td>
                      ))}
                      <td className="py-1.5 px-2 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                          {sys?.totalStepReferences || 0}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {sys?.integrationAvailable === true ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : sys?.integrationAvailable === false ? (
                          <XCircle className="h-4 w-4 text-red-400 mx-auto" />
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-400">Intensity:</span>
            {[
              { label: "0", cls: heatColor(0) },
              { label: "1", cls: heatColor(1) },
              { label: "2-3", cls: heatColor(2) },
              { label: "4-5", cls: heatColor(4) },
              { label: "6+", cls: heatColor(6) },
            ].map((l) => (
              <span key={l.label} className="flex items-center gap-1 text-xs">
                <span className={`inline-block w-4 h-4 rounded ${l.cls}`} />
                {l.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* B. Integration & Data Type Summary */}
      <div className={`grid gap-4 sm:grid-cols-2 ${isReport ? "" : ""}`}>
        {/* Integration Types */}
        <div className={cardClass}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cable className="h-4 w-4" style={{ color: T.lightBlue }} />
              <h4 className={`text-sm font-semibold ${isReport ? "text-slate-700" : ""}`}>
                Integration Types
              </h4>
            </div>
            {integrationTypes.length === 0 ? (
              <p className="text-xs text-slate-400">No integrations detected</p>
            ) : (
              <div className="space-y-2">
                {integrationTypes.map((it) => (
                  <div key={it.type} className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${integrationColor(it.type)}`}
                    >
                      {it.type}
                    </span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(it.count / maxInteg) * 100}%`,
                          backgroundColor:
                            it.type === "api"
                              ? T.green
                              : it.type === "manual" || it.type === "none"
                                ? "#ef4444"
                                : T.lightBlue,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 w-6 text-right">
                      {it.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {/* Integration gap callout */}
            {integrationGaps.length > 0 && (
              <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
                <strong>{integrationGaps.length}</strong> system
                {integrationGaps.length !== 1 ? "s" : ""} with manual/no
                integration:{" "}
                {integrationGaps
                  .slice(0, 3)
                  .map((g) => g.systemName)
                  .join(", ")}
                {integrationGaps.length > 3 &&
                  ` +${integrationGaps.length - 3} more`}
              </div>
            )}
          </div>
        </div>

        {/* Data Types */}
        <div className={cardClass}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4" style={{ color: T.green }} />
              <h4 className={`text-sm font-semibold ${isReport ? "text-slate-700" : ""}`}>
                Data Types
              </h4>
            </div>
            {dataTypes.length === 0 ? (
              <p className="text-xs text-slate-400">No data types detected</p>
            ) : (
              <div className="space-y-2">
                {dataTypes.map((dt) => {
                  const insight = dataTypeInsights.find(
                    (d) => d.type === dt.type,
                  );
                  const isUnstructured = insight?.category === "unstructured";
                  return (
                    <div key={dt.type}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-700 capitalize min-w-[90px]">
                          {dataTypeLabel(dt.type)}
                        </span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(dt.count / maxDT) * 100}%`,
                              backgroundColor: isUnstructured
                                ? "#f59e0b"
                                : T.green,
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600 w-6 text-right">
                          {dt.count}
                        </span>
                      </div>
                      {isUnstructured && (
                        <p className="text-xs text-amber-600 ml-[98px] mt-0.5">
                          Requires vectorization for AI retrieval
                        </p>
                      )}
                      {insight && insight.useCases.length > 0 && (
                        <p className="text-xs text-slate-400 ml-[98px] mt-0.5">
                          Used by: {insight.useCases.slice(0, 3).join(", ")}
                          {insight.useCases.length > 3 &&
                            ` +${insight.useCases.length - 3} more`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* C. Actionable Insights */}
      {insights.length > 0 && (
        <div className={cardClass}>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4" style={{ color: T.lightBlue }} />
              <h4 className={`text-sm font-semibold ${isReport ? "text-slate-700" : ""}`}>
                Actionable Insights
              </h4>
            </div>
            <div className="space-y-2">
              {insights.map((ins, idx) => {
                const style = insightStyle(ins.severity);
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 rounded-md border-l-4 ${style.border} ${style.bg} px-4 py-3 print:break-inside-avoid`}
                  >
                    {style.icon}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {ins.title}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {ins.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/80 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {ins.relatedEntity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Show more systems toggle */}
      {hasMore && !isReport && (
        <button
          onClick={() => setShowAllSystems((p) => !p)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAllSystems ? (
            <>
              <ChevronDown className="h-3 w-3" /> Show fewer systems
            </>
          ) : (
            <>
              <ChevronRight className="h-3 w-3" /> Show all{" "}
              {enrichedSystems.length} systems
            </>
          )}
        </button>
      )}
    </div>
  );
}
