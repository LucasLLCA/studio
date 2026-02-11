"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseNetworkStatusOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

interface UseNetworkStatusReturn {
  isOnline: boolean;
}

/**
 * Tracks browser online/offline state and fires callbacks on transitions.
 * Callbacks are stored in refs so consumers don't need to memoize them.
 */
export function useNetworkStatus(
  options: UseNetworkStatusOptions = {},
): UseNetworkStatusReturn {
  const [isOnline, setIsOnline] = useState(true);

  const onOnlineRef = useRef(options.onOnline);
  const onOfflineRef = useRef(options.onOffline);
  onOnlineRef.current = options.onOnline;
  onOfflineRef.current = options.onOffline;

  // Sync initial state on mount (SSR-safe)
  useEffect(() => {
    setIsOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onOnlineRef.current?.();
    };
    const handleOffline = () => {
      setIsOnline(false);
      onOfflineRef.current?.();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}
