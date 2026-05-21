export const QueryConfig = {
  defaultOptions: {
    queries: {
      // staleTime: 5 * 60 * 1000,
      staleTime: 5, //5 seconds
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
