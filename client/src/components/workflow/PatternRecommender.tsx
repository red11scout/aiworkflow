import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Zap, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { AGENTIC_PATTERNS, type AgenticPattern } from "@shared/patterns";

interface PatternRecommenderProps {
  currentPatternId: string;
  onPatternChange?: (patternId: string) => void;
  readonly?: boolean;
}

const complexityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  very_high: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

const categoryLabels: Record<string, string> = {
  core: "Core Pattern",
  single_agent: "Single Agent",
  multi_agent: "Multi-Agent",
};

export function PatternRecommender({ currentPatternId, onPatternChange, readonly = false }: PatternRecommenderProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);

  const currentPattern = AGENTIC_PATTERNS.find((p) => p.id === currentPatternId);

  if (!currentPattern) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          No agentic pattern assigned
        </CardContent>
      </Card>
    );
  }

  const alternatives = AGENTIC_PATTERNS.filter(
    (p) => p.id !== currentPatternId && p.category === currentPattern.category,
  );

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              {currentPattern.name}
            </CardTitle>
            <div className="flex gap-1.5">
              <Badge variant="outline" className={complexityColors[currentPattern.complexity]}>
                {currentPattern.complexity.replace("_", " ")}
              </Badge>
              <Badge variant="outline">
                {categoryLabels[currentPattern.category] || currentPattern.category}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">{currentPattern.description}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Strengths
              </p>
              <ul className="space-y-0.5">
                {currentPattern.tradeoffs.pros.map((pro) => (
                  <li key={pro} className="text-[11px] text-muted-foreground">+ {pro}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Tradeoffs
              </p>
              <ul className="space-y-0.5">
                {currentPattern.tradeoffs.cons.map((con) => (
                  <li key={con} className="text-[11px] text-muted-foreground">- {con}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold">When to use</p>
            <div className="flex flex-wrap gap-1">
              {currentPattern.whenToUse.map((use) => (
                <span key={use} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{use}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold">Primitives</p>
            <div className="flex gap-1">
              {currentPattern.primitives.map((p) => (
                <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {!readonly && alternatives.length > 0 && (
        <Collapsible open={showAlternatives} onOpenChange={setShowAlternatives}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-xs">
              {showAlternatives ? (
                <>Hide alternatives <ChevronUp className="ml-1 h-3 w-3" /></>
              ) : (
                <>Explore {alternatives.length} alternative patterns <ChevronDown className="ml-1 h-3 w-3" /></>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2">
            {alternatives.map((alt) => (
              <Card key={alt.id} className="border-dashed">
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{alt.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${complexityColors[alt.complexity]}`}>
                        {alt.complexity.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{alt.description}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-3 text-xs"
                    onClick={() => onPatternChange?.(alt.id)}
                  >
                    Switch
                  </Button>
                </CardContent>
              </Card>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
