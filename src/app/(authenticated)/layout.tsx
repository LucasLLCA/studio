"use client";

import { useEffect } from 'react';
import AppHeader from '@/components/AppHeader';
import AppFooter from '@/components/AppFooter';
import { OfflineBanner } from '@/components/OfflineBanner';
import { LastViewedProcessProvider } from '@/contexts/last-viewed-process-context';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { setRefreshFn, clearRefreshFn } from '@/lib/api/token-refresh-manager';
import { hasAuthTokenCookie, getEmbedUserIdentity, autoLoginWithStoredCredentials } from '@/app/sei-actions';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { updateSessionToken } = usePersistedAuth();

  // Register token refresh callback for transparent 422 recovery
  useEffect(() => {
    let idPessoa: number | null = null;

    async function setup() {
      try {
        const isEmbed = await hasAuthTokenCookie();
        if (isEmbed) {
          const identity = await getEmbedUserIdentity();
          if (identity) {
            idPessoa = identity.id_pessoa;
          }
        }
      } catch {
        // Not an embed user or identity unavailable — refresh will return null
      }

      setRefreshFn(async () => {
        if (!idPessoa) return null;
        try {
          const result = await autoLoginWithStoredCredentials(idPessoa);
          if (result.success && result.token) {
            updateSessionToken(result.token);
            return result.token;
          }
        } catch {
          // Auto-login failed
        }
        return null;
      });
    }

    setup();

    return () => {
      clearRefreshFn();
    };
  }, [updateSessionToken]);

  return (
    <LastViewedProcessProvider>
      <div className="flex flex-col min-h-screen bg-gray-100 w-full">
        <AppHeader />
        <OfflineBanner />
        <main className="flex-1 flex flex-col w-full">{children}</main>
        <AppFooter />
      </div>
    </LastViewedProcessProvider>
  );
}
