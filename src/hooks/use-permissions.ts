"use client";

import { useCallback, useMemo } from "react";
import { usePersistedAuth } from "./use-persisted-auth";
import { usePermissionsQuery } from "@/lib/react-query/queries/usePermissions";
import type { ModuloKey } from "@/config/modules";

/**
 * Hook that provides permission checking based on the RBAC system.
 * Fetches permissions from the backend by usuario_sei (email).
 */
export function usePermissions() {
  const { usuario } = usePersistedAuth();
  const { data, isLoading, error } = usePermissionsQuery(usuario);

  if (typeof window !== 'undefined') {
    console.log('[usePermissions] usuario:', usuario, '| isLoading:', isLoading, '| error:', error?.message ?? null, '| papel_nome:', data?.papel_nome ?? null);
  }

  const modulos = useMemo(() => data?.modulos ?? [], [data]);

  const hasModulo = useCallback(
    (key: ModuloKey | string): boolean => modulos.includes(key),
    [modulos]
  );

  return {
    modulos,
    hasModulo,
    papelNome: data?.papel_nome ?? null,
    papelSlug: data?.papel_slug ?? null,
    isLoading,
    error,
  };
}
