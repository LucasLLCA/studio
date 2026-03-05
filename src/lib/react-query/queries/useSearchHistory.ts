'use client';

import { useQuery, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { getSearchHistory, deleteSearchHistory, saveSearchHistory, type HistoryItem, type SaveHistoryRequest } from '@/lib/history-api-client';
import { queryKeys } from '../keys';
import type { ApiError } from '@/types/process-flow';

interface UseSearchHistoryOptions {
  usuario: string;
  limit?: number;
  enabled?: boolean;
}

/**
 * React Query hook for search history with caching.
 * Stale time: 5 minutes. Cache time: 30 minutes.
 */
export function useSearchHistory({
  usuario,
  limit = 20,
  enabled = true,
}: UseSearchHistoryOptions): UseQueryResult<HistoryItem[], Error> & {
  deleteItem: (id: string) => Promise<void>;
  saveItem: (data: SaveHistoryRequest) => Promise<void>;
} {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.searchHistory.byUser(usuario);

  const query = useQuery<HistoryItem[], Error>({
    queryKey,
    queryFn: async () => {
      const result = await getSearchHistory(usuario, limit);
      if ('error' in result) {
        throw new Error((result as ApiError).error);
      }
      return result as HistoryItem[];
    },
    enabled: enabled && !!usuario,
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 30 * 60 * 1000,         // 30 minutes
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteSearchHistory(id);
      if ('error' in result) throw new Error(result.error);
    },
    onMutate: async (id: string) => {
      // Optimistic update — remove item immediately
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<HistoryItem[]>(queryKey);
      queryClient.setQueryData<HistoryItem[]>(queryKey, (old) =>
        old?.filter((h) => h.id !== id) ?? []
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: SaveHistoryRequest) => {
      const result = await saveSearchHistory(data);
      if ('error' in result) throw new Error(result.error);
    },
    onSuccess: () => {
      // Invalidate cache so next visit to home shows updated history
      queryClient.invalidateQueries({ queryKey: queryKeys.searchHistory.all });
    },
  });

  return {
    ...query,
    deleteItem: async (id: string) => { await deleteMutation.mutateAsync(id); },
    saveItem: async (data: SaveHistoryRequest) => { await saveMutation.mutateAsync(data); },
  };
}
