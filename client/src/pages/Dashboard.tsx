import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useProjectId, useCustomerContext, useNavPath } from "@/lib/customerContext";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  computeWorkflowMetrics,
  aggregateEnrichedSystemsSummary,
} from "@/lib/workflow-metrics";
import { SystemsHeatMap } from "@/components/dashboard/SystemsHeatMap";
// PDF loaded dynamically to keep it out of main bundle
// import { generatePDFBlob } from "@/components/pdf/PDFReport";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Download,
  FileJson,
  FileText,
  Share2,
  Copy,
  Check,
  Clock,
  DollarSign,
  Zap,
  BarChart3,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import type { WorkflowMap } from "@shared/types";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const projectId = useProjectId();
  const { isCustomerMode } = useCustomerContext();
  const navPath = useNavPath();
  const [, navigate] = useLocation();
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [jsonLoading, setJsonLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // Customer edit link state
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [customerLink, setCustomerLink] = useState<string | null>(null);
  const [customerLinkLoading, setCustomerLinkLoading] = useState(false);
  const [customerLinkCopied, setCustomerLinkCopied] = useState(false);

  // Load project data
  const { data: project, isLoading } = useQuery<any>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  const scenario = project?.activeScenario;
  const workflowMaps: WorkflowMap[] = scenario?.workflowMaps || [];
  const companyName = project?.companyName || "Company";

  // Compute per-use-case rows from workflow data
  const rows = useMemo(() => {
    return workflowMaps.map(computeWorkflowMetrics);
  }, [workflowMaps]);

  // Aggregate totals
  const totals = useMemo(() => {
    const totalHoursSaved = rows.reduce((s, r) => s + r.hoursSaved, 0);
    const totalCostSaved = rows.reduce((s, r) => s + r.costSaved, 0);
    const avgAutomation =
      rows.length > 0
        ? rows.reduce((s, r) => s + r.automationPct, 0) / rows.length
        : 0;
    const useCaseCount = rows.length;
    return { totalHoursSaved, totalCostSaved, avgAutomation, useCaseCount };
  }, [rows]);

  // Cross-use-case systems/data/integrations aggregation (enriched)
  const enrichedSummary = useMemo(() => {
    return aggregateEnrichedSystemsSummary(workflowMaps);
  }, [workflowMaps]);

  // -----------------------------------------------------------------------
  // Export handlers
  // -----------------------------------------------------------------------

  async function handleDownloadPDF() {
    if (!scenario) return;
    setPdfLoading(true);
    try {
      const { generatePDFBlob } = await import("@/components/pdf/PDFReport");
      const blob = await generatePDFBlob({
        companyName,
        generatedAt: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        useCases: scenario.useCases || [],
        benefits: scenario.benefits || [],
        readiness: scenario.readiness || [],
        priorities: scenario.priorities || [],
        workflowMaps: scenario.workflowMaps || [],
        strategicThemes: scenario.strategicThemes || [],
        frictionPoints: scenario.frictionPoints || [],
        executiveDashboard: scenario.executiveDashboard || {},
        assessment: (scenario as any).assessment || null,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_AI_Workflow.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded");
    } catch (err: any) {
      console.error("PDF error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleExportHTML() {
    if (!projectId) return;
    if (!scenario?.id) {
      toast.error("No active scenario to export. Generate workflows first.");
      return;
    }
    setHtmlLoading(true);
    try {
      const res = await apiRequest(
        "POST",
        `/api/projects/${projectId}/export/html`,
        { scenarioId: scenario.id },
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_AI_Workflow_Report.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("HTML report downloaded");
    } catch (err: any) {
      console.error("HTML export error:", err);
      toast.error("Failed to export HTML");
    } finally {
      setHtmlLoading(false);
    }
  }

  async function handleExportJSON() {
    if (!projectId) return;
    setJsonLoading(true);
    try {
      const res = await apiRequest(
        "POST",
        `/api/projects/${projectId}/export/json`,
        { scenarioId: scenario?.id },
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${companyName.replace(/[^a-zA-Z0-9]/g, "_")}_AI_Workflow_Export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON exported");
    } catch (err: any) {
      console.error("JSON export error:", err);
      toast.error("Failed to export JSON");
    } finally {
      setJsonLoading(false);
    }
  }

  async function handleCreateShareLink() {
    if (!projectId) return;
    if (!scenario?.id) {
      toast.error("No active scenario to share. Generate workflows first.");
      return;
    }
    setShareLoading(true);
    try {
      const res = await apiRequest(
        "POST",
        `/api/projects/${projectId}/share`,
        { scenarioId: scenario.id },
      );
      const data = await res.json();
      const url = `${window.location.origin}/shared/${data.shareCode}`;
      setShareLink(url);
      toast.success("Share link created");
    } catch (err: any) {
      console.error("Share error:", err);
      toast.error("Failed to create share link");
    } finally {
      setShareLoading(false);
    }
  }

  function handleCopyLink() {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCreateCustomerLink() {
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    setCustomerLinkLoading(true);
    try {
      const res = await apiRequest("POST", `/api/projects/${projectId}/customer-link`, {
        customerName: customerName.trim(),
        password: customerPassword || undefined,
      });
      const data = await res.json();
      const url = `${window.location.origin}${data.url}`;
      setCustomerLink(url);
      toast.success("Customer edit link created");
    } catch (err: any) {
      console.error("Customer link error:", err);
      toast.error("Failed to create customer link");
    } finally {
      setCustomerLinkLoading(false);
    }
  }

  function handleCopyCustomerLink() {
    if (!customerLink) return;
    navigator.clipboard.writeText(customerLink);
    setCustomerLinkCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCustomerLinkCopied(false), 2000);
  }

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (isLoading) {
    return (
      <Layout projectId={projectId} companyName="" activeTab="dashboard">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#02a2fd]" />
        </div>
      </Layout>
    );
  }

  if (!project || !scenario) {
    return (
      <Layout projectId={projectId} companyName="" activeTab="dashboard">
        <div className="text-center py-20">
          <p className="text-muted-foreground">
            No project data found. Import data first, then generate workflows in the Workshop.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate(navPath(`/project/${projectId}`))}
          >
            Go to Setup
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout projectId={projectId} companyName={companyName} activeTab="dashboard">
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dashboard & Benefits
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated benefits across all use cases with generated workflows
          </p>
        </div>

        {/* Aggregate Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Hours Saved
              </CardTitle>
              <Clock className="h-4 w-4 text-[#02a2fd]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatNumber(Math.round(totals.totalHoursSaved))}
              </div>
              <p className="text-xs text-muted-foreground">
                hours per workflow cycle
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cost Saved
              </CardTitle>
              <DollarSign className="h-4 w-4 text-[#36bf78]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(totals.totalCostSaved)}
              </div>
              <p className="text-xs text-muted-foreground">
                annual savings from workflows
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Automation
              </CardTitle>
              <Zap className="h-4 w-4 text-[#f59e0b]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {totals.avgAutomation.toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">
                AI-enabled steps across workflows
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Use Cases with Workflows
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-[#001278]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {totals.useCaseCount}
              </div>
              <p className="text-xs text-muted-foreground">
                of {(scenario.useCases || []).length} total use cases
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Per-Use-Case Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Per-Use-Case Benefits Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">
                  No workflows generated yet. Go to the Workshop to generate
                  workflows for your use cases.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => navigate(navPath(`/project/${projectId}/workshop`))}
                >
                  Go to Workshop
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                        Use Case
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-muted-foreground">
                        Current Hours
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-muted-foreground">
                        Target Hours
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-muted-foreground">
                        Hours Saved
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-muted-foreground">
                        Cost Saved
                      </th>
                      <th className="text-right py-3 px-3 font-medium text-muted-foreground">
                        Automation %
                      </th>
                      <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={row.useCaseId}
                        className={`border-b border-border/50 ${
                          i % 2 === 1 ? "bg-muted/20" : ""
                        }`}
                      >
                        <td className="py-3 px-3 font-medium text-foreground max-w-[280px] truncate">
                          {row.useCaseName}
                        </td>
                        <td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
                          {Math.round(row.currentHours).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
                          {Math.round(row.targetHours).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-[#36bf78] tabular-nums">
                          {Math.round(row.hoursSaved).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-[#36bf78] tabular-nums">
                          {formatCurrency(row.costSaved)}
                        </td>
                        <td className="py-3 px-3 text-right tabular-nums">
                          {row.automationPct.toFixed(0)}%
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.status === "High Impact"
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : row.status === "Medium Impact"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Total Row */}
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                      <td className="py-3 px-3 text-foreground">Total</td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {Math.round(rows.reduce((s, r) => s + r.currentHours, 0)).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {Math.round(rows.reduce((s, r) => s + r.targetHours, 0)).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-[#36bf78] tabular-nums">
                        {Math.round(totals.totalHoursSaved).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right text-[#36bf78] tabular-nums">
                        {formatCurrency(totals.totalCostSaved)}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
                        {totals.avgAutomation.toFixed(0)}%
                      </td>
                      <td className="py-3 px-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Systems, Data & Integrations — Heat Map + Insights */}
        {enrichedSummary.enrichedSystems.length > 0 && (
          <SystemsHeatMap summary={enrichedSummary} variant="dashboard" />
        )}

        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Export & Share</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="bg-[#001278] hover:bg-[#001278]/90"
              >
                <Download className="w-4 h-4 mr-2" />
                {pdfLoading ? "Generating..." : "Download PDF"}
              </Button>

              {!isCustomerMode && (
                <>
                  <Button
                    onClick={handleCreateShareLink}
                    disabled={shareLoading}
                    variant="outline"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    {shareLoading ? "Creating..." : "Create Share Link"}
                  </Button>

                  <Button
                    onClick={() => {
                      setCustomerName("");
                      setCustomerPassword("");
                      setCustomerLink(null);
                      setShowCustomerDialog(true);
                    }}
                    variant="outline"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Customer Edit Link
                  </Button>

                  <Button
                    onClick={handleExportHTML}
                    disabled={htmlLoading}
                    variant="outline"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {htmlLoading ? "Exporting..." : "Export HTML"}
                  </Button>

                  <Button
                    onClick={handleExportJSON}
                    disabled={jsonLoading}
                    variant="outline"
                  >
                    <FileJson className="w-4 h-4 mr-2" />
                    {jsonLoading ? "Exporting..." : "Export JSON"}
                  </Button>
                </>
              )}
            </div>

            {shareLink && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground truncate">
                  {shareLink}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-start pb-6">
          <Button
            variant="outline"
            onClick={() => navigate(navPath(`/project/${projectId}/review`))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Review
          </Button>
        </div>
      </div>

      {/* Customer Edit Link Dialog */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Customer Edit Link</DialogTitle>
            <DialogDescription>
              Generate a link that allows your customer to view and edit their workshop data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                placeholder="e.g., Mativ"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-password">Password (optional)</Label>
              <Input
                id="customer-password"
                type="text"
                placeholder="Leave blank for open access"
                value={customerPassword}
                onChange={(e) => setCustomerPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                If set, customers must enter this password to access the link.
              </p>
            </div>

            {!customerLink ? (
              <Button
                onClick={handleCreateCustomerLink}
                disabled={customerLinkLoading || !customerName.trim()}
                className="w-full bg-[#02a2fd] hover:bg-[#0291e3]"
              >
                {customerLinkLoading ? "Generating..." : "Generate Link"}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground truncate">
                    {customerLink}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCustomerLink}
                  >
                    {customerLinkCopied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {customerPassword && (
                  <p className="text-xs text-muted-foreground">
                    Password: <span className="font-mono font-medium text-foreground">{customerPassword}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
