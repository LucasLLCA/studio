import { useQuery } from '@tanstack/react-query';
import { checkProcessoSalvo } from '@/lib/api/grupos-api-client';
import type { ProcessoSalvoCheck } from '@/types/teams';

interface UseProcessoSalvoOptions {
  usuario: string;
  numeroProcesso: string;
  enabled?: boolean;
}

export function useProcessoSalvo({ usuario, numeroProcesso, enabled = true }: UseProcessoSalvoOptions) {
  return useQuery<ProcessoSalvoCheck | null>({
    queryKey: ['processoSalvo', usuario, numeroProcesso],

    queryFn: async () => {
      const result = await checkProcessoSalvo(usuario, numeroProcesso);
      if ('error' in result) return null;
      return result;
    },

    enabled: enabled && !!usuario && !!numeroProcesso,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
