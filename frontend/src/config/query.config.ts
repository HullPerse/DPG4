export const QueryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount: number) => failureCount < 2,
      networkMode: "offlineFirst" as const,
    },
    mutations: {
      networkMode: "offlineFirst" as const,
    },
  },
};
