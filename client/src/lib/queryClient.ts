import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { ApiError } from "./errors";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    throw new ApiError(res);
  }
}

export async function apiRequest(
  url: string,
  options?: RequestInit,
): Promise<any> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        try {
          return await apiRequest(queryKey[0] as string);
        } catch (error) {
          if (error instanceof ApiError && error.response.status === 401) {
            return null;
          }
          throw error;
        }
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.response.status === 401) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
