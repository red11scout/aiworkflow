import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import type { InteractiveWorkflowNode } from "../../../../shared/types";

function DecisionGateNode({ data }: NodeProps) {
  const node = data as unknown as InteractiveWorkflowNode;

  return (
    <div className="relative flex flex-col items-center">
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />

      {/* Diamond shape */}
      <div className="relative h-36 w-36">
        <div className="absolute inset-0 rotate-45 rounded-xl border-2 border-amber-400 bg-amber-50 shadow-sm dark:border-amber-600 dark:bg-amber-950" />

        {/* Content (un-rotated) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div className="mb-1 flex h-6 w-6 items-center justify-center rounded-md bg-amber-400 dark:bg-amber-600">
            <GitBranch className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="mb-0.5 rounded bg-amber-200 px-1 py-px text-[9px] font-bold uppercase text-amber-800 dark:bg-amber-800 dark:text-amber-200">
            Decision
          </span>
          <p className="max-w-[100px] text-center text-[10px] font-semibold leading-tight text-amber-900 dark:text-amber-100">
            {node.name}
          </p>
        </div>
      </div>

      {/* Branch outputs: left and right */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="left"
        className="!bg-amber-500"
        style={{ left: "25%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="right"
        className="!bg-amber-500"
        style={{ left: "75%" }}
      />
    </div>
  );
}

export default memo(DecisionGateNode);
