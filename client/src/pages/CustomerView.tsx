import { useEffect, useState, lazy, Suspense } from "react";
import { useParams } from "wouter";
import { CustomerProvider } from "@/lib/customerContext";
import { setCustomerToken } from "@/lib/queryClient";

const Upload = lazy(() => import("./Upload"));
const Assessment = lazy(() => import("./Assessment"));
const Workflows = lazy(() => import("./Workflows"));
const ReviewRefine = lazy(() => import("./ReviewRefine"));
const Dashboard = lazy(() => import("./Dashboard"));

interface ProjectData {
  project: { id: string; companyName: string; industry: string };
  activeScenario: { id: string } | null;
  scenarios: Array<{ id: string }>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#02a2fd]" />
    </div>
  );
}

const TAB_COMPONENTS: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  setup: Upload as any,
  assess: Assessment as any,
  workshop: Workflows as any,
  review: ReviewRefine as any,
  dashboard: Dashboard as any,
};

export default function CustomerView() {
  const { code, tab } = useParams<{ code: string; tab: string }>();
  const [data, setData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currentTab = tab || "review";

  useEffect(() => {
    const token = localStorage.getItem(`customer_token_${code}`);
    if (!token) {
      window.location.href = `/customer/${code}`;
      return;
    }

    // Set module-level token so apiRequest uses it
    setCustomerToken(token);

    const headers: Record<string, string> = { "x-customer-token": token };
    fetch(`/api/customer/${code}/project`, { headers })
      .then((res) => {
        if (res.status === 401) {
          // Token expired or invalid — redirect to entry
          localStorage.removeItem(`customer_token_${code}`);
          window.location.href = `/customer/${code}`;
          return null;
        }
        if (!res.ok) throw new Error("Failed to load project");
        return res.json();
      })
      .then((d) => {
        if (d) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Failed to load project data.");
        setLoading(false);
      });

    return () => {
      // Clear customer token when leaving customer view
      setCustomerToken(null);
    };
  }, [code]);

  if (loading) return <PageLoader />;

  if (error || !data?.project || !data?.activeScenario) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">{error || "Project not found"}</p>
      </div>
    );
  }

  const PageComponent = TAB_COMPONENTS[currentTab];
  if (!PageComponent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  return (
    <CustomerProvider
      code={code}
      projectId={data.project.id}
      scenarioId={data.activeScenario.id}
      customerToken={localStorage.getItem(`customer_token_${code}`)}
    >
      <Suspense fallback={<PageLoader />}>
        <PageComponent />
      </Suspense>
    </CustomerProvider>
  );
}
