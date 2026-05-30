export const QueryConfig = {
  defaultOptions: {
    queries: {
      staleTime: 0,
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
