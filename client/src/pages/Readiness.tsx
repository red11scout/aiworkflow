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
import { Gauge, Save, ArrowLeft, ArrowRight, Calculator, Cpu, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";
import { READINESS_WEIGHTS } from "@shared/formulas";

interface ReadinessModel {
  id: string;
  useCaseId: string;
  dataAvailability: number;
  technicalInfrastructure: number;
  organizationalCapacity: number;
  governance: number;
  readinessScore: number;
  timeToValue: number;
  runsPerMonth: number;
  inputTokensPerRun: number;
  outputTokensPerRun: number;
  monthlyTokens: number;
  annualTokenCost: string;
}

// Claude pricing: $3/1M input tokens, $15/1M output tokens
const INPUT_COST_PER_MILLION = 3;
const OUTPUT_COST_PER_MILLION = 15;

function calcReadinessScore(m: ReadinessModel): number {
  return +(
    m.organizationalCapacity * READINESS_WEIGHTS.organizational +
    m.dataAvailability * READINESS_WEIGHTS.data +
    m.technicalInfrastructure * READINESS_WEIGHTS.technical +
    m.governance * READINESS_WEIGHTS.governance
  ).toFixed(2);
}

function calcMonthlyTokens(m: ReadinessModel): number {
  return m.runsPerMonth * (m.inputTokensPerRun + m.outputTokensPerRun);
}

function calcAnnualTokenCost(m: ReadinessModel): string {
  const monthlyInput = m.runsPerMonth * m.inputTokensPerRun;
  const monthlyOutput = m.runsPerMonth * m.outputTokensPerRun;
  const annualInputCost = (monthlyInput * 12 / 1_000_000) * INPUT_COST_PER_MILLION;
  const annualOutputCost = (monthlyOutput * 12 / 1_000_000) * OUTPUT_COST_PER_MILLION;
  return (annualInputCost + annualOutputCost).toFixed(2);
}

function getScoreColor(score: number): string {
  if (score >= 8) return "#36bf78";
  if (score >= 6) return "#02a2fd";
  if (score >= 4) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 8) return "High";
  if (score >= 6) return "Good";
  if (score >= 4) return "Moderate";
  return "Low";
}

