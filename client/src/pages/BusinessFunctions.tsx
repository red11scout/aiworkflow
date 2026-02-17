import { useState, useCallback, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Save,
  BarChart3,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

interface BusinessFunction {
  id: string;
  function: string;
  subFunction: string;
  kpiName: string;
  direction: string;
  baselineValue: string;
  targetValue: string;
  timeframe: string;
  benchmarkAvg: string;
  benchmarkIndustryBest: string;
  benchmarkOverallBest: string;
  strategicThemeId: string;
}

interface StrategicTheme {
  id: string;
  name: string;
}

export default function BusinessFunctions() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [functions, setFunctions] = useState<BusinessFunction[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);

  // Get strategic themes for the dropdown
  const strategicThemes: StrategicTheme[] = activeScenario?.strategicThemes || [];

  // Initialize local state from scenario data
  if (activeScenario?.businessFunctions && !initialized) {
    setFunctions(activeScenario.businessFunctions);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: BusinessFunction[]) =>
      apiRequest("PUT", `/api/scenarios/${activeScenario?.id}/section/business_functions`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/scenarios`] });
      toast.success("Business functions saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate(functions);
  }, [functions, saveMutation]);

  const handleBlur = useCallback(() => {
    saveMutation.mutate(functions);
  }, [functions, saveMutation]);

  const addFunction = () => {
    const newFn: BusinessFunction = {
      id: `bf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      function: "",
      subFunction: "",
      kpiName: "",
      direction: "up",
      baselineValue: "",
      targetValue: "",
      timeframe: "",
      benchmarkAvg: "",
      benchmarkIndustryBest: "",
      benchmarkOverallBest: "",
      strategicThemeId: "",
    };
    setFunctions((prev) => [...prev, newFn]);
    setExpandedRow(newFn.id);
  };

  const deleteFunction = (fnId: string) => {
    const updated = functions.filter((f) => f.id !== fnId);
    setFunctions(updated);
    setDeleteConfirmId(null);
    setTimeout(() => saveMutation.mutate(updated), 0);
  };

  const updateFunction = (fnId: string, field: keyof BusinessFunction, value: string) => {
    setFunctions((prev) =>
      prev.map((f) => (f.id === fnId ? { ...f, [field]: value } : f))
    );
  };

  // Parse numeric value for bar chart rendering
  const parseNum = (val: string): number => {
    const n = parseFloat(val?.replace(/[^0-9.-]/g, "") || "0");
    return isNaN(n) ? 0 : n;
  };

  // Compute the max value for bar scaling across a row
  const getBarMax = (fn: BusinessFunction): number => {
    const vals = [
      parseNum(fn.baselineValue),
      parseNum(fn.targetValue),
      parseNum(fn.benchmarkAvg),
      parseNum(fn.benchmarkIndustryBest),
      parseNum(fn.benchmarkOverallBest),
    ];
    return Math.max(...vals, 1);
  };

  // Get theme name by id
  const getThemeName = (themeId: string): string => {
    const theme = strategicThemes.find((t) => t.id === themeId);
    return theme?.name || "Unlinked";
  };

  return (
    <Layout
      projectId={id}
      companyName={(project as any)?.companyName}
      completedSteps={activeScenario?.completedSteps}
      showStepper
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          >
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Business Functions & KPIs</h1>
            <p className="text-sm text-muted-foreground">
              Map business functions, sub-functions, and their key performance indicators
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {functions.length} {functions.length === 1 ? "KPI" : "KPIs"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={addFunction}>
            <Plus className="w-4 h-4" />
            Add Row
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Function Cards / Table */}
      {functions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No business functions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add business functions and KPIs to track performance targets.
            </p>
            <Button onClick={addFunction}>
              <Plus className="w-4 h-4" />
              Add First Row
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {functions.map((fn, index) => (
            <Card key={fn.id}>
              {/* Compact row view */}
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setExpandedRow(expandedRow === fn.id ? null : fn.id)}
              >
                <Badge variant="outline" className="font-mono text-xs shrink-0">
                  {index + 1}
                </Badge>

                <div className="flex-1 min-w-0 grid grid-cols-4 gap-3 items-center">
                  <div className="truncate">
                    <span className="text-xs text-muted-foreground block">Function</span>
                    <span className="text-sm font-medium text-foreground">
                      {fn.function || "Untitled"}
                    </span>
                  </div>
                  <div className="truncate">
                    <span className="text-xs text-muted-foreground block">KPI</span>
                    <span className="text-sm text-foreground">{fn.kpiName || "--"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {fn.direction === "up" || fn.direction === "\u2191" ? (
                      <ArrowUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm text-foreground">
                      {fn.baselineValue || "?"} &rarr; {fn.targetValue || "?"}
                    </span>
                  </div>
                  <div className="truncate">
                    <span className="text-xs text-muted-foreground block">Theme</span>
                    <span className="text-sm text-foreground">
                      {getThemeName(fn.strategicThemeId)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {deleteConfirmId === fn.id ? (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="destructive" size="sm" onClick={() => deleteFunction(fn.id)}>
                        Confirm
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(fn.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  {expandedRow === fn.id ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Expanded edit view */}
              {expandedRow === fn.id && (
                <CardContent className="border-t border-border pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Function */}
                    <div>
                      <Label htmlFor={`fn-${fn.id}`}>Function</Label>
                      <Input
                        id={`fn-${fn.id}`}
                        value={fn.function}
                        onChange={(e) => updateFunction(fn.id, "function", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., Sales"
                        className="mt-1"
                      />
                    </div>
                    {/* Sub-Function */}
                    <div>
                      <Label htmlFor={`subfn-${fn.id}`}>Sub-Function</Label>
                      <Input
                        id={`subfn-${fn.id}`}
                        value={fn.subFunction}
                        onChange={(e) => updateFunction(fn.id, "subFunction", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., Lead Generation"
                        className="mt-1"
                      />
                    </div>
                    {/* KPI Name */}
                    <div>
                      <Label htmlFor={`kpi-${fn.id}`}>KPI Name</Label>
                      <Input
                        id={`kpi-${fn.id}`}
                        value={fn.kpiName}
                        onChange={(e) => updateFunction(fn.id, "kpiName", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., Lead Conversion Rate"
                        className="mt-1"
                      />
                    </div>
                    {/* Direction */}
                    <div>
                      <Label>Direction</Label>
                      <div className="flex gap-2 mt-1">
                        <Button
                          type="button"
                          variant={fn.direction === "up" || fn.direction === "\u2191" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            updateFunction(fn.id, "direction", "up");
                            handleBlur();
                          }}
                          className={
                            fn.direction === "up" || fn.direction === "\u2191"
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : ""
                          }
                        >
                          <ArrowUp className="w-4 h-4" />
                          Higher is Better
                        </Button>
                        <Button
                          type="button"
                          variant={fn.direction === "down" || fn.direction === "\u2193" ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            updateFunction(fn.id, "direction", "down");
                            handleBlur();
                          }}
                          className={
                            fn.direction === "down" || fn.direction === "\u2193"
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : ""
                          }
                        >
                          <ArrowDown className="w-4 h-4" />
                          Lower is Better
                        </Button>
                      </div>
                    </div>
                    {/* Baseline Value */}
                    <div>
                      <Label htmlFor={`baseline-${fn.id}`}>Baseline Value</Label>
                      <Input
                        id={`baseline-${fn.id}`}
                        value={fn.baselineValue}
                        onChange={(e) => updateFunction(fn.id, "baselineValue", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., 12%"
                        className="mt-1"
                      />
                    </div>
                    {/* Target Value */}
                    <div>
                      <Label htmlFor={`target-${fn.id}`}>Target Value</Label>
                      <Input
                        id={`target-${fn.id}`}
                        value={fn.targetValue}
                        onChange={(e) => updateFunction(fn.id, "targetValue", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., 20%"
                        className="mt-1"
                      />
                    </div>
                    {/* Timeframe */}
                    <div>
                      <Label htmlFor={`timeframe-${fn.id}`}>Timeframe</Label>
                      <Input
                        id={`timeframe-${fn.id}`}
                        value={fn.timeframe}
                        onChange={(e) => updateFunction(fn.id, "timeframe", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., 12 months"
                        className="mt-1"
                      />
                    </div>
                    {/* Benchmark Avg */}
                    <div>
                      <Label htmlFor={`benchAvg-${fn.id}`}>Benchmark Avg</Label>
                      <Input
                        id={`benchAvg-${fn.id}`}
                        value={fn.benchmarkAvg}
                        onChange={(e) => updateFunction(fn.id, "benchmarkAvg", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., 15%"
                        className="mt-1"
                      />
                    </div>
                    {/* Benchmark Industry Best */}
                    <div>
                      <Label htmlFor={`benchInd-${fn.id}`}>Industry Best</Label>
                      <Input
                        id={`benchInd-${fn.id}`}
                        value={fn.benchmarkIndustryBest}
                        onChange={(e) => updateFunction(fn.id, "benchmarkIndustryBest", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., 25%"
                        className="mt-1"
                      />
                    </div>
                    {/* Benchmark Overall Best */}
                    <div>
                      <Label htmlFor={`benchBest-${fn.id}`}>Overall Best</Label>
                      <Input
                        id={`benchBest-${fn.id}`}
                        value={fn.benchmarkOverallBest}
                        onChange={(e) => updateFunction(fn.id, "benchmarkOverallBest", e.target.value)}
                        onBlur={handleBlur}
                        placeholder="e.g., 30%"
                        className="mt-1"
                      />
                    </div>
                    {/* Strategic Theme */}
                    <div>
                      <Label htmlFor={`theme-${fn.id}`}>Strategic Theme</Label>
                      <select
                        id={`theme-${fn.id}`}
                        value={fn.strategicThemeId}
                        onChange={(e) => {
                          updateFunction(fn.id, "strategicThemeId", e.target.value);
                          handleBlur();
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                      >
                        <option value="">Select theme...</option>
                        {strategicThemes.map((theme) => (
                          <option key={theme.id} value={theme.id}>
                            {theme.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Horizontal Bar Chart: Baseline vs Target vs Benchmarks */}
                  {(fn.baselineValue || fn.targetValue || fn.benchmarkAvg) && (
                    <div className="mt-6">
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide mb-3 block">
                        KPI Comparison
                      </Label>
                      <div className="space-y-2">
                        {[
                          { label: "Baseline", value: fn.baselineValue, color: "#94a3b8" },
                          { label: "Target", value: fn.targetValue, color: "#02a2fd" },
                          { label: "Bench Avg", value: fn.benchmarkAvg, color: "#a78bfa" },
                          { label: "Industry Best", value: fn.benchmarkIndustryBest, color: "#36bf78" },
                          { label: "Overall Best", value: fn.benchmarkOverallBest, color: "#001278" },
                        ]
                          .filter((b) => b.value)
                          .map((bar) => {
                            const numVal = parseNum(bar.value);
                            const max = getBarMax(fn);
                            const pct = max > 0 ? (numVal / max) * 100 : 0;
                            return (
                              <div key={bar.label} className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground w-24 text-right shrink-0">
                                  {bar.label}
                                </span>
                                <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.max(pct, 2)}%`,
                                      backgroundColor: bar.color,
                                    }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-foreground w-16 shrink-0">
                                  {bar.value}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => navigate(`/project/${id}/themes`)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={() => navigate(`/project/${id}/friction`)}
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          className="text-white hover:opacity-90"
        >
          Next: Friction Mapping
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Layout>
  );
}
