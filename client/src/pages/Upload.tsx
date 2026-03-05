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
import { Badge } from "@/components/ui/badge";
import {
  Upload as UploadIcon,
  FileJson,
  CheckCircle2,
  FileUp,
  Loader2,
  ArrowRight,
  Trash2,
  Plus,
  Building2,
  Briefcase,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { UseCase } from "@shared/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectResponse {
  id: string;
  name: string;
  companyName: string;
  industry: string;
  description?: string;
  status: string;
  activeScenario?: ScenarioData;
  scenarios?: ScenarioData[];
}

interface ScenarioData {
  id: string;
  projectId: string;
  name: string;
  isActive: boolean;
  useCases: UseCase[] | null;
  workflowMaps: any[] | null;
  completedSteps: number[];
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function Upload() {
  const { projectId } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  // Project info editing
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [description, setDescription] = useState("");
  const [infoDirty, setInfoDirty] = useState(false);

  // Manual use case form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUcName, setNewUcName] = useState("");
  const [newUcDescription, setNewUcDescription] = useState("");
  const [newUcFunction, setNewUcFunction] = useState("");

  // Fetch project (includes activeScenario)
  const { data: project, isLoading } = useQuery<ProjectResponse>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Populate fields from project on first load
  const initialized = useRef(false);
  if (project && !initialized.current) {
    initialized.current = true;
    setCompanyName(project.companyName || "");
    setIndustry(project.industry || "");
    setDescription(project.description || "");
  }

  const scenario = project?.activeScenario;
  const useCases: UseCase[] = (scenario?.useCases as UseCase[]) || [];

  // -----------------------------------------------------------------------
  // Mutations
  // -----------------------------------------------------------------------

  // Import JSON
  const importMutation = useMutation({
    mutationFn: async (rawJson: unknown) => {
      const res = await apiRequest("POST", `/api/projects/${projectId}/import`, {
        rawJson,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      if (data.companyName) setCompanyName(data.companyName);
      if (data.industry) setIndustry(data.industry);
      toast.success(
        `Imported ${data.summary?.useCases ?? 0} use cases successfully`,
      );
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });

  // Update project info
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", `/api/projects/${projectId}`, {
        companyName,
        industry,
        description,
      });
      return res.json();
    },
    onSuccess: () => {
      setInfoDirty(false);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast.success("Project info saved");
    },
    onError: (error: Error) => {
      toast.error(`Save failed: ${error.message}`);
    },
  });

  // Add manual use case
  const addUseCaseMutation = useMutation({
    mutationFn: async () => {
      if (!scenario) throw new Error("No active scenario");
      const newUc: UseCase = {
        id: `uc-${Date.now()}`,
        name: newUcName.trim(),
        description: newUcDescription.trim(),
        function: newUcFunction.trim(),
        subFunction: "",
        aiPrimitives: [],
        hitlCheckpoint: "",
        targetFriction: "",
        strategicTheme: "",
      };
      const updated = [...useCases, newUc];
      const res = await apiRequest(
        "PUT",
        `/api/scenarios/${scenario.id}/section/use_cases`,
        { data: updated },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      setNewUcName("");
      setNewUcDescription("");
      setNewUcFunction("");
      setShowAddForm(false);
      toast.success("Use case added");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add use case: ${error.message}`);
    },
  });

  // Delete use case
  const deleteUseCaseMutation = useMutation({
    mutationFn: async (ucId: string) => {
      if (!scenario) throw new Error("No active scenario");
      const updated = useCases.filter((uc) => uc.id !== ucId);
      const res = await apiRequest(
        "PUT",
        `/api/scenarios/${scenario.id}/section/use_cases`,
        { data: updated },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
      toast.success("Use case removed");
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // -----------------------------------------------------------------------
  // File handlers
  // -----------------------------------------------------------------------

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
        toast.error("Invalid JSON file");
      }
    },
    [importMutation],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
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
    [handleFile],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <Layout projectId={projectId} activeTab="setup">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      projectId={projectId}
      companyName={companyName || project?.companyName}
      activeTab="setup"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Setup</h1>
          <p className="text-muted-foreground mt-1">
            Configure your project and import use cases. Everything starts here.
          </p>
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#02a2fd]" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setInfoDirty(true);
                  }}
                  placeholder="Acme Corporation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => {
                    setIndustry(e.target.value);
                    setInfoDirty(true);
                  }}
                  placeholder="Technology, Healthcare, Retail..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setInfoDirty(true);
                }}
                placeholder="Brief context for this engagement"
                rows={3}
              />
            </div>
            {infoDirty && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => updateProjectMutation.mutate()}
                  disabled={updateProjectMutation.isPending}
                >
                  {updateProjectMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileJson className="w-5 h-5 text-[#36bf78]" />
              Import Assessment Data
            </CardTitle>
          </CardHeader>
          <CardContent>
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

              <div className="flex flex-col items-center justify-center py-12 px-6">
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-10 h-10 text-[#02a2fd] animate-spin mb-3" />
                    <p className="text-sm font-medium text-foreground">
                      Importing data...
                    </p>
                  </>
                ) : uploadedFile ? (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-[#36bf78]/10 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-6 h-6 text-[#36bf78]" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Data imported
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <FileJson className="w-3.5 h-3.5" />
                      <span>{uploadedFile}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Drop a new file to re-import
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                      <FileUp className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Drop your JSON here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 max-w-sm text-center">
                      Upload the JSON export from discover.movefasterwithai.com
                      to populate use cases and assessment data.
                    </p>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Use Case List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Use Cases
              {useCases.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({useCases.length})
                </span>
              )}
            </h2>
          </div>

          {useCases.length === 0 && !showAddForm ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No use cases yet. Import a JSON file or add them manually.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Use Case
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {useCases.map((uc) => (
                <Card key={uc.id} className="group">
                  <CardContent className="py-4 px-5 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {uc.name}
                        </h3>
                        {uc.function && (
                          <Badge
                            variant="outline"
                            className="text-xs shrink-0 font-normal"
                          >
                            <Briefcase className="w-3 h-3 mr-1" />
                            {uc.function}
                          </Badge>
                        )}
                      </div>
                      {uc.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {uc.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteUseCaseMutation.mutate(uc.id)}
                      disabled={deleteUseCaseMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Inline Add Form */}
              {showAddForm ? (
                <Card className="border-[#02a2fd]/30">
                  <CardContent className="py-4 px-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">
                        New Use Case
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => {
                          setShowAddForm(false);
                          setNewUcName("");
                          setNewUcDescription("");
                          setNewUcFunction("");
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="uc-name" className="text-xs">
                          Name *
                        </Label>
                        <Input
                          id="uc-name"
                          value={newUcName}
                          onChange={(e) => setNewUcName(e.target.value)}
                          placeholder="AI-Powered Document Review"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="uc-function" className="text-xs">
                          Business Function
                        </Label>
                        <Input
                          id="uc-function"
                          value={newUcFunction}
                          onChange={(e) => setNewUcFunction(e.target.value)}
                          placeholder="Operations, Finance..."
                          className="h-9 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="uc-desc" className="text-xs">
                        Description
                      </Label>
                      <Textarea
                        id="uc-desc"
                        value={newUcDescription}
                        onChange={(e) => setNewUcDescription(e.target.value)}
                        placeholder="What does this use case accomplish?"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => addUseCaseMutation.mutate()}
                        disabled={
                          !newUcName.trim() || addUseCaseMutation.isPending
                        }
                        className="gap-1.5 text-white"
                        style={{
                          background: "linear-gradient(135deg, #001278, #02a2fd)",
                        }}
                      >
                        {addUseCaseMutation.isPending && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowAddForm(true)}
                  className="w-full gap-2 border-dashed text-muted-foreground hover:text-foreground"
                >
                  <Plus className="w-4 h-4" />
                  Add Use Case
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Start Workshop Button */}
        <div className="flex justify-end pb-8">
          <Button
            size="lg"
            onClick={() => navigate(`/project/${projectId}/workshop`)}
            disabled={useCases.length === 0}
            className="gap-2 text-white"
            style={{
              background:
                useCases.length > 0
                  ? "linear-gradient(135deg, #001278, #02a2fd)"
                  : undefined,
            }}
          >
            Start Workshop
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Layout>
  );
}
