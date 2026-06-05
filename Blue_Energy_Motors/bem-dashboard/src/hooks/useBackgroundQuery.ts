import { useQuery } from "@tanstack/react-query";
import { useLastUpdated } from "@/context/LastUpdatedContext";

export interface UseBackgroundQueryOptions<T> {
  queryKey: readonly unknown[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
}

/**
 * Background polling via React Query (refetchInterval from queryClient defaults).
 * - isLoading: true only on first fetch or when filters change (new query key, no data yet)
 * - Background refetch keeps previous data visible; no loading overlays
 */
export function useBackgroundQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
}: UseBackgroundQueryOptions<T>) {
  const { markUpdated } = useLastUpdated();

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await queryFn();
      markUpdated();
      return result;
    },
    enabled,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : "Query failed"
      : null,
    refresh: () => void query.refetch(),
  };
}
