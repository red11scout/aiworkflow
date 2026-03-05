import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Sparkles } from "lucide-react";
import type { InteractiveWorkflowNode } from "../../../../shared/types";

const AUTOMATION_LEVELS: Record<string, { label: string; pct: number }> = {
  full: { label: "Full", pct: 100 },
  assisted: { label: "Assisted", pct: 75 },
  supervised: { label: "Supervised", pct: 50 },
  manual: { label: "Manual", pct: 0 },
};

function AITaskNode({ data }: NodeProps) {
  const node = data as unknown as InteractiveWorkflowNode;
  const level = AUTOMATION_LEVELS[node.automationLevel] ?? AUTOMATION_LEVELS.assisted;

  return (
    <div className="relative w-64 rounded-xl border border-emerald-300 bg-emerald-50 shadow-sm dark:border-emerald-700 dark:bg-emerald-950">
      <Handle type="target" position={Position.Top} className="!bg-[#36bf78]" />

      <div className="p-3">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#36bf78]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h3 className="truncate text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            {node.name}
          </h3>
        </div>

        {/* AI badge */}
        <div className="mb-2 flex items-center gap-1">
          <span className="rounded-md bg-[#36bf78] px-1.5 py-0.5 text-[10px] font-bold text-white">
            AI-Powered
          </span>
          <span className="rounded-md bg-emerald-200 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200">
            {level.label}
          </span>
        </div>

        {/* Automation level bar */}
        <div className="mb-2">
          <div className="h-1.5 w-full rounded-full bg-emerald-200 dark:bg-emerald-800">
            <div
              className="h-1.5 rounded-full bg-[#36bf78] transition-all"
              style={{ width: `${level.pct}%` }}
            />
          </div>
        </div>

        {/* AI capabilities */}
        {node.aiCapabilities && node.aiCapabilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {node.aiCapabilities.slice(0, 3).map((cap) => (
              <span
                key={cap}
                className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              >
                {cap}
              </span>
            ))}
            {node.aiCapabilities.length > 3 && (
              <span className="text-[10px] text-emerald-500">
                +{node.aiCapabilities.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[#36bf78]" />
    </div>
  );
}

export default memo(AITaskNode);
