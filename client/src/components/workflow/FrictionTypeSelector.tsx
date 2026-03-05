import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RotateCcw, Database, Cpu, BookOpen } from "lucide-react";

const FRICTION_TYPES = [
  {
    id: "process" as const,
    label: "Process",
    icon: RotateCcw,
    color: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    activeColor: "bg-red-500 text-white border-red-600",
    description: "Manual steps, handoffs, redundant workflows",
    examples: ["Duplicate data entry", "Multi-approval bottlenecks", "Paper-based handoffs", "Redundant review cycles"],
  },
  {
    id: "data" as const,
    label: "Data",
    icon: Database,
    color: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
    activeColor: "bg-orange-500 text-white border-orange-600",
    description: "Quality issues, silos, availability gaps",
    examples: ["Inconsistent data formats", "Siloed databases", "Missing data fields", "Stale cache data"],
  },
  {
    id: "technology" as const,
    label: "Technology",
    icon: Cpu,
    color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
    activeColor: "bg-blue-500 text-white border-blue-600",
    description: "Legacy systems, integration failures",
    examples: ["Legacy system constraints", "API incompatibilities", "Missing integrations", "Performance bottlenecks"],
  },
  {
    id: "knowledge" as const,
    label: "Knowledge",
    icon: BookOpen,
    color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
    activeColor: "bg-purple-500 text-white border-purple-600",
    description: "Expertise gaps, institutional memory loss",
    examples: ["Tribal knowledge dependency", "Training gaps", "Undocumented processes", "Expert retirement risk"],
  },
] as const;

type FrictionType = "process" | "data" | "technology" | "knowledge";

interface FrictionTypeSelectorProps {
  value?: FrictionType;
  onChange: (type: FrictionType) => void;
  compact?: boolean;
}

export function FrictionTypeSelector({ value, onChange, compact = false }: FrictionTypeSelectorProps) {
  if (compact) {
    return (
      <div className="flex gap-1.5">
        <TooltipProvider>
          {FRICTION_TYPES.map((ft) => {
            const Icon = ft.icon;
            const isActive = value === ft.id;
            return (
              <Tooltip key={ft.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onChange(ft.id)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${isActive ? ft.activeColor : ft.color} hover:opacity-80`}
                  >
                    <Icon className="h-3 w-3" />
                    {ft.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="font-medium">{ft.description}</p>
                  <ul className="mt-1 text-xs opacity-80">
                    {ft.examples.slice(0, 2).map((ex) => (
                      <li key={ex}>• {ex}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {FRICTION_TYPES.map((ft) => {
        const Icon = ft.icon;
        const isActive = value === ft.id;
        return (
          <button
            key={ft.id}
            onClick={() => onChange(ft.id)}
            className={`flex flex-col items-start gap-2 rounded-lg border-2 p-3 text-left transition-all ${
              isActive
                ? `${ft.activeColor} shadow-md`
                : `${ft.color} hover:shadow-sm`
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span className="text-sm font-semibold">{ft.label}</span>
            </div>
            <p className="text-xs opacity-80">{ft.description}</p>
            <div className="flex flex-wrap gap-1">
              {ft.examples.map((ex) => (
                <span key={ex} className="rounded bg-black/10 px-1.5 py-0.5 text-[10px] dark:bg-white/10">
                  {ex}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export { FRICTION_TYPES };
export type { FrictionType };
