import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { fetchPermissionsByEmail, type PermissionsResponse } from "@/lib/api/permissions-api-client";

export function usePermissionsQuery(usuario: string | null) {
  return useQuery<PermissionsResponse>({
    queryKey: queryKeys.permissions.byUser(usuario ?? ''),
    queryFn: async () => {
      if (!usuario) throw new Error("usuario required");
      console.log('[usePermissionsQuery] fetching permissions by email:', usuario);
      const result = await fetchPermissionsByEmail(usuario);
      if ("error" in result) {
        console.error('[usePermissionsQuery] API error:', result.error);
        throw new Error(result.error);
      }
      console.log('[usePermissionsQuery] response:', result);
      return result;
    },
    enabled: !!usuario,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 1,
  });
}
