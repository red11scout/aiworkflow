import { ReactNode } from "react";
import { useLocation } from "wouter";
import ThemeToggle from "./ThemeToggle";
import { Home } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  projectId?: string;
  companyName?: string;
  activeTab?: "setup" | "assess" | "workshop" | "review" | "dashboard";
}

export default function Layout({
  children,
  projectId,
  companyName,
  activeTab,
}: LayoutProps) {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="glass-header bg-card/80 border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <img
                src="/blueally-logo.png"
                alt="BlueAlly"
                className="h-7 w-auto dark:hidden"
              />
              <img
                src="/blueally-logo-white.png"
                alt="BlueAlly"
                className="h-7 w-auto hidden dark:block"
              />
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

      {/* Tab Navigation — only show within a project */}
      {projectId && activeTab && (
        <nav className="bg-card/50 border-b border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-1">
            {[
              { key: "setup" as const, label: "Setup", path: `/project/${projectId}` },
              { key: "assess" as const, label: "Assess", path: `/project/${projectId}/assessment` },
              { key: "workshop" as const, label: "Workshop", path: `/project/${projectId}/workshop` },
              { key: "review" as const, label: "Review", path: `/project/${projectId}/review` },
              { key: "dashboard" as const, label: "Dashboard", path: `/project/${projectId}/dashboard` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-[#02a2fd] text-[#02a2fd]"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
