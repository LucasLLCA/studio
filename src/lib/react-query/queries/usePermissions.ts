import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { fetchPermissions, type PermissionsResponse } from "@/lib/api/permissions-api-client";

export function usePermissionsQuery(idPessoa: number | null) {
  return useQuery<PermissionsResponse>({
    queryKey: queryKeys.permissions.byUser(idPessoa ?? 0),
    queryFn: async () => {
      if (!idPessoa) throw new Error("idPessoa required");
      const result = await fetchPermissions(idPessoa);
      if ("error" in result) throw new Error(result.error);
      return result;
    },
    enabled: !!idPessoa,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}
