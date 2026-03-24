"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'last_viewed_process';
const RECENT_STORAGE_KEY = 'recent_viewed_processes';
const SUBHEADER_COLLAPSED_KEY = 'subheader_collapsed';
const MAX_RECENT = 10;

/** Normalize process number to avoid duplicates from formatting differences */
function normalizeProcesso(numero: string): string {
  return numero.replace(/\D/g, '');
}

interface LastViewedProcessContextValue {
  lastViewedProcess: string | null;
  setLastViewedProcess: (processo: string) => void;
  clearLastViewedProcess: () => void;
  /** Ordered list of recently viewed processes (most recent first), max 10 */
  recentProcesses: string[];
  /** Remove a single process from the recent list */
  removeRecentProcess: (processo: string) => void;
  /** Whether the subheader is collapsed */
  isSubheaderCollapsed: boolean;
  /** Toggle subheader collapsed state */
  toggleSubheaderCollapsed: () => void;
}

const LastViewedProcessContext = createContext<LastViewedProcessContextValue | null>(null);

export function LastViewedProcessProvider({ children }: { children: React.ReactNode }) {
  const [lastViewedProcess, setLastViewedProcessState] = useState<string | null>(null);
  const [recentProcesses, setRecentProcesses] = useState<string[]>([]);
  const [isSubheaderCollapsed, setIsSubheaderCollapsed] = useState(false);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setLastViewedProcessState(stored);

      const recentStored = sessionStorage.getItem(RECENT_STORAGE_KEY);
      if (recentStored) {
        const parsed = JSON.parse(recentStored);
        if (Array.isArray(parsed)) {
          // Deduplicate by normalized number on hydration
          const seen = new Set<string>();
          const deduped: string[] = [];
          for (const p of parsed) {
            const key = normalizeProcesso(p);
            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(p);
            }
          }
          setRecentProcesses(deduped.slice(0, MAX_RECENT));
        }
      }

      const collapsed = sessionStorage.getItem(SUBHEADER_COLLAPSED_KEY);
      if (collapsed === 'true') setIsSubheaderCollapsed(true);
    } catch {}
  }, []);

  const setLastViewedProcess = useCallback((processo: string) => {
    setLastViewedProcessState(processo);
    try {
      sessionStorage.setItem(STORAGE_KEY, processo);
    } catch {}

    // Add to recent list (move to front, deduplicate by normalized number)
    setRecentProcesses(prev => {
      const norm = normalizeProcesso(processo);
      const filtered = prev.filter(p => normalizeProcesso(p) !== norm);
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
    const norm = normalizeProcesso(processo);
    setRecentProcesses(prev => {
      const next = prev.filter(p => normalizeProcesso(p) !== norm);
      try {
        sessionStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
    setLastViewedProcessState(prev => {
      if (prev && normalizeProcesso(prev) === norm) {
        try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
        return null;
      }
      return prev;
    });
  }, []);

  const toggleSubheaderCollapsed = useCallback(() => {
    setIsSubheaderCollapsed(prev => {
      const next = !prev;
      try { sessionStorage.setItem(SUBHEADER_COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <LastViewedProcessContext.Provider value={{
      lastViewedProcess,
      setLastViewedProcess,
      clearLastViewedProcess,
      recentProcesses,
      removeRecentProcess,
      isSubheaderCollapsed,
      toggleSubheaderCollapsed,
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
      isSubheaderCollapsed: false,
      toggleSubheaderCollapsed: () => {},
    };
  }
  return context;
}
