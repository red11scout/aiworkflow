import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { User, AlertTriangle } from "lucide-react";
import type { InteractiveWorkflowNode } from "../../../../shared/types";

const FRICTION_LABELS: Record<string, string> = {
  process: "Process",
  data: "Data",
  technology: "Tech",
  knowledge: "Knowledge",
};

function HumanTaskNode({ data }: NodeProps) {
  const node = data as unknown as InteractiveWorkflowNode;

  return (
    <div className="relative w-64 rounded-xl border border-zinc-300 bg-zinc-100 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <Handle type="target" position={Position.Top} className="!bg-zinc-500" />

      {/* Bottleneck indicator */}
      {node.isBottleneck && (
        <div className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
          <AlertTriangle className="h-3 w-3 text-white" />
        </div>
      )}

      {/* Friction badge */}
      {node.frictionType && (
        <div className="absolute -top-2 -left-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-medium text-white">
          {FRICTION_LABELS[node.frictionType]}
        </div>
      )}

      <div className="p-3">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-300 dark:bg-zinc-600">
            <User className="h-4 w-4 text-zinc-700 dark:text-zinc-200" />
          </div>
          <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {node.name}
          </h3>
        </div>

        {/* Badges */}
        <div className="mb-2 flex flex-wrap gap-1">
          {node.actorName && (
            <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
              {node.actorName}
            </span>
          )}
          {node.duration && (
            <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
              {node.duration}
            </span>
          )}
        </div>

        {/* Description */}
        {node.description && (
          <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
            {node.description}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-zinc-500" />
    </div>
  );
}

export default memo(HumanTaskNode);
