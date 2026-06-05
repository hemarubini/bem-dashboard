import { QueryClient } from "@tanstack/react-query";
import { REFRESH_INTERVAL_MS } from "@/config/constants";
import { structuralMerge } from "./mergeData";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 0,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      structuralSharing: (oldData, newData) =>
        structuralMerge(oldData, newData),
    },
  },
});
