"use client";

import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';

export function OfflineBanner() {
  const { toast } = useToast();
  const wasOfflineRef = useRef(false);

  const { isOnline } = useNetworkStatus({
    onOffline: () => {
      wasOfflineRef.current = true;
      toast({
        title: "Sem conexão",
        description: "Você está offline. As operações serão retomadas quando a conexão for restaurada.",
        variant: "destructive",
      });
    },
    onOnline: () => {
      if (wasOfflineRef.current) {
        wasOfflineRef.current = false;
        toast({
          title: "Conexão restaurada",
          description: "Sua conexão foi restabelecida.",
        });
      }
    },
  });

  if (isOnline) return null;

  return (
    <div className="bg-destructive text-destructive-foreground px-4 py-2 text-sm flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      <span>Você está offline. Verifique sua conexão com a internet.</span>
    </div>
  );
}
