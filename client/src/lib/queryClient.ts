import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  timeoutMs?: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = timeoutMs || (url.includes("/api/ai/") ? 300000 : 30000);
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const headers: Record<string, string> = {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...(_customerToken
        ? { "x-customer-token": _customerToken }
        : { "x-owner-token": getOwnerToken() }),
    };

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    await throwIfResNotOk(res);
    return res;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  }
}

export function getOwnerToken(): string {
  let token = localStorage.getItem("owner_token");
  if (!token) {
    token = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("owner_token", token);
  }
  return token;
}

// Customer edit mode — module-level token that overrides owner token in requests
let _customerToken: string | null = null;

export function setCustomerToken(token: string | null): void {
  _customerToken = token;
}

export function getCustomerToken(): string | null {
  return _customerToken;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: _customerToken
        ? { "x-customer-token": _customerToken }
        : { "x-owner-token": getOwnerToken() },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
