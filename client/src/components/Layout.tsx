import { ReactNode } from "react";
import { useLocation } from "wouter";
import ThemeToggle from "./ThemeToggle";
import StepperNav, { getStepFromPath } from "./StepperNav";
import { ArrowLeft, Home } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  projectId?: string;
  companyName?: string;
  completedSteps?: number[];
  showStepper?: boolean;
}

export default function Layout({
  children,
  projectId,
  companyName,
  completedSteps,
  showStepper = true,
}: LayoutProps) {
  const [location, navigate] = useLocation();
  const currentStep = getStepFromPath(location);

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
    </div>
  );
}
