import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getOwnerToken } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import Layout from "@/components/Layout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  FolderOpen,
  Building2,
  Calendar,
  Brain,
  DollarSign,
  Loader2,
  Sparkles,
} from "lucide-react";

interface Project {
  id: number;
  name: string;
  companyName: string;
  industry: string;
  description?: string;
  status: string;
  createdAt: string;
  useCaseCount?: number;
  totalValue?: number;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  completed: "Completed",
};

export default function Home() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formIndustry, setFormIndustry] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // Fetch projects
  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Create project
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/projects", {
        name: formName || formCompany,
        companyName: formCompany,
        industry: formIndustry,
        description: formDescription,
      });
      return res.json();
    },
    onSuccess: (data: Project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setDialogOpen(false);
      resetForm();
      navigate(`/project/${data.id}/upload`);
    },
  });

  // Delete project
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setDeleteConfirmId(null);
    },
  });

  function resetForm() {
    setFormName("");
    setFormCompany("");
    setFormIndustry("");
    setFormDescription("");
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formCompany.trim()) return;
    createMutation.mutate();
  }

  return (
    <Layout showStepper={false}>
      {/* Hero Section */}
      <div className="text-center py-16">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/80 border border-border/50 text-xs font-medium text-muted-foreground mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#02a2fd]" />
          Powered by Claude AI
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          <span className="text-gradient">AI Workflow Orchestration</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Transform AI assessments into actionable implementation plans. Upload
          your data, analyze strategic themes, map use cases, and generate
          prioritized workflows.
        </p>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="lg"
              className="text-white shadow-lg hover:shadow-xl transition-all"
              style={{
                background: "linear-gradient(135deg, #001278, #02a2fd)",
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              New Project
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Set up a new AI workflow project. You can upload assessment data
                in the next step.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Corporation"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  placeholder="Q1 AI Assessment (optional)"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  placeholder="Technology, Healthcare, Finance..."
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief project description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!formCompany.trim() || createMutation.isPending}
                  style={{
                    background: "linear-gradient(135deg, #001278, #02a2fd)",
                  }}
                  className="text-white"
                >
                  {createMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Project
                </Button>
              </div>

              {createMutation.isError && (
                <p className="text-sm text-destructive">
                  {(createMutation.error as Error).message}
                </p>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-destructive">
            Failed to load projects. Please try again.
          </p>
        </div>
      ) : projects.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mb-6">
            <Sparkles className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No projects yet
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Get started by creating your first AI workflow project. Upload your
            assessment data and let the platform guide you through strategic
            analysis.
          </p>
          <Button
            onClick={() => setDialogOpen(true)}
            style={{
              background: "linear-gradient(135deg, #001278, #02a2fd)",
            }}
            className="text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Project
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              Your Projects
            </h2>
            <span className="text-sm text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group cursor-pointer hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 relative rounded-xl"
                onClick={() =>
                  navigate(`/project/${project.id}/upload`)
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 pr-2">
                      <CardTitle className="text-base truncate">
                        {project.companyName || project.name}
                      </CardTitle>
                      {project.companyName && project.name !== project.companyName && (
                        <CardDescription className="truncate mt-1">
                          {project.name}
                        </CardDescription>
                      )}
                    </div>
                    <Badge
                      className={
                        STATUS_STYLES[project.status] || STATUS_STYLES.draft
                      }
                      variant="outline"
                    >
                      {STATUS_LABELS[project.status] || project.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Industry */}
                    {project.industry && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{project.industry}</span>
                      </div>
                    )}

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-sm">
                      {typeof project.useCaseCount === "number" && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Brain className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {project.useCaseCount} use case
                            {project.useCaseCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {typeof project.totalValue === "number" &&
                        project.totalValue > 0 && (
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <DollarSign className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatCurrency(project.totalValue)}</span>
                          </div>
                        )}
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t border-border">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>
                        {new Date(project.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    {deleteConfirmId === project.id ? (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => deleteMutation.mutate(project.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Delete"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(project.id);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
