import { useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Target, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface StrategicTheme {
  id: string;
  name: string;
  currentState: string;
  targetState: string;
  primaryDriverImpact: string;
  secondaryDriver: string;
}

export default function StrategicThemes() {
  const { projectId: id } = useParams<{ projectId: string }>();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const [themes, setThemes] = useState<StrategicTheme[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data: project } = useQuery({ queryKey: [`/api/projects/${id}`] });
  const { data: scenarios } = useQuery({
    queryKey: [`/api/projects/${id}/scenarios`],
  });
  const activeScenario = (scenarios as any[])?.find((s: any) => s.isActive);

  // Initialize local state from scenario data
  if (activeScenario?.strategicThemes && !initialized) {
    setThemes(activeScenario.strategicThemes);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: (data: StrategicTheme[]) =>
      apiRequest("PUT", `/api/scenarios/${activeScenario?.id}/section/strategic_themes`, { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${id}/scenarios`] });
      toast.success("Strategic themes saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate(themes);
  }, [themes, saveMutation]);

  const handleBlur = useCallback(() => {
    saveMutation.mutate(themes);
  }, [themes, saveMutation]);

  const addTheme = () => {
    const newTheme: StrategicTheme = {
      id: `theme_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: "",
      currentState: "",
      targetState: "",
      primaryDriverImpact: "",
      secondaryDriver: "",
    };
    setThemes((prev) => [...prev, newTheme]);
  };

  const deleteTheme = (themeId: string) => {
    setThemes((prev) => prev.filter((t) => t.id !== themeId));
    setDeleteConfirmId(null);
    // Auto-save after delete
    setTimeout(() => {
      saveMutation.mutate(themes.filter((t) => t.id !== themeId));
    }, 0);
  };

  const updateTheme = (themeId: string, field: keyof StrategicTheme, value: string) => {
    setThemes((prev) =>
      prev.map((t) => (t.id === themeId ? { ...t, [field]: value } : t))
    );
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
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Strategic Themes</h1>
            <p className="text-sm text-muted-foreground">
              Define the strategic themes driving your organization's AI transformation
            </p>
          </div>
          <Badge variant="secondary" className="ml-2">
            {themes.length} {themes.length === 1 ? "theme" : "themes"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={addTheme}>
            <Plus className="w-4 h-4" />
            Add Theme
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Theme Cards */}
      {themes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No strategic themes yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add strategic themes to define the key areas driving your AI transformation.
            </p>
            <Button onClick={addTheme}>
              <Plus className="w-4 h-4" />
              Add First Theme
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {themes.map((theme, index) => (
            <Card key={theme.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="font-mono text-xs"
                    >
                      {index + 1}
                    </Badge>
                    <CardTitle className="text-lg">
                      {theme.name || "Untitled Theme"}
                    </CardTitle>
                  </div>
                  {deleteConfirmId === theme.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Delete?</span>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteTheme(theme.id)}
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
                      onClick={() => setDeleteConfirmId(theme.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <Label htmlFor={`name-${theme.id}`}>Theme Name</Label>
                    <Input
                      id={`name-${theme.id}`}
                      value={theme.name}
                      onChange={(e) => updateTheme(theme.id, "name", e.target.value)}
                      onBlur={handleBlur}
                      placeholder="e.g., Digital Customer Experience"
                      className="mt-1"
                    />
                  </div>

                  {/* Current State */}
                  <div>
                    <Label htmlFor={`currentState-${theme.id}`}>Current State</Label>
                    <Textarea
                      id={`currentState-${theme.id}`}
                      value={theme.currentState}
                      onChange={(e) => updateTheme(theme.id, "currentState", e.target.value)}
                      onBlur={handleBlur}
                      placeholder="Describe the current state..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {/* Target State */}
                  <div>
                    <Label htmlFor={`targetState-${theme.id}`}>Target State</Label>
                    <Textarea
                      id={`targetState-${theme.id}`}
                      value={theme.targetState}
                      onChange={(e) => updateTheme(theme.id, "targetState", e.target.value)}
                      onBlur={handleBlur}
                      placeholder="Describe the desired target state..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  {/* Primary Driver Impact */}
                  <div>
                    <Label htmlFor={`primaryDriver-${theme.id}`}>Primary Driver / Impact</Label>
                    <Input
                      id={`primaryDriver-${theme.id}`}
                      value={theme.primaryDriverImpact}
                      onChange={(e) => updateTheme(theme.id, "primaryDriverImpact", e.target.value)}
                      onBlur={handleBlur}
                      placeholder="e.g., Revenue Growth, Cost Reduction"
                      className="mt-1"
                    />
                  </div>

                  {/* Secondary Driver */}
                  <div>
                    <Label htmlFor={`secondaryDriver-${theme.id}`}>Secondary Driver</Label>
                    <Input
                      id={`secondaryDriver-${theme.id}`}
                      value={theme.secondaryDriver}
                      onChange={(e) => updateTheme(theme.id, "secondaryDriver", e.target.value)}
                      onBlur={handleBlur}
                      placeholder="e.g., Customer Satisfaction, Efficiency"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={() => navigate(`/project/${id}/upload`)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <Button
          onClick={() => navigate(`/project/${id}/functions`)}
          style={{ background: "linear-gradient(135deg, #001278, #02a2fd)" }}
          className="text-white hover:opacity-90"
        >
          Next: Business Functions
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </Layout>
  );
}
