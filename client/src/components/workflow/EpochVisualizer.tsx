import { EPOCH_CATEGORIES } from "@shared/assumptions";
import type { EpochCategory } from "@shared/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Shield } from "lucide-react";

interface EpochVisualizerProps {
  value?: EpochCategory;
  onChange?: (category: EpochCategory) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export function EpochVisualizer({ value, onChange, readonly = false, size = "md" }: EpochVisualizerProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-10 w-10 text-base",
  };

  const labelSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {EPOCH_CATEGORIES.map((cat) => {
          const isActive = value === cat.id;
          return (
            <Tooltip key={cat.id}>
              <TooltipTrigger asChild>
                <button
                  disabled={readonly && !isActive}
                  onClick={() => !readonly && onChange?.(cat.id)}
                  className={`group flex flex-col items-center gap-0.5 transition-all ${
                    readonly && !isActive ? "cursor-default opacity-30" : "cursor-pointer"
                  }`}
                >
                  <div
                    className={`flex items-center justify-center rounded-full font-bold transition-all ${sizeClasses[size]} ${
                      isActive
                        ? "ring-2 ring-offset-2 shadow-lg scale-110"
                        : readonly
                          ? ""
                          : "hover:scale-105 hover:shadow-md"
                    }`}
                    style={{
                      backgroundColor: isActive ? cat.color : `${cat.color}20`,
                      color: isActive ? "white" : cat.color,
                      "--tw-ring-color": isActive ? cat.color : undefined,
                    } as React.CSSProperties}
                  >
                    {cat.letter}
                  </div>
                  <span className={`font-medium ${labelSizes[size]} ${isActive ? "opacity-100" : "opacity-60"}`}>
                    {cat.label}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-3.5 w-3.5" style={{ color: cat.color }} />
                  <span className="font-semibold">{cat.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {cat.examples.map((ex) => (
                    <span
                      key={ex}
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

/** Inline EPOCH badge for use in node headers */
export function EpochBadge({ category, size = "sm" }: { category: EpochCategory; size?: "sm" | "md" }) {
  const cat = EPOCH_CATEGORIES.find((c) => c.id === category);
  if (!cat) return null;

  const dim = size === "sm" ? "h-5 w-5 text-[10px]" : "h-6 w-6 text-xs";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center justify-center rounded-full font-bold ${dim}`}
            style={{ backgroundColor: cat.color, color: "white" }}
          >
            {cat.letter}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-medium">{cat.label}</span>: {cat.description}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
