import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Upload,
  Target,
  BarChart3,
  AlertTriangle,
  Brain,
  DollarSign,
  GitBranch,
  Gauge,
  Grid3X3,
  LayoutDashboard,
  Check,
} from "lucide-react";

const STEPS = [
  { path: "upload", label: "Upload", shortLabel: "Upload", icon: Upload, step: 0 },
  { path: "themes", label: "Strategic Themes", shortLabel: "Themes", icon: Target, step: 1 },
  { path: "functions", label: "Business Functions", shortLabel: "Functions", icon: BarChart3, step: 2 },
  { path: "friction", label: "Friction Mapping", shortLabel: "Friction", icon: AlertTriangle, step: 3 },
  { path: "usecases", label: "AI Use Cases", shortLabel: "Use Cases", icon: Brain, step: 4 },
  { path: "benefits", label: "Benefits", shortLabel: "Benefits", icon: DollarSign, step: 5 },
  { path: "workflows", label: "Workflows", shortLabel: "Workflows", icon: GitBranch, step: 6 },
  { path: "readiness", label: "Readiness", shortLabel: "Readiness", icon: Gauge, step: 7 },
  { path: "matrix", label: "Value Matrix", shortLabel: "Matrix", icon: Grid3X3, step: 8 },
  { path: "dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: LayoutDashboard, step: 9 },
];

interface StepperNavProps {
  projectId: string;
  currentStep: number;
  completedSteps?: number[];
}

export default function StepperNav({
  projectId,
  currentStep,
  completedSteps = [],
}: StepperNavProps) {
  const [, navigate] = useLocation();

  return (
    <nav className="bg-card border-b border-border overflow-x-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-1 py-2 min-w-max">
          {STEPS.map(({ path, label, shortLabel, icon: Icon, step }) => {
            const isActive = step === currentStep;
            const isCompleted = completedSteps.includes(step);

            return (
              <button
                key={path}
                onClick={() => navigate(`/project/${projectId}/${path}`)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : isCompleted
                      ? "bg-accent/10 text-accent hover:bg-accent/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {isCompleted && !isActive ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span className="hidden lg:inline">{label}</span>
                <span className="lg:hidden">{shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function getStepFromPath(path: string): number {
  const step = STEPS.find((s) => path.includes(s.path));
  return step?.step ?? 0;
}

export function getNextPath(currentStep: number): string | null {
  if (currentStep >= STEPS.length - 1) return null;
  return STEPS[currentStep + 1].path;
}

export function getPrevPath(currentStep: number): string | null {
  if (currentStep <= 0) return null;
  return STEPS[currentStep - 1].path;
}
