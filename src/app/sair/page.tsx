"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { Loader2 } from 'lucide-react';

export default function SairPage() {
  const router = useRouter();
  const { logout } = usePersistedAuth();

  useEffect(() => {
    // Clear localStorage session
    logout();

    // Clear auth_token cookie
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    // Redirect to login
    router.push('/login');
  }, [logout, router]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      gap: '16px',
    }}>
      <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#3b82f6' }} />
      <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>Saindo...</p>
    </div>
  );
}
