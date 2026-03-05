import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Shield } from "lucide-react";
import type { HITLCheckpoint, EpochCategory } from "../../../../shared/types";

const EPOCH_COLORS: Record<EpochCategory, string> = {
  ethical: "#8B5CF6",
  political: "#EF4444",
  operational: "#F59E0B",
  creative: "#06B6D4",
  human: "#36bf78",
};

const EPOCH_LETTERS: Record<EpochCategory, string> = {
  ethical: "E",
  political: "P",
  operational: "O",
  creative: "C",
  human: "H",
};

const EPOCH_BG: Record<EpochCategory, string> = {
  ethical: "bg-violet-50 dark:bg-violet-950 border-violet-300 dark:border-violet-700",
  political: "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700",
  operational: "bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700",
  creative: "bg-cyan-50 dark:bg-cyan-950 border-cyan-300 dark:border-cyan-700",
  human: "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700",
};

interface HITLCheckpointNodeData extends HITLCheckpoint {
  name?: string;
  [key: string]: unknown;
}

function HITLCheckpointNode({ data }: NodeProps) {
  const node = data as unknown as HITLCheckpointNodeData;
  const category = node.epochCategory ?? "operational";
  const color = EPOCH_COLORS[category];
  const letter = EPOCH_LETTERS[category];
  const bgClass = EPOCH_BG[category];

  return (
    <div className={`w-60 rounded-xl border shadow-sm ${bgClass}`}>
      <Handle type="target" position={Position.Top} style={{ background: color }} />

      <div className="p-3">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: color }}
          >
            <Shield className="h-4 w-4 text-white" />
          </div>
          <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {node.name ?? node.description}
          </h3>
        </div>

        {/* Badges row */}
        <div className="mb-2 flex flex-wrap gap-1">
          {/* EPOCH letter badge */}
          <span
            className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {letter}
          </span>

          {/* Required / Optional */}
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
              node.isRequired
                ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
            }`}
          >
            {node.isRequired ? "Required" : "Optional"}
          </span>

          {/* Approver role */}
          {node.approverRole && (
            <span className="rounded-md bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
              {node.approverRole}
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

      <Handle type="source" position={Position.Bottom} style={{ background: color }} />
    </div>
  );
}

export default memo(HITLCheckpointNode);
