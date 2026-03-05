import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";

interface DataSourceNodeData {
  name: string;
  dataType?: "structured" | "semi_structured" | "unstructured" | "real_time";
  [key: string]: unknown;
}

const TYPE_LABELS: Record<string, string> = {
  structured: "Structured",
  semi_structured: "Semi-structured",
  unstructured: "Unstructured",
  real_time: "Real-time",
};

function DataSourceNode({ data }: NodeProps) {
  const node = data as unknown as DataSourceNodeData;
  const typeLabel = node.dataType ? TYPE_LABELS[node.dataType] : null;

  return (
    <div className="w-52 rounded-xl border border-blue-300 bg-blue-50 shadow-sm dark:border-blue-700 dark:bg-blue-950">
      <div className="p-3">
        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#02a2fd]">
            <Database className="h-4 w-4 text-white" />
          </div>
          <h3 className="truncate text-sm font-semibold text-blue-900 dark:text-blue-100">
            {node.name}
          </h3>
        </div>

        {/* Data type badge */}
        {typeLabel && (
          <span className="rounded-md bg-blue-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-800 dark:text-blue-200">
            {typeLabel}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-[#02a2fd]" />
    </div>
  );
}

export default memo(DataSourceNode);
