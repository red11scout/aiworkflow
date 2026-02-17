import { useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Brain,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  AGENTIC_PATTERNS,
  AI_PRIMITIVES,
  PATTERN_CATEGORIES,
  getPatternById,
  type AgenticPattern,
} from "@shared/patterns";

// --- Types ---

interface UseCase {
  id: string;
  name: string;
  description: string;
  function: string;
  subFunction: string;
  aiPrimitives: string[];
  agenticPattern?: string;
  patternRationale?: string;
  hitlCheckpoint: string;
  targetFrictionId: string;
  strategicThemeId: string;
  desiredOutcomes?: string[];
  dataTypes?: string[];
  integrations?: string[];
}

// --- Helpers ---

function getComplexityColor(complexity: string) {
  switch (complexity) {
    case "low":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "medium":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "high":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "very_high":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatComplexity(complexity: string) {
  return complexity.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateUseCaseId(existingCases: UseCase[]): string {
  const maxNum = existingCases.reduce((max, uc) => {
    const match = uc.id.match(/UC-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `UC-${String(maxNum + 1).padStart(2, "0")}`;
}

// --- Tag Input Component ---

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (!tags.includes(inputValue.trim())) {
        onChange([...tags, inputValue.trim()]);
      }
      setInputValue("");
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <Badge key={i} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="text-sm"
      />
    </div>
  );
}

// --- Grouped Pattern Selector ---

function PatternSelector({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (patternId: string) => void;
}) {
  const categories = Object.entries(PATTERN_CATEGORIES) as [
    AgenticPattern["category"],
    string,
  ][];

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <option value="">Select a pattern...</option>
      {categories.map(([catKey, catLabel]) => (
        <optgroup key={catKey} label={catLabel}>
          {AGENTIC_PATTERNS.filter((p) => p.category === catKey).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

// --- Use Case Card ---

function UseCaseCard({
  useCase,
  index,
  frictionPoints,
  strategicThemes,
  onUpdate,
  onDelete,
}: {
  useCase: UseCase;
  index: number;
  frictionPoints: any[];
  strategicThemes: any[];
  onUpdate: (updated: UseCase) => void;
  onDelete: () => void;
}) {
  const selectedPattern = useCase.agenticPattern
    ? getPatternById(useCase.agenticPattern)
    : undefined;

  const updateField = <K extends keyof UseCase>(field: K, value: UseCase[K]) => {
    onUpdate({ ...useCase, [field]: value });
  };

  const togglePrimitive = (primitive: string) => {
    const current = useCase.aiPrimitives || [];
    const updated = current.includes(primitive)
      ? current.filter((p) => p !== primitive)
      : [...current, primitive];
    updateField("aiPrimitives", updated);
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
            >
              {useCase.id}
            </div>
            <div className="flex-1">
              <Input
                value={useCase.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="font-semibold text-base border-none shadow-none px-0 h-auto focus-visible:ring-0"
                placeholder="Use case name"
              />
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {useCase.function || "No function"}
                </Badge>
                {useCase.subFunction && (
                  <Badge variant="secondary" className="text-xs">
                    {useCase.subFunction}
                  </Badge>
                )}
                {selectedPattern && (
                  <Badge
                    className={`text-xs ${getComplexityColor(selectedPattern.complexity)}`}
                  >
                    {formatComplexity(selectedPattern.complexity)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Description */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Description</Label>
          <Textarea
            value={useCase.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe the use case..."
            rows={3}
          />
        </div>

        {/* Function & Sub-Function */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Function</Label>
            <Input
              value={useCase.function}
              onChange={(e) => updateField("function", e.target.value)}
              placeholder="e.g. Finance, Operations"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Sub-Function</Label>
            <Input
              value={useCase.subFunction}
              onChange={(e) => updateField("subFunction", e.target.value)}
              placeholder="e.g. Accounts Payable"
            />
          </div>
        </div>

        {/* AI Primitives */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">AI Primitives</Label>
          <div className="flex flex-wrap gap-2">
            {AI_PRIMITIVES.map((primitive) => {
              const isSelected = (useCase.aiPrimitives || []).includes(primitive);
              return (
                <button
                  key={primitive}
                  type="button"
                  onClick={() => togglePrimitive(primitive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? "border-[#02a2fd] bg-[#02a2fd]/10 text-[#02a2fd]"
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  {primitive}
                </button>
              );
            })}
          </div>
        </div>

        {/* Agentic Design Pattern */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Agentic Design Pattern
          </Label>
          <PatternSelector
            value={useCase.agenticPattern}
            onChange={(patternId) => updateField("agenticPattern", patternId)}
          />
          {selectedPattern && (
            <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>{selectedPattern.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs font-medium">Recommended primitives:</span>
                {selectedPattern.primitives.map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-1.5 mt-2">
            <Label className="text-xs text-muted-foreground">
              Pattern Rationale
            </Label>
            <Input
              value={useCase.patternRationale || ""}
              onChange={(e) => updateField("patternRationale", e.target.value)}
              placeholder="Why this pattern fits this use case..."
            />
          </div>
        </div>

        {/* HITL Checkpoint */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Human-in-the-Loop Checkpoint
          </Label>
          <Input
            value={useCase.hitlCheckpoint}
            onChange={(e) => updateField("hitlCheckpoint", e.target.value)}
            placeholder="e.g. Manager approval before invoice processing"
          />
        </div>

        {/* Target Friction & Strategic Theme */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Target Friction Point
            </Label>
            <select
              value={useCase.targetFrictionId || ""}
              onChange={(e) => updateField("targetFrictionId", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select friction point...</option>
              {frictionPoints.map((fp: any) => (
                <option key={fp.id} value={fp.id}>
                  {fp.id}: {fp.name || fp.description?.slice(0, 50)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Strategic Theme
            </Label>
            <select
              value={useCase.strategicThemeId || ""}
              onChange={(e) => updateField("strategicThemeId", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select theme...</option>
              {strategicThemes.map((theme: any) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name || theme.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desired Outcomes */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Desired Outcomes
          </Label>
          <TagInput
            tags={useCase.desiredOutcomes || []}
            onChange={(tags) => updateField("desiredOutcomes", tags)}
            placeholder="Type an outcome and press Enter..."
          />
        </div>

        {/* Data Types & Integrations */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Data Types</Label>
            <TagInput
              tags={useCase.dataTypes || []}
              onChange={(tags) => updateField("dataTypes", tags)}
              placeholder="e.g. invoice data, CRM records..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Integrations</Label>
            <TagInput
              tags={useCase.integrations || []}
              onChange={(tags) => updateField("integrations", tags)}
              placeholder="e.g. SAP, Salesforce..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export default function UseCases() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);

  const useCases: UseCase[] = activeScenario?.useCases || [];
  const frictionPoints: any[] = activeScenario?.frictionPoints || [];
  const strategicThemes: any[] = activeScenario?.strategicThemes || [];

  const saveMutation = useMutation({
    mutationFn: async (updatedUseCases: UseCase[]) => {
      const res = await apiRequest("PUT", `/api/scenarios/${activeScenario.id}`, {
        useCases: updatedUseCases,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  const updateUseCase = useCallback(
    (index: number, updated: UseCase) => {
      const newUseCases = [...useCases];
      newUseCases[index] = updated;
      saveMutation.mutate(newUseCases);
    },
    [useCases, saveMutation],
  );

  const addUseCase = useCallback(() => {
    const newUseCase: UseCase = {
      id: generateUseCaseId(useCases),
      name: "",
      description: "",
      function: "",
      subFunction: "",
      aiPrimitives: [],
      agenticPattern: undefined,
      patternRationale: "",
      hitlCheckpoint: "",
      targetFrictionId: "",
      strategicThemeId: "",
      desiredOutcomes: [],
      dataTypes: [],
      integrations: [],
    };
    saveMutation.mutate([...useCases, newUseCase]);
  }, [useCases, saveMutation]);

  const deleteUseCase = useCallback(
    (index: number) => {
      const newUseCases = useCases.filter((_, i) => i !== index);
      saveMutation.mutate(newUseCases);
    },
    [useCases, saveMutation],
  );

  const markComplete = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/scenarios/${activeScenario.id}/complete-step`,
        { step: 4, section: "use_cases" },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  const handleNext = () => {
    markComplete.mutate();
    navigate(`/project/${id}/benefits`);
  };

  return (
    <Layout
      projectId={id}
      companyName={(project as any)?.companyName}
      completedSteps={activeScenario?.completedSteps}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="w-6 h-6" style={{ color: "#02a2fd" }} />
            AI Use Cases
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define and configure AI-powered use cases with agentic design
            patterns, primitives, and human-in-the-loop checkpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {useCases.length} use case{useCases.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Use Case Cards */}
      {useCases.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
            >
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No use cases yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Add your first AI use case to define agentic patterns, HITL
              checkpoints, and link to friction points and strategic themes.
            </p>
            <Button onClick={addUseCase} className="mt-2">
              <Plus className="w-4 h-4 mr-2" />
              Add Use Case
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {useCases.map((uc, index) => (
            <UseCaseCard
              key={uc.id}
              useCase={uc}
              index={index}
              frictionPoints={frictionPoints}
              strategicThemes={strategicThemes}
              onUpdate={(updated) => updateUseCase(index, updated)}
              onDelete={() => deleteUseCase(index)}
            />
          ))}
        </div>
      )}

      {/* Add Use Case Button */}
      {useCases.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={addUseCase} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Use Case
          </Button>
        </div>
      )}

      {/* Saving indicator */}
      {saveMutation.isPending && (
        <div className="fixed bottom-20 right-6 bg-card border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="w-4 h-4 animate-pulse" style={{ color: "#02a2fd" }} />
          Saving...
        </div>
      )}

      {saveMutation.isError && (
        <div className="fixed bottom-20 right-6 bg-destructive/10 border border-destructive/30 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          Failed to save. Please try again.
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={() => navigate(`/project/${id}/friction`)}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Friction Mapping
        </Button>
        <Button
          onClick={handleNext}
          className="gap-2"
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          disabled={markComplete.isPending}
        >
          Benefits
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Layout>
  );
}
