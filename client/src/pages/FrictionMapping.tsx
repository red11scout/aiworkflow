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
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Flame,
} from "lucide-react";
import { toast } from "sonner";

interface FrictionPoint {
  id: string;
  role: string;
  roleId: string;
  function: string;
  subFunction: string;
  frictionPoint: string;
  severity: string;
  annualHours: number;
  hourlyRate: number;
  loadedHourlyRate: number;
  costFormula: string;
  estimatedAnnualCost: string;
  primaryDriverImpact: string;
  strategicThemeId: string;
}

interface StrategicTheme {
  id: string;
  name: string;
}

const SEVERITY_OPTIONS = ["Critical", "High", "Medium"];

function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "high":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "medium":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function formatCurrency(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value;
  if (isNaN(num)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(num);
}

export default function FrictionMapping() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [frictionPoints, setFrictionPoints] = useState<FrictionPoint[]>([]);
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
  if (activeScenario?.frictionPoints && !initialized) {
    setFrictionPoints(activeScenario.frictionPoints);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: FrictionPoint[]) =>
      apiRequest("PUT", `/api/scenarios/${activeScenario?.id}/section/friction_points`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/scenarios`] });
      toast.success("Friction points saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate(frictionPoints);
  }, [frictionPoints, saveMutation]);

  const handleBlur = useCallback(() => {
    saveMutation.mutate(frictionPoints);
  }, [frictionPoints, saveMutation]);

  // Summary calculations
  const summary = useMemo(() => {
    let totalCost = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    frictionPoints.forEach((fp) => {
      const cost = fp.annualHours * fp.loadedHourlyRate;
      totalCost += isNaN(cost) ? 0 : cost;

      switch (fp.severity?.toLowerCase()) {
        case "critical":
          criticalCount++;
          break;
        case "high":
          highCount++;
          break;
        case "medium":
          mediumCount++;
          break;
      }
    });

    return { totalCost, criticalCount, highCount, mediumCount };
  }, [frictionPoints]);

  const addFrictionPoint = () => {
    const newFp: FrictionPoint = {
      id: `fp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      role: "",
      roleId: "",
      function: "",
      subFunction: "",
      frictionPoint: "",
      severity: "Medium",
      annualHours: 0,
      hourlyRate: 0,
      loadedHourlyRate: 0,
      costFormula: "",
      estimatedAnnualCost: "0",
      primaryDriverImpact: "",
      strategicThemeId: "",
    };
    setFrictionPoints((prev) => [...prev, newFp]);
    setExpandedRow(newFp.id);
  };

  const deleteFrictionPoint = (fpId: string) => {
    const updated = frictionPoints.filter((fp) => fp.id !== fpId);
    setFrictionPoints(updated);
    setDeleteConfirmId(null);
    setTimeout(() => saveMutation.mutate(updated), 0);
  };

  const updateFrictionPoint = (fpId: string, field: keyof FrictionPoint, value: string | number) => {
    setFrictionPoints((prev) =>
      prev.map((fp) => {
        if (fp.id !== fpId) return fp;

        const updated = { ...fp, [field]: value };

        // Auto-calculate estimatedAnnualCost and costFormula when relevant fields change
        if (field === "annualHours" || field === "loadedHourlyRate") {
          const hours = field === "annualHours" ? (value as number) : updated.annualHours;
          const rate = field === "loadedHourlyRate" ? (value as number) : updated.loadedHourlyRate;
          const cost = hours * rate;
          updated.estimatedAnnualCost = isNaN(cost) ? "0" : cost.toString();
          updated.costFormula = `${hours} hrs x $${rate}/hr`;
        }

        return updated;
      })
    );
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
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Friction Point Mapping</h1>
            <p className="text-sm text-muted-foreground">
              Identify and quantify operational friction points across your organization
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {frictionPoints.length} {frictionPoints.length === 1 ? "point" : "points"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={addFrictionPoint}>
            <Plus className="w-4 h-4" />
            Add Point
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {frictionPoints.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Total Annual Cost
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(summary.totalCost)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Critical
                </span>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {summary.criticalCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  High
                </span>
              </div>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {summary.highCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">
                  Medium
                </span>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {summary.mediumCount}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Friction Point Rows */}
      {frictionPoints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No friction points mapped yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add friction points to quantify operational inefficiencies and their costs.
            </p>
            <Button onClick={addFrictionPoint}>
              <Plus className="w-4 h-4" />
              Add First Friction Point
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {frictionPoints.map((fp, index) => {
            const computedCost = fp.annualHours * fp.loadedHourlyRate;
            const displayCost = isNaN(computedCost) ? 0 : computedCost;

            return (
              <Card key={fp.id}>
                {/* Compact row view */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedRow(expandedRow === fp.id ? null : fp.id)}
                >
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    {index + 1}
                  </Badge>

                  <div className="flex-1 min-w-0 grid grid-cols-5 gap-3 items-center">
                    <div className="truncate">
                      <span className="text-xs text-muted-foreground block">Role</span>
                      <span className="text-sm font-medium text-foreground">
                        {fp.role || "Untitled"}
                      </span>
                    </div>
                    <div className="truncate">
                      <span className="text-xs text-muted-foreground block">Friction Point</span>
                      <span className="text-sm text-foreground">
                        {fp.frictionPoint || "--"}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Severity</span>
                      <Badge className={`${getSeverityColor(fp.severity)} text-xs`}>
                        {fp.severity || "Medium"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Annual Hours</span>
                      <span className="text-sm text-foreground">
                        {fp.annualHours?.toLocaleString() || "0"} hrs
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground block">Est. Cost</span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(displayCost)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {deleteConfirmId === fp.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteFrictionPoint(fp.id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(fp.id);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {expandedRow === fp.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded edit view */}
                {expandedRow === fp.id && (
                  <CardContent className="border-t border-border pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Role */}
                      <div>
                        <Label htmlFor={`role-${fp.id}`}>Role</Label>
                        <Input
                          id={`role-${fp.id}`}
                          value={fp.role}
                          onChange={(e) => updateFrictionPoint(fp.id, "role", e.target.value)}
                          onBlur={handleBlur}
                          placeholder="e.g., Sales Manager"
                          className="mt-1"
                        />
                      </div>
                      {/* Role ID */}
                      <div>
                        <Label htmlFor={`roleId-${fp.id}`}>Role ID</Label>
                        <Input
                          id={`roleId-${fp.id}`}
                          value={fp.roleId}
                          onChange={(e) => updateFrictionPoint(fp.id, "roleId", e.target.value)}
                          onBlur={handleBlur}
                          placeholder="e.g., SM-001"
                          className="mt-1"
                        />
                      </div>
                      {/* Function */}
                      <div>
                        <Label htmlFor={`fn-${fp.id}`}>Function</Label>
                        <Input
                          id={`fn-${fp.id}`}
                          value={fp.function}
                          onChange={(e) => updateFrictionPoint(fp.id, "function", e.target.value)}
                          onBlur={handleBlur}
                          placeholder="e.g., Sales"
                          className="mt-1"
                        />
                      </div>
                      {/* Sub-Function */}
                      <div>
                        <Label htmlFor={`subfn-${fp.id}`}>Sub-Function</Label>
                        <Input
                          id={`subfn-${fp.id}`}
                          value={fp.subFunction}
                          onChange={(e) => updateFrictionPoint(fp.id, "subFunction", e.target.value)}
                          onBlur={handleBlur}
                          placeholder="e.g., Lead Qualification"
                          className="mt-1"
                        />
                      </div>
                      {/* Friction Point Description */}
                      <div className="md:col-span-2">
                        <Label htmlFor={`desc-${fp.id}`}>Friction Point Description</Label>
                        <Input
                          id={`desc-${fp.id}`}
                          value={fp.frictionPoint}
                          onChange={(e) => updateFrictionPoint(fp.id, "frictionPoint", e.target.value)}
                          onBlur={handleBlur}
                          placeholder="Describe the friction point..."
                          className="mt-1"
                        />
                      </div>
                      {/* Severity */}
                      <div>
                        <Label>Severity</Label>
                        <div className="flex gap-2 mt-1">
                          {SEVERITY_OPTIONS.map((sev) => (
                            <button
                              key={sev}
                              type="button"
                              onClick={() => {
                                updateFrictionPoint(fp.id, "severity", sev);
                                handleBlur();
                              }}
                              className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                                fp.severity === sev
                                  ? getSeverityColor(sev)
                                  : "border-input text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {sev}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Annual Hours */}
                      <div>
                        <Label htmlFor={`hours-${fp.id}`}>Annual Hours</Label>
                        <Input
                          id={`hours-${fp.id}`}
                          type="number"
                          value={fp.annualHours || ""}
                          onChange={(e) =>
                            updateFrictionPoint(fp.id, "annualHours", parseFloat(e.target.value) || 0)
                          }
                          onBlur={handleBlur}
                          placeholder="e.g., 500"
                          className="mt-1"
                        />
                      </div>
                      {/* Hourly Rate */}
                      <div>
                        <Label htmlFor={`rate-${fp.id}`}>Hourly Rate ($)</Label>
                        <Input
                          id={`rate-${fp.id}`}
                          type="number"
                          value={fp.hourlyRate || ""}
                          onChange={(e) =>
                            updateFrictionPoint(fp.id, "hourlyRate", parseFloat(e.target.value) || 0)
                          }
                          onBlur={handleBlur}
                          placeholder="e.g., 75"
                          className="mt-1"
                        />
                      </div>
                      {/* Loaded Hourly Rate */}
                      <div>
                        <Label htmlFor={`loaded-${fp.id}`}>Loaded Hourly Rate ($)</Label>
                        <Input
                          id={`loaded-${fp.id}`}
                          type="number"
                          value={fp.loadedHourlyRate || ""}
                          onChange={(e) =>
                            updateFrictionPoint(
                              fp.id,
                              "loadedHourlyRate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          onBlur={handleBlur}
                          placeholder="e.g., 112"
                          className="mt-1"
                        />
                      </div>
                      {/* Cost Formula (read-only) */}
                      <div>
                        <Label>Cost Formula</Label>
                        <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-muted-foreground mt-1">
                          {fp.annualHours && fp.loadedHourlyRate
                            ? `${fp.annualHours.toLocaleString()} hrs x $${fp.loadedHourlyRate}/hr`
                            : "Enter hours and rate"}
                        </div>
                      </div>
                      {/* Estimated Annual Cost (auto-calculated, read-only) */}
                      <div>
                        <Label>Estimated Annual Cost</Label>
                        <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/50 px-3 py-1 text-sm font-semibold text-foreground mt-1">
                          {formatCurrency(displayCost)}
                        </div>
                      </div>
                      {/* Primary Driver Impact */}
                      <div>
                        <Label htmlFor={`driver-${fp.id}`}>Primary Driver / Impact</Label>
                        <Input
                          id={`driver-${fp.id}`}
                          value={fp.primaryDriverImpact}
                          onChange={(e) =>
                            updateFrictionPoint(fp.id, "primaryDriverImpact", e.target.value)
                          }
                          onBlur={handleBlur}
                          placeholder="e.g., Revenue Loss, Productivity"
                          className="mt-1"
                        />
                      </div>
                      {/* Strategic Theme */}
                      <div>
                        <Label htmlFor={`theme-${fp.id}`}>Strategic Theme</Label>
                        <select
                          id={`theme-${fp.id}`}
                          value={fp.strategicThemeId}
                          onChange={(e) => {
                            updateFrictionPoint(fp.id, "strategicThemeId", e.target.value);
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
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => navigate(`/project/${id}/functions`)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={() => navigate(`/project/${id}/usecases`)}
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          className="text-white hover:opacity-90"
        >
          Next: AI Use Cases
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Layout>
  );
}
