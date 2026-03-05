import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { FileOutput } from "lucide-react";

interface OutputNodeData {
  name: string;
  format?: string;
  [key: string]: unknown;
}

function OutputNode({ data }: NodeProps) {
  const node = data as unknown as OutputNodeData;

  return (
    <div className="w-52 rounded-xl border border-indigo-300 bg-[#001278]/5 shadow-sm dark:border-indigo-700 dark:bg-[#001278]/40">
      <Handle type="target" position={Position.Top} className="!bg-[#001278]" />

      <div className="p-3">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#001278]">
            <FileOutput className="h-4 w-4 text-white" />
          </div>
          <h3 className="truncate text-sm font-semibold text-indigo-900 dark:text-indigo-100">
            {node.name}
          </h3>
        </div>

        {/* Format badge */}
        {node.format && (
          <span className="rounded-md bg-indigo-200 px-1.5 py-0.5 text-[10px] font-medium text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200">
            {node.format}
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(OutputNode);