export default function Readiness() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [models, setModels] = useState<ReadinessModel[]>([]);
  const [initialized, setInitialized] = useState(false);

  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);

  // Initialize local state from scenario data
  if (activeScenario?.readiness && !initialized) {
    setModels(activeScenario.readiness);
    setInitialized(true);
  }

  const useCases = (activeScenario?.useCases as any[]) || [];

  const getUseCaseName = useCallback(
    (useCaseId: string) => {
      const uc = useCases.find((u: any) => u.id === useCaseId);
      return uc?.name || useCaseId;
    },
    [useCases],
  );

  const getUseCaseCode = useCallback(
    (useCaseId: string, index: number) => {
      const uc = useCases.find((u: any) => u.id === useCaseId);
      return uc?.code || `UC-${String(index + 1).padStart(2, "0")}`;
    },
    [useCases],
  );

  // Summary metrics
  const summary = useMemo(() => {
    if (models.length === 0)
      return { avgReadiness: 0, totalMonthlyTokens: 0, totalAnnualCost: 0 };
    const avgReadiness =
      models.reduce((sum, m) => sum + m.readinessScore, 0) / models.length;
    const totalMonthlyTokens = models.reduce((sum, m) => sum + m.monthlyTokens, 0);
    const totalAnnualCost = models.reduce(
      (sum, m) => sum + parseFloat(m.annualTokenCost || "0"),
      0,
    );
    return {
      avgReadiness: +avgReadiness.toFixed(1),
      totalMonthlyTokens,
      totalAnnualCost: +totalAnnualCost.toFixed(2),
    };
  }, [models]);

  const saveMutation = useMutation({
    mutationFn: (data: ReadinessModel[]) =>
      apiRequest("PUT", `/api/scenarios/${activeScenario?.id}/section/readiness`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/scenarios`] });
      toast.success("Readiness data saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const calculateMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/calculate/readiness`, { scenarioId: activeScenario?.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/scenarios`] });
      setInitialized(false);
      toast.success("Readiness scores recalculated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to calculate: ${error.message}`);
    },
  });

  const updateModel = (modelId: string, field: keyof ReadinessModel, value: number) => {
    setModels((prev) =>
      prev.map((m) => {
        if (m.id !== modelId) return m;
        const updated = { ...m, [field]: value };
        // Recalculate derived fields
        updated.readinessScore = calcReadinessScore(updated);
        updated.monthlyTokens = calcMonthlyTokens(updated);
        updated.annualTokenCost = calcAnnualTokenCost(updated);
        return updated;
      }),
    );
  };

  const handleSave = useCallback(() => {
    saveMutation.mutate(models);
  }, [models, saveMutation]);

  const handleSaveAndCalculate = useCallback(() => {
    saveMutation.mutate(models, {
      onSuccess: () => {
        calculateMutation.mutate();
      },
    });
  }, [models, saveMutation, calculateMutation]);

  const formatTokens = (tokens: number): string => {
    if (tokens >= 1_000_000_000) return `${(tokens / 1_000_000_000).toFixed(1)}B`;
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
    return tokens.toString();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Readiness & Token Modeling</h1>
            <p className="text-sm text-muted-foreground">
              Assess organizational readiness and estimate token consumption for each use case
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {models.length} {models.length === 1 ? "use case" : "use cases"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button
            onClick={handleSaveAndCalculate}
            disabled={saveMutation.isPending || calculateMutation.isPending}
            style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
            className="text-white hover:opacity-90"
          >
            <Calculator className="w-4 h-4" />
            {calculateMutation.isPending ? "Calculating..." : "Save & Recalculate"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#02a2fd20" }}>
                <Gauge className="w-5 h-5" style={{ color: "#02a2fd" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Readiness Score</p>
                <p className="text-2xl font-bold" style={{ color: getScoreColor(summary.avgReadiness) }}>
                  {summary.avgReadiness}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ 10</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#001278" + "20" }}>
                <Cpu className="w-5 h-5" style={{ color: "#001278" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Monthly Tokens</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatTokens(summary.totalMonthlyTokens)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#36bf7820" }}>
                <DollarSign className="w-5 h-5" style={{ color: "#36bf78" }} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Annual Token Cost</p>
                <p className="text-2xl font-bold" style={{ color: "#36bf78" }}>
                  {formatCurrency(summary.totalAnnualCost)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Use Case Cards */}
      {models.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Gauge className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No readiness models yet</h3>
            <p className="text-sm text-muted-foreground">
              Run the readiness calculation to generate readiness models for your use cases.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {models.map((model, index) => (
            <Card key={model.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {getUseCaseCode(model.useCaseId, index)}
                    </Badge>
                    <CardTitle className="text-lg">{getUseCaseName(model.useCaseId)}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      style={{
                        backgroundColor: getScoreColor(model.readinessScore) + "20",
                        color: getScoreColor(model.readinessScore),
                        border: `1px solid ${getScoreColor(model.readinessScore)}40`,
                      }}
                    >
                      {getScoreLabel(model.readinessScore)} ({model.readinessScore.toFixed(1)})
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Readiness Dimensions */}
                  <div className="space-y-5">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Readiness Dimensions
                    </h4>

                    {/* Data Availability */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm">Data Availability</Label>
                        <span className="text-sm font-mono font-medium" style={{ color: getScoreColor(model.dataAvailability) }}>
                          {model.dataAvailability}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={model.dataAvailability}
                        onChange={(e) => updateModel(model.id, "dataAvailability", parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#02a2fd]"
                        style={{ accentColor: "#02a2fd" }}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                        <span>1</span>
                        <span className="text-muted-foreground/60">Weight: {READINESS_WEIGHTS.data * 100}%</span>
                        <span>10</span>
                      </div>
                    </div>

                    {/* Technical Infrastructure */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm">Technical Infrastructure</Label>
                        <span className="text-sm font-mono font-medium" style={{ color: getScoreColor(model.technicalInfrastructure) }}>
                          {model.technicalInfrastructure}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={model.technicalInfrastructure}
                        onChange={(e) => updateModel(model.id, "technicalInfrastructure", parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: "#02a2fd" }}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                        <span>1</span>
                        <span className="text-muted-foreground/60">Weight: {READINESS_WEIGHTS.technical * 100}%</span>
                        <span>10</span>
                      </div>
                    </div>

                    {/* Organizational Capacity */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm">Organizational Capacity</Label>
                        <span className="text-sm font-mono font-medium" style={{ color: getScoreColor(model.organizationalCapacity) }}>
                          {model.organizationalCapacity}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={model.organizationalCapacity}
                        onChange={(e) => updateModel(model.id, "organizationalCapacity", parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: "#02a2fd" }}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                        <span>1</span>
                        <span className="text-muted-foreground/60">Weight: {READINESS_WEIGHTS.organizational * 100}%</span>
                        <span>10</span>
                      </div>
                    </div>

                    {/* Governance */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm">Governance</Label>
                        <span className="text-sm font-mono font-medium" style={{ color: getScoreColor(model.governance) }}>
                          {model.governance}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={model.governance}
                        onChange={(e) => updateModel(model.id, "governance", parseInt(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                        style={{ accentColor: "#02a2fd" }}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                        <span>1</span>
                        <span className="text-muted-foreground/60">Weight: {READINESS_WEIGHTS.governance * 100}%</span>
                        <span>10</span>
                      </div>
                    </div>

                    {/* Readiness Score Bar */}
                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">Readiness Score</span>
                        <span className="text-lg font-bold" style={{ color: getScoreColor(model.readinessScore) }}>
                          {model.readinessScore.toFixed(1)} / 10
                        </span>
                      </div>
                      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(model.readinessScore / 10) * 100}%`,
                            backgroundColor: getScoreColor(model.readinessScore),
                          }}
                        />
                      </div>
                    </div>

                    {/* Time to Value */}
                    <div className="pt-2">
                      <Label htmlFor={`ttv-${model.id}`} className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4" />
                        Time to Value (months)
                      </Label>
                      <Input
                        id={`ttv-${model.id}`}
                        type="number"
                        min={1}
                        max={60}
                        value={model.timeToValue}
                        onChange={(e) => updateModel(model.id, "timeToValue", parseInt(e.target.value) || 0)}
                        className="w-32"
                      />
                    </div>
                  </div>

                  {/* Token Modeling */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      Token Modeling
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`runs-${model.id}`}>Runs per Month</Label>
                        <Input
                          id={`runs-${model.id}`}
                          type="number"
                          min={0}
                          value={model.runsPerMonth}
                          onChange={(e) => updateModel(model.id, "runsPerMonth", parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`input-tokens-${model.id}`}>Input Tokens / Run</Label>
                        <Input
                          id={`input-tokens-${model.id}`}
                          type="number"
                          min={0}
                          value={model.inputTokensPerRun}
                          onChange={(e) => updateModel(model.id, "inputTokensPerRun", parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`output-tokens-${model.id}`}>Output Tokens / Run</Label>
                        <Input
                          id={`output-tokens-${model.id}`}
                          type="number"
                          min={0}
                          value={model.outputTokensPerRun}
                          onChange={(e) => updateModel(model.id, "outputTokensPerRun", parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Calculated Values */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3 mt-4">
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Calculated Estimates
                      </h5>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Monthly Tokens</span>
                        <span className="text-sm font-mono font-medium text-foreground">
                          {formatTokens(model.monthlyTokens)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Monthly Input Tokens</span>
                        <span className="text-sm font-mono text-muted-foreground">
                          {formatTokens(model.runsPerMonth * model.inputTokensPerRun)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Monthly Output Tokens</span>
                        <span className="text-sm font-mono text-muted-foreground">
                          {formatTokens(model.runsPerMonth * model.outputTokensPerRun)}
                        </span>
                      </div>
                      <div className="border-t border-border pt-3 flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">Annual Token Cost</span>
                        <span className="text-lg font-bold" style={{ color: "#36bf78" }}>
                          ${parseFloat(model.annualTokenCost || "0").toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Based on Claude pricing: $3/1M input tokens, $15/1M output tokens
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button variant="outline" onClick={() => navigate(`/project/${id}/workflows`)}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={() => navigate(`/project/${id}/matrix`)}
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          className="text-white hover:opacity-90"
        >
          Next: Value Matrix
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Layout>
  );
}
