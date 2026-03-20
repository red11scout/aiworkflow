import { createContext, useContext, type ReactNode } from "react";
import { useParams } from "wouter";

interface CustomerContextValue {
  isCustomerMode: boolean;
  customerToken: string | null;
  code: string;
  projectId: string;
  scenarioId: string;
  navPrefix: string;
}

const CustomerContext = createContext<CustomerContextValue>({
  isCustomerMode: false,
  customerToken: null,
  code: "",
  projectId: "",
  scenarioId: "",
  navPrefix: "",
});

export function CustomerProvider({
  children,
  code,
  projectId,
  scenarioId,
  customerToken,
}: {
  children: ReactNode;
  code: string;
  projectId: string;
  scenarioId: string;
  customerToken: string | null;
}) {
  return (
    <CustomerContext.Provider
      value={{
        isCustomerMode: true,
        customerToken,
        code,
        projectId,
        scenarioId,
        navPrefix: `/customer/${code}`,
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomerContext(): CustomerContextValue {
  return useContext(CustomerContext);
}

/**
 * Returns projectId from customer context (if in customer mode) or from URL params.
 * Use this in step pages instead of useParams directly.
 */
export function useProjectId(): string {
  const { isCustomerMode, projectId: ctxProjectId } = useCustomerContext();
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  return isCustomerMode ? ctxProjectId : paramProjectId;
}

/**
 * Returns a function that maps admin paths to customer paths when in customer mode.
 * Usage: const navPath = useNavPath();
 *        navigate(navPath(`/project/${projectId}/review`))
 */
export function useNavPath(): (adminPath: string) => string {
  const { isCustomerMode, navPrefix, projectId } = useCustomerContext();

  return (adminPath: string) => {
    if (!isCustomerMode) return adminPath;

    // Map /project/:projectId paths to /customer/:code paths
    const projectPrefix = `/project/${projectId}`;
    if (adminPath === projectPrefix) return `${navPrefix}/setup`;
    if (adminPath.startsWith(`${projectPrefix}/`)) {
      const tab = adminPath.slice(projectPrefix.length + 1);
      // Map "assessment" → "assess" for the customer URL
      const tabMap: Record<string, string> = {
        assessment: "assess",
      };
      return `${navPrefix}/${tabMap[tab] || tab}`;
    }
    return adminPath;
  };
}
