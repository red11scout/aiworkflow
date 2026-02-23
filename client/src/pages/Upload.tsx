import { useState, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload as UploadIcon,
  FileJson,
  CheckCircle2,
  Target,
  BarChart3,
  AlertTriangle,
  Brain,
  DollarSign,
  ArrowRight,
  Loader2,
  FileUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Project {
  id: number;
  name: string;
  companyName: string;
  industry: string;
  description?: string;
  status: string;
}

interface Scenario {
  id: number;
  projectId: number;
  name: string;
  isActive: boolean;
  completedSteps: number[];
  sectionData: Record<string, any>;
}

interface ImportSummary {
  themes: number;
  functions: number;
  frictionPoints: number;
  useCases: number;
  benefits: number;
}

export default function Upload() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Editable company overview fields
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [overviewDirty, setOverviewDirty] = useState(false);

  // Fetch project
  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${id}`],
    enabled: !!id,
  });

  // Fetch scenarios
  const { data: scenarios = [] } = useQuery<Scenario[]>({
    queryKey: [`/api/projects/${id}/scenarios`],
    enabled: !!id,
  });

  const activeScenario = scenarios.find((s) => s.isActive) || scenarios[0];
  const completedSteps = activeScenario?.completedSteps || [];

  // Populate company overview from project data
  const projectLoaded = useRef(false);
  if (project && !projectLoaded.current) {
    projectLoaded.current = true;
    setCompanyName(project.companyName || "");
    setIndustry(project.industry || "");
    setDescription(project.description || "");
  }

  // Detect existing import summary from scenario section data
  const scenarioLoaded = useRef(false);
  if (activeScenario && !scenarioLoaded.current) {
    scenarioLoaded.current = true;
    const overview = activeScenario.sectionData?.company_overview;
    if (overview) {
      if (overview.companyName) setCompanyName(overview.companyName);
      if (overview.industry) setIndustry(overview.industry);
      if (overview.description) setDescription(overview.description);
    }
    if (activeScenario.sectionData?.import_summary) {
      setImportSummary(activeScenario.sectionData.import_summary);
      setUploadedFile("Previously imported");
    }
  }

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (rawJson: unknown) => {
      const res = await apiRequest("POST", `/api/projects/${id}/import`, {
        rawJson,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}`] });
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });

      // Extract summary from response
      if (data.summary) {
        setImportSummary(data.summary);
      } else {
        // Build summary from counts if available
        setImportSummary({
          themes: data.themesCount || data.themes?.length || 0,
          functions: data.functionsCount || data.functions?.length || 0,
          frictionPoints:
            data.frictionPointsCount || data.frictionPoints?.length || 0,
          useCases: data.useCasesCount || data.useCases?.length || 0,
          benefits: data.benefitsCount || data.benefits?.length || 0,
        });
      }

      // Update company overview from imported data
      if (data.companyName) setCompanyName(data.companyName);
      if (data.industry) setIndustry(data.industry);
      if (data.description) setDescription(data.description);

      // Capture validation warnings (e.g., unmapped friction points)
      if (data.validationWarnings?.length > 0) {
        setValidationWarnings(data.validationWarnings);
      } else {
        setValidationWarnings([]);
      }

      toast.success("Data imported successfully");
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  // Save company overview
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeScenario) throw new Error("No active scenario");
      await apiRequest(
        "PUT",
        `/api/scenarios/${activeScenario.id}/section/company_overview`,
        {
          data: {
            companyName,
            industry,
            description,
          },
        }
      );
    },
    onSuccess: () => {
      setOverviewDirty(false);
      queryClient.invalidateQueries({
        queryKey: [`/api/projects/${id}/scenarios`],
      });
      toast.success("Company overview saved");
    },
    onError: (error: Error) => {
      toast.error(`Save failed: ${error.message}`);
    },
  });

  // File handling
  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".json")) {
        toast.error("Please upload a JSON file");
        return;
      }

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        setUploadedFile(file.name);
        importMutation.mutate(parsed);
      } catch {
        toast.error("Invalid JSON file. Please check the file format.");
      }
    },
    [importMutation]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const summaryCards = importSummary
    ? [
        {
          label: "Strategic Themes",
          count: importSummary.themes,
          icon: Target,
          color: "#001278",
        },
        {
          label: "Business Functions",
          count: importSummary.functions,
          icon: BarChart3,
          color: "#02a2fd",
        },
        {
          label: "Friction Points",
          count: importSummary.frictionPoints,
          icon: AlertTriangle,
          color: "#f59e0b",
        },
        {
          label: "AI Use Cases",
          count: importSummary.useCases,
          icon: Brain,
          color: "#36bf78",
        },
        {
          label: "Benefits",
          count: importSummary.benefits,
          icon: DollarSign,
          color: "#8b5cf6",
        },
      ]
    : [];

  if (projectLoading) {
    return (
      <Layout
        projectId={id}
        showStepper={true}
        completedSteps={[]}
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      projectId={id}
      companyName={companyName || project?.companyName}
      completedSteps={completedSteps}
      showStepper={true}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Upload Assessment Data
          </h1>
          <p className="text-muted-foreground mt-1">
            Import your AI assessment JSON to populate strategic themes,
            functions, use cases, and benefits.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          className={`
            relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
            ${
              isDragOver
                ? "border-[#02a2fd] bg-[#02a2fd]/5 scale-[1.01]"
                : uploadedFile && !importMutation.isPending
                  ? "border-[#36bf78]/50 bg-[#36bf78]/5"
                  : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileInput}
          />

          <div className="flex flex-col items-center justify-center py-16 px-6">
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-12 h-12 text-[#02a2fd] animate-spin mb-4" />
                <p className="text-lg font-medium text-foreground">
                  Importing data...
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Parsing and creating records from your JSON file
                </p>
              </>
            ) : uploadedFile ? (
              <>
                <div className="w-14 h-14 rounded-xl bg-[#36bf78]/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-[#36bf78]" />
                </div>
                <p className="text-lg font-medium text-foreground">
                  Data imported successfully
                </p>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <FileJson className="w-4 h-4" />
                  <span>{uploadedFile}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Drop a new file to re-import
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-4">
                  <FileUp className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium text-foreground">
                  Drop your JSON file here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-4 max-w-sm text-center">
                  Upload the JSON export from your AI assessment platform. This
                  will create strategic themes, business functions, friction
                  points, and use cases.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Import Summary */}
        {importSummary && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Import Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {summaryCards.map(({ label, count, icon: Icon, color }) => (
                  <Card key={label} className="text-center">
                    <CardContent className="pt-5 pb-4">
                      <div
                        className="w-10 h-10 rounded-lg mx-auto mb-3 flex items-center justify-center"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color }}
                        />
                      </div>
                      <div className="text-2xl font-bold text-foreground">
                        {count}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {label}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Validation Warnings */}
            {validationWarnings.length > 0 && (
              <Card className="mt-4 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Import Validation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
                    {validationWarnings.map((w, i) => (
                      <li key={i} className="leading-relaxed">{w}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Auto-generated use cases have conservative estimates. Review and customize them in Step 4 (Use Cases).
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Company Overview */}
        {(importSummary || project) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Company Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="overview-company">Company Name</Label>
                  <Input
                    id="overview-company"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      setOverviewDirty(true);
                    }}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overview-industry">Industry</Label>
                  <Input
                    id="overview-industry"
                    value={industry}
                    onChange={(e) => {
                      setIndustry(e.target.value);
                      setOverviewDirty(true);
                    }}
                    placeholder="Industry"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overview-description">Description</Label>
                <Textarea
                  id="overview-description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setOverviewDirty(true);
                  }}
                  placeholder="Brief description of the company and assessment context"
                  rows={3}
                />
              </div>

              {overviewDirty && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    variant="outline"
                  >
                    {saveMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-end pb-8">
          <Button
            onClick={() => navigate(`/project/${id}/themes`)}
            disabled={!importSummary}
            size="lg"
            className="text-white"
            style={{
              background: importSummary
                ? "linear-gradient(135deg, #001278, #02a2fd)"
                : undefined,
            }}
          >
            Next: Strategic Themes
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
