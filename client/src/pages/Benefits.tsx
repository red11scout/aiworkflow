import { useState, useMemo, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Banknote,
  RefreshCw,
  AlertCircle,
  BarChart3,
} from "lucide-react";

// --- Types ---

interface FormulaComponent {
  label: string;
  value: number;
}

interface BenefitQuantification {
  id: string;
  useCaseId: string;
  costBenefit: string;
  costFormula: string;
  costFormulaLabels: { components: FormulaComponent[] };
  revenueBenefit: string;
  revenueFormula: string;
  revenueFormulaLabels: { components: FormulaComponent[] };
  riskBenefit: string;
  riskFormula: string;
  riskFormulaLabels: { components: FormulaComponent[] };
  cashFlowBenefit: string;
  cashFlowFormula: string;
  cashFlowFormulaLabels: { components: FormulaComponent[] };
  totalAnnualValue: string;
  expectedValue: string;
  probabilityOfSuccess: number;
}

interface UseCase {
  id: string;
  name: string;
}

type ScenarioType = "base" | "conservative" | "optimistic" | "custom";

// --- Helpers ---

function parseCurrency(value: string): number {
  return parseFloat(value?.replace(/[^0-9.-]/g, "") || "0") || 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getScenarioMultiplier(scenario: ScenarioType): number {
  switch (scenario) {
    case "conservative":
      return 0.7;
    case "optimistic":
      return 1.4;
    case "custom":
      return 1.0;
    case "base":
    default:
      return 1.0;
  }
}

function computeTotalFromComponents(components: FormulaComponent[]): number {
  return components.reduce((sum, c) => sum + (c.value || 0), 0);
}

// --- Scenario Tabs ---

const SCENARIO_TABS: { key: ScenarioType; label: string }[] = [
  { key: "base", label: "Base Case" },
  { key: "conservative", label: "Conservative" },
  { key: "optimistic", label: "Optimistic" },
  { key: "custom", label: "Custom" },
];

// --- Benefit Card Component ---

function BenefitCard({
  title,
  icon: Icon,
  iconColor,
  formula,
  components,
  totalValue,
  scenarioMultiplier,
  onComponentChange,
  editable,
}: {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  formula: string;
  components: FormulaComponent[];
  totalValue: string;
  scenarioMultiplier: number;
  onComponentChange: (index: number, value: number) => void;
  editable: boolean;
}) {
  const baseTotal = computeTotalFromComponents(components);
  const adjustedTotal = baseTotal * scenarioMultiplier;

  return (
    <Card className="flex-1 min-w-[220px]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        {formula && (
          <CardDescription className="text-xs font-mono mt-1">
            {formula}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {components.map((comp, i) => (
          <div key={i} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{comp.label}</Label>
            {editable ? (
              <Input
                type="number"
                value={comp.value}
                onChange={(e) =>
                  onComponentChange(i, parseFloat(e.target.value) || 0)
                }
                className="text-sm h-8"
              />
            ) : (
              <div className="text-sm font-medium">
                {formatCurrency(comp.value * scenarioMultiplier)}
              </div>
            )}
          </div>
        ))}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="font-semibold text-sm" style={{ color: iconColor }}>
              {formatCurrency(editable ? baseTotal : adjustedTotal)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// --- Probability Slider ---

function ProbabilitySlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <Label className="text-xs text-muted-foreground whitespace-nowrap">
        Probability of Success
      </Label>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-[#02a2fd]"
      />
      <Badge
        variant="outline"
        className="min-w-[50px] justify-center font-mono text-xs"
      >
        {value}%
      </Badge>
    </div>
  );
}

// --- Bar Chart (div-based) ---

function ScenarioComparisonChart({
  benefits,
  useCases,
}: {
  benefits: BenefitQuantification[];
  useCases: UseCase[];
}) {
  const scenarios: ScenarioType[] = [
    "conservative",
    "base",
    "optimistic",
  ];
  const colors: Record<string, string> = {
    conservative: "#36bf78",
    base: "#02a2fd",
    optimistic: "#001278",
  };
  const labels: Record<string, string> = {
    conservative: "Conservative",
    base: "Base Case",
    optimistic: "Optimistic",
  };

  const allValues = benefits.flatMap((b) =>
    scenarios.map(
      (s) => parseCurrency(b.totalAnnualValue) * getScenarioMultiplier(s),
    ),
  );
  const maxValue = Math.max(...allValues, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4" style={{ color: "#02a2fd" }} />
          Scenario Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {benefits.map((b) => {
            const uc = useCases.find((u) => u.id === b.useCaseId);
            return (
              <div key={b.id} className="space-y-2">
                <div className="text-xs font-medium text-foreground">
                  {uc?.name || b.useCaseId}
                </div>
                <div className="space-y-1.5">
                  {scenarios.map((s) => {
                    const val =
                      parseCurrency(b.totalAnnualValue) *
                      getScenarioMultiplier(s);
                    const widthPct = Math.max((val / maxValue) * 100, 2);
                    return (
                      <div key={s} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-24 text-right">
                          {labels[s]}
                        </span>
                        <div className="flex-1 h-5 bg-muted rounded-md overflow-hidden">
                          <div
                            className="h-full rounded-md transition-all duration-500"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: colors[s],
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono min-w-[80px] text-right">
                          {formatCurrency(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border justify-center">
          {scenarios.map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: colors[s] }}
              />
              <span className="text-xs text-muted-foreground">{labels[s]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---

export default function Benefits() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ScenarioType>("base");

  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);

  const benefits: BenefitQuantification[] = activeScenario?.benefits || [];
  const useCases: UseCase[] = activeScenario?.useCases || [];
  const scenarioMultiplier = getScenarioMultiplier(activeTab);
  const isEditable = activeTab === "base" || activeTab === "custom";

  const saveMutation = useMutation({
    mutationFn: async (updatedBenefits: BenefitQuantification[]) => {
      const res = await apiRequest("PUT", `/api/scenarios/${activeScenario.id}`, {
        benefits: updatedBenefits,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculate/benefits", {
        scenarioId: activeScenario.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  const generateScenariosMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/calculate/scenarios", {
        scenarioId: activeScenario.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
    },
  });

  const updateBenefitComponent = useCallback(
    (
      benefitIndex: number,
      category: "cost" | "revenue" | "risk" | "cashFlow",
      componentIndex: number,
      value: number,
    ) => {
      const updated = [...benefits];
      const b = { ...updated[benefitIndex] };
      const labelsKey =
        `${category}FormulaLabels` as keyof BenefitQuantification;
      const labels = {
        ...(b[labelsKey] as { components: FormulaComponent[] }),
      };
      labels.components = [...labels.components];
      labels.components[componentIndex] = {
        ...labels.components[componentIndex],
        value,
      };
      (b as any)[labelsKey] = labels;

      // Recalculate totals
      const costTotal = computeTotalFromComponents(
        b.costFormulaLabels.components,
      );
      const revTotal = computeTotalFromComponents(
        b.revenueFormulaLabels.components,
      );
      const riskTotal = computeTotalFromComponents(
        b.riskFormulaLabels.components,
      );
      const cfTotal = computeTotalFromComponents(
        b.cashFlowFormulaLabels.components,
      );

      b.costBenefit = formatCurrency(costTotal);
      b.revenueBenefit = formatCurrency(revTotal);
      b.riskBenefit = formatCurrency(riskTotal);
      b.cashFlowBenefit = formatCurrency(cfTotal);

      const totalAnnual = costTotal + revTotal + riskTotal + cfTotal;
      b.totalAnnualValue = formatCurrency(totalAnnual);
      b.expectedValue = formatCurrency(
        totalAnnual * (b.probabilityOfSuccess / 100),
      );

      updated[benefitIndex] = b;
      saveMutation.mutate(updated);
    },
    [benefits, saveMutation],
  );

  const updateProbability = useCallback(
    (benefitIndex: number, probability: number) => {
      const updated = [...benefits];
      const b = { ...updated[benefitIndex] };
      b.probabilityOfSuccess = probability;
      const totalAnnual = parseCurrency(b.totalAnnualValue);
      b.expectedValue = formatCurrency(totalAnnual * (probability / 100));
      updated[benefitIndex] = b;
      saveMutation.mutate(updated);
    },
    [benefits, saveMutation],
  );

  // Summary calculations
  const overallSummary = useMemo(() => {
    const totalAnnual = benefits.reduce(
      (sum, b) =>
        sum + parseCurrency(b.totalAnnualValue) * scenarioMultiplier,
      0,
    );
    const totalExpected = benefits.reduce(
      (sum, b) =>
        sum +
        parseCurrency(b.totalAnnualValue) *
          scenarioMultiplier *
          (b.probabilityOfSuccess / 100),
      0,
    );
    return { totalAnnual, totalExpected };
  }, [benefits, scenarioMultiplier]);

  const markComplete = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "POST",
        `/api/scenarios/${activeScenario.id}/complete-step`,
        { step: 5, section: "benefits" },
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
    navigate(`/project/${id}/workflows`);
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
            <DollarSign className="w-6 h-6" style={{ color: "#36bf78" }} />
            Financial Benefits & Scenarios
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quantify cost, revenue, risk, and cash flow benefits for each use
            case across multiple scenarios.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateScenariosMutation.mutate()}
            disabled={generateScenariosMutation.isPending}
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Generate Scenarios
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => recalculateMutation.mutate()}
            disabled={recalculateMutation.isPending}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${recalculateMutation.isPending ? "animate-spin" : ""}`}
            />
            Recalculate
          </Button>
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border">
        {SCENARIO_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
              activeTab === key
                ? "border-[#02a2fd] text-[#02a2fd]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overall Summary */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">
                Total Annual Value
              </div>
              <div className="text-xl font-bold" style={{ color: "#36bf78" }}>
                {formatCurrency(overallSummary.totalAnnual)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Expected Value (risk-adjusted)
              </div>
              <div className="text-xl font-bold" style={{ color: "#02a2fd" }}>
                {formatCurrency(overallSummary.totalExpected)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Use Cases</div>
              <div className="text-xl font-bold text-foreground">
                {benefits.length}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Scenario</div>
              <div className="text-xl font-bold text-foreground capitalize">
                {activeTab === "base" ? "Base Case" : activeTab}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per Use Case Benefits */}
      {benefits.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #36bf78, #02a2fd)" }}
            >
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No benefits quantified yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Use the Recalculate button to generate benefit estimates from your
              defined use cases, or they will be populated when AI analysis
              completes.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {benefits.map((benefit, bIndex) => {
            const uc = useCases.find((u) => u.id === benefit.useCaseId);
            const totalAnnual =
              parseCurrency(benefit.totalAnnualValue) * scenarioMultiplier;
            const expectedVal =
              totalAnnual * (benefit.probabilityOfSuccess / 100);

            return (
              <div key={benefit.id} className="space-y-4">
                {/* Use Case Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{
                        background:
                          "linear-gradient(135deg, #001278, #02a2fd)",
                      }}
                    >
                      {benefit.useCaseId}
                    </div>
                    <h3 className="font-semibold text-foreground">
                      {uc?.name || benefit.useCaseId}
                    </h3>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Annual: </span>
                      <span className="font-semibold" style={{ color: "#36bf78" }}>
                        {formatCurrency(totalAnnual)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Expected: </span>
                      <span className="font-semibold" style={{ color: "#02a2fd" }}>
                        {formatCurrency(expectedVal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4 Benefit Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                  <BenefitCard
                    title="Cost Reduction"
                    icon={Banknote}
                    iconColor="#36bf78"
                    formula={benefit.costFormula}
                    components={benefit.costFormulaLabels?.components || []}
                    totalValue={benefit.costBenefit}
                    scenarioMultiplier={scenarioMultiplier}
                    editable={isEditable}
                    onComponentChange={(ci, val) =>
                      updateBenefitComponent(bIndex, "cost", ci, val)
                    }
                  />
                  <BenefitCard
                    title="Revenue Uplift"
                    icon={TrendingUp}
                    iconColor="#02a2fd"
                    formula={benefit.revenueFormula}
                    components={benefit.revenueFormulaLabels?.components || []}
                    totalValue={benefit.revenueBenefit}
                    scenarioMultiplier={scenarioMultiplier}
                    editable={isEditable}
                    onComponentChange={(ci, val) =>
                      updateBenefitComponent(bIndex, "revenue", ci, val)
                    }
                  />
                  <BenefitCard
                    title="Risk Mitigation"
                    icon={ShieldCheck}
                    iconColor="#001278"
                    formula={benefit.riskFormula}
                    components={benefit.riskFormulaLabels?.components || []}
                    totalValue={benefit.riskBenefit}
                    scenarioMultiplier={scenarioMultiplier}
                    editable={isEditable}
                    onComponentChange={(ci, val) =>
                      updateBenefitComponent(bIndex, "risk", ci, val)
                    }
                  />
                  <BenefitCard
                    title="Cash Flow"
                    icon={DollarSign}
                    iconColor="#36bf78"
                    formula={benefit.cashFlowFormula}
                    components={
                      benefit.cashFlowFormulaLabels?.components || []
                    }
                    totalValue={benefit.cashFlowBenefit}
                    scenarioMultiplier={scenarioMultiplier}
                    editable={isEditable}
                    onComponentChange={(ci, val) =>
                      updateBenefitComponent(bIndex, "cashFlow", ci, val)
                    }
                  />
                </div>

                {/* Probability Slider */}
                <Card>
                  <CardContent className="py-3">
                    <ProbabilitySlider
                      value={benefit.probabilityOfSuccess}
                      onChange={(v) => updateProbability(bIndex, v)}
                    />
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Scenario Comparison Chart */}
      {benefits.length > 0 && (
        <div className="mt-8">
          <ScenarioComparisonChart benefits={benefits} useCases={useCases} />
        </div>
      )}

      {/* Error / Saving indicators */}
      {saveMutation.isPending && (
        <div className="fixed bottom-20 right-6 bg-card border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "#02a2fd" }} />
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
          onClick={() => navigate(`/project/${id}/usecases`)}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          AI Use Cases
        </Button>
        <Button
          onClick={handleNext}
          className="gap-2"
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          disabled={markComplete.isPending}
        >
          Workflows
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </Layout>
  );
}
