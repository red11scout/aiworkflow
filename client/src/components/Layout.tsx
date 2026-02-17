import { ReactNode } from "react";
import { useLocation } from "wouter";
import ThemeToggle from "./ThemeToggle";
import StepperNav, { getStepFromPath } from "./StepperNav";
import AIAssistant from "./AIAssistant";
import { Home } from "lucide-react";

const STEP_SECTIONS = [
  "upload", "themes", "functions", "friction",
  "usecases", "benefits", "workflows", "readiness", "matrix", "dashboard",
];

const STEP_PROMPTS: Record<string, string[]> = {
  themes: [
    "Help me improve this target state description",
    "Suggest a secondary driver for this theme",
    "Validate the strategic alignment of these themes",
  ],
  functions: [
    "Suggest a realistic target for this KPI",
    "Help me describe this business function better",
  ],
  friction: [
    "Help describe this friction point",
    "Suggest severity assessment rationale",
  ],
  usecases: [
    "Recommend the best agentic pattern for this use case",
    "Improve this use case description",
    "Explain why this AI primitive is relevant",
  ],
  benefits: [
    "Validate these financial assumptions",
    "Explain the benefit calculation methodology",
  ],
  workflows: [
    "Suggest improvements to this workflow",
    "Explain what changes AI introduces to this process",
  ],
  readiness: [
    "Help assess data readiness for this use case",
    "Suggest ways to improve organizational readiness",
  ],
  matrix: [
    "Explain the prioritization methodology",
    "Recommend which use cases to implement first",
  ],
  dashboard: [
    "Write an executive summary of these findings",
    "Suggest key recommendations based on this analysis",
  ],
};

interface LayoutProps {
  children: ReactNode;
  projectId?: string;
  companyName?: string;
  completedSteps?: number[];
  showStepper?: boolean;
  aiContext?: any;
}

export default function Layout({
  children,
  projectId,
  companyName,
  completedSteps,
  showStepper = true,
  aiContext,
}: LayoutProps) {
  const [location, navigate] = useLocation();
  const currentStep = getStepFromPath(location);
  const currentSection = STEP_SECTIONS[currentStep] || "general";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                style={{
                  background: "linear-gradient(135deg, #001278, #02a2fd)",
                }}
              >
                BA
              </div>
              <span className="font-semibold text-foreground hidden sm:inline">
                AI Workflow
              </span>
            </button>

            {companyName && (
              <>
                <span className="text-border">/</span>
                <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                  {companyName}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {projectId && (
              <button
                onClick={() => navigate("/")}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                title="Back to projects"
              >
                <Home className="w-4 h-4" />
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Stepper Navigation */}
      {showStepper && projectId && (
        <StepperNav
          projectId={projectId}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      {/* AI Assistant - shown on project pages */}
      {projectId && showStepper && (
        <AIAssistant
          section={currentSection}
          context={aiContext || { companyName, step: currentSection }}
          suggestedPrompts={STEP_PROMPTS[currentSection] || []}
        />
      )}
    </div>
  );
}
