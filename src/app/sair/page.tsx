"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { clearAuthTokenCookie } from '@/app/sei-actions';
import { Loader2 } from 'lucide-react';

export default function SairPage() {
  const router = useRouter();
  const { logout } = usePersistedAuth();

  useEffect(() => {
    // Clear localStorage session
    logout();

    // Clear auth_token cookie (works with httpOnly)
    clearAuthTokenCookie().then(() => {
      router.push('/login');
    });
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
