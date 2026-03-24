"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'last_viewed_process';
const RECENT_STORAGE_KEY = 'recent_viewed_processes';
const MAX_RECENT = 10;

interface LastViewedProcessContextValue {
  lastViewedProcess: string | null;
  setLastViewedProcess: (processo: string) => void;
  clearLastViewedProcess: () => void;
  /** Ordered list of recently viewed processes (most recent first), max 10 */
  recentProcesses: string[];
  /** Remove a single process from the recent list */
  removeRecentProcess: (processo: string) => void;
}

const LastViewedProcessContext = createContext<LastViewedProcessContextValue | null>(null);

export function LastViewedProcessProvider({ children }: { children: React.ReactNode }) {
  const [lastViewedProcess, setLastViewedProcessState] = useState<string | null>(null);
  const [recentProcesses, setRecentProcesses] = useState<string[]>([]);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setLastViewedProcessState(stored);

      const recentStored = sessionStorage.getItem(RECENT_STORAGE_KEY);
      if (recentStored) {
        const parsed = JSON.parse(recentStored);
        if (Array.isArray(parsed)) setRecentProcesses(parsed.slice(0, MAX_RECENT));
      }
    } catch {}
  }, []);

  const setLastViewedProcess = useCallback((processo: string) => {
    setLastViewedProcessState(processo);
    try {
      sessionStorage.setItem(STORAGE_KEY, processo);
    } catch {}

    // Add to recent list (move to front if already present)
    setRecentProcesses(prev => {
      const filtered = prev.filter(p => p !== processo);
      const next = [processo, ...filtered].slice(0, MAX_RECENT);
      try {
        sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clearLastViewedProcess = useCallback(() => {
    setLastViewedProcessState(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const removeRecentProcess = useCallback((processo: string) => {
    setRecentProcesses(prev => {
      const next = prev.filter(p => p !== processo);
      try {
        sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    // If removing the last viewed, clear it
    setLastViewedProcessState(prev => {
      if (prev === processo) {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
        return null;
      }
      return prev;
    });
  }, []);

  return (
    <LastViewedProcessContext.Provider value={{
      lastViewedProcess,
      setLastViewedProcess,
      clearLastViewedProcess,
      recentProcesses,
      removeRecentProcess,
    }}>
      {children}
    </LastViewedProcessContext.Provider>
  );
}

export function useLastViewedProcess(): LastViewedProcessContextValue {
  const context = useContext(LastViewedProcessContext);
  if (!context) {
    return {
      lastViewedProcess: null,
      setLastViewedProcess: () => {},
      clearLastViewedProcess: () => {},
      recentProcesses: [],
      removeRecentProcess: () => {},
    };
  }
  return context;
}
