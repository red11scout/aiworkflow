import { useState, useCallback, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronDown,
  X,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Pencil,
} from "lucide-react";
import {
  AGENTIC_PATTERNS,
  AI_PRIMITIVES,
  PATTERN_CATEGORIES,
  getPatternById,
  type AgenticPattern,
} from "@shared/patterns";
import { DATA_TYPES } from "@shared/assumptions";

// --- Types (matches shared/types.ts UseCase) ---

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
  targetFriction: string;
  strategicTheme: string;
  desiredOutcomes?: string[];
  dataTypes?: string[];
  integrations?: string[];
}

// --- Helpers ---

function generateUseCaseId(existingCases: UseCase[]): string {
  const maxNum = existingCases.reduce((max, uc) => {
    const match = uc.id.match(/UC-(\d+)/);
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `UC-${String(maxNum + 1).padStart(2, "0")}`;
}

function getPatternColor(patternId: string | undefined): string {
  if (!patternId) return "bg-muted text-muted-foreground";
  const pattern = getPatternById(patternId);
  if (!pattern) return "bg-muted text-muted-foreground";
  switch (pattern.complexity) {
    case "low":
      return "bg-green-600 text-white";
    case "medium":
      return "bg-[#02a2fd] text-white";
    case "high":
      return "bg-indigo-600 text-white";
    case "very_high":
      return "bg-purple-600 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
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

// --- Use Case Card (Cogno-Research-Inspired Layout) ---

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
  const [editing, setEditing] = useState(false);

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
    <Card className="relative overflow-hidden">
      {/* ---- Header Row: ID + Name + Tags ---- */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-xs font-mono text-muted-foreground mt-1 shrink-0">
              {useCase.id}
            </span>
            <div className="flex-1 min-w-0">
              {editing ? (
                <Input
                  value={useCase.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="font-semibold text-lg border-none shadow-none px-0 h-auto focus-visible:ring-0"
                  placeholder="Use case name"
                  autoFocus
                  onBlur={() => setEditing(false)}
                />
              ) : (
                <h3
                  className="font-semibold text-lg text-foreground cursor-pointer hover:text-[#02a2fd] transition-colors"
                  onClick={() => setEditing(true)}
                >
                  {useCase.name || "Untitled Use Case"}
                </h3>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {selectedPattern && (
              <Badge className={`text-xs ${getPatternColor(useCase.agenticPattern)}`}>
                {selectedPattern.name}
              </Badge>
            )}
            {useCase.function && (
              <Badge variant="secondary" className="text-xs">
                {useCase.function}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing(!editing)}
              className="text-muted-foreground hover:text-foreground h-8 w-8"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-muted-foreground hover:text-destructive h-8 w-8"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="space-y-4 pt-0">
        {/* ---- Description ---- */}
        {editing ? (
          <Textarea
            value={useCase.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Describe the use case..."
            rows={3}
          />
        ) : useCase.description ? (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {useCase.description}
          </p>
        ) : null}

        {/* ---- Target Friction ---- */}
        {editing ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Target Friction Point</Label>
            <select
              value={useCase.targetFriction || ""}
              onChange={(e) => updateField("targetFriction", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">Select friction point...</option>
              {frictionPoints.map((fp: any) => (
                <option key={fp.id} value={fp.frictionPoint}>
                  {fp.id}: {(fp.frictionPoint || "").slice(0, 80)}
                </option>
              ))}
            </select>
          </div>
        ) : useCase.targetFriction ? (
          <div className="text-sm">
            <span className="font-medium text-[#02a2fd]">Target Friction: </span>
            <span className="text-muted-foreground">{useCase.targetFriction}</span>
          </div>
        ) : null}

        {/* ---- AI Primitives ---- */}
        <div className="flex flex-wrap gap-2">
          {(useCase.aiPrimitives || []).map((primitive) => (
            <span
              key={primitive}
              onClick={() => editing && togglePrimitive(primitive)}
              className={`px-3 py-1 rounded-md text-xs font-medium border border-[#02a2fd]/30 bg-[#02a2fd]/5 text-[#02a2fd] ${
                editing ? "cursor-pointer hover:bg-[#02a2fd]/15" : ""
              }`}
            >
              {primitive}
            </span>
          ))}
          {editing &&
            AI_PRIMITIVES.filter((p) => !(useCase.aiPrimitives || []).includes(p)).map(
              (primitive) => (
                <button
                  key={primitive}
                  type="button"
                  onClick={() => togglePrimitive(primitive)}
                  className="px-3 py-1 rounded-md text-xs font-medium border border-border bg-background text-muted-foreground hover:border-muted-foreground/50 transition-all"
                >
                  {primitive}
                </button>
              ),
            )}
        </div>

        {/* ---- Agentic Pattern Analysis Sub-Card ---- */}
        <div className="rounded-lg bg-muted/40 dark:bg-muted/20 p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Agentic Pattern Analysis
          </div>
          <div className="flex items-start gap-8">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Primary Pattern
              </div>
              {editing ? (
                <PatternSelector
                  value={useCase.agenticPattern}
                  onChange={(patternId) => updateField("agenticPattern", patternId)}
                />
              ) : selectedPattern ? (
                <Badge className={`text-xs ${getPatternColor(useCase.agenticPattern)}`}>
                  {selectedPattern.name}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground">Not selected</span>
              )}
            </div>
          </div>
          {editing ? (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Rationale
              </div>
              <Textarea
                value={useCase.patternRationale || ""}
                onChange={(e) => updateField("patternRationale", e.target.value)}
                placeholder="Why this pattern fits this use case..."
                rows={2}
                className="text-sm"
              />
            </div>
          ) : useCase.patternRationale ? (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Rationale
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {useCase.patternRationale}
              </p>
            </div>
          ) : null}
        </div>

        {/* ---- Edit-mode-only sections ---- */}
        {editing && (
          <div className="space-y-4 border-t border-border pt-4">
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

            {/* Strategic Theme */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Strategic Theme</Label>
              <select
                value={useCase.strategicTheme || ""}
                onChange={(e) => updateField("strategicTheme", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select theme...</option>
                {strategicThemes.map((theme: any) => (
                  <option key={theme.id} value={theme.name || theme.id}>
                    {theme.name || theme.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Desired Outcomes */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Desired Outcomes</Label>
              <TagInput
                tags={useCase.desiredOutcomes || []}
                onChange={(tags) => updateField("desiredOutcomes", tags)}
                placeholder="Type an outcome and press Enter..."
              />
            </div>

            {/* Data Types & Integrations */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data Types</Label>
                <div className="flex flex-wrap gap-2">
                  {DATA_TYPES.map((dt) => {
                    const isSelected = (useCase.dataTypes || []).includes(dt.id);
                    return (
                      <button
                        key={dt.id}
                        type="button"
                        onClick={() => {
                          const current = useCase.dataTypes || [];
                          const updated = isSelected
                            ? current.filter((d) => d !== dt.id)
                            : [...current, dt.id];
                          updateField("dataTypes", updated);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          isSelected
                            ? "border-[#02a2fd] bg-[#02a2fd]/10 text-[#02a2fd]"
                            : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"
                        }`}
                        title={dt.description}
                      >
                        {dt.label}
                      </button>
                    );
                  })}
                </div>
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
          </div>
        )}

        {/* ---- HITL Bar ---- */}
        {(useCase.hitlCheckpoint || editing) && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-4 py-3 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            {editing ? (
              <Input
                value={useCase.hitlCheckpoint}
                onChange={(e) => updateField("hitlCheckpoint", e.target.value)}
                placeholder="e.g. Manager approval before invoice processing"
                className="text-sm border-none shadow-none px-0 h-auto bg-transparent focus-visible:ring-0"
              />
            ) : (
              <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                <span className="font-medium">HITL: </span>
                {useCase.hitlCheckpoint}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Theme Group (Collapsible) ---

function ThemeGroup({
  themeName,
  useCases,
  allUseCases,
  frictionPoints,
  strategicThemes,
  onUpdate,
  onDelete,
}: {
  themeName: string;
  useCases: { uc: UseCase; globalIndex: number }[];
  allUseCases: UseCase[];
  frictionPoints: any[];
  strategicThemes: any[];
  onUpdate: (globalIndex: number, updated: UseCase) => void;
  onDelete: (globalIndex: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-left w-full group"
      >
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform ${
            collapsed ? "-rotate-90" : ""
          }`}
        />
        <span className="font-semibold text-foreground">
          {themeName || "Ungrouped"}
        </span>
        <span className="text-sm text-muted-foreground">
          ({useCases.length} use case{useCases.length !== 1 ? "s" : ""})
        </span>
      </button>
      {!collapsed && (
        <div className="space-y-4 pl-6 border-l-2 border-[#02a2fd]/20">
          {useCases.map(({ uc, globalIndex }) => (
            <UseCaseCard
              key={uc.id}
              useCase={uc}
              index={globalIndex}
              frictionPoints={frictionPoints}
              strategicThemes={strategicThemes}
              onUpdate={(updated) => onUpdate(globalIndex, updated)}
              onDelete={() => onDelete(globalIndex)}
            />
          ))}
        </div>
      )}
    </div>
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

  // Group use cases by strategic theme
  const grouped = useMemo(() => {
    const groups: Record<string, { uc: UseCase; globalIndex: number }[]> = {};
    useCases.forEach((uc, i) => {
      const theme = uc.strategicTheme || "Ungrouped";
      if (!groups[theme]) groups[theme] = [];
      groups[theme].push({ uc, globalIndex: i });
    });
    return groups;
  }, [useCases]);

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
      targetFriction: "",
      strategicTheme: "",
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
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
            >
              4
            </div>
            AI Use Case Generation
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            These {useCases.length} use cases target the highest-impact friction
            points, with each designed to fundamentally reshape how work is
            performed. Every use case includes mandatory human validation
            checkpoints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {useCases.length} use case{useCases.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* Use Case Groups */}
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
        <div className="space-y-8">
          {Object.entries(grouped).map(([themeName, items]) => (
            <ThemeGroup
              key={themeName}
              themeName={themeName}
              useCases={items}
              allUseCases={useCases}
              frictionPoints={frictionPoints}
              strategicThemes={strategicThemes}
              onUpdate={updateUseCase}
              onDelete={deleteUseCase}
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
