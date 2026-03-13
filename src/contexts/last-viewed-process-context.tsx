"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

const STORAGE_KEY = 'last_viewed_process';

interface LastViewedProcessContextValue {
  lastViewedProcess: string | null;
  setLastViewedProcess: (processo: string) => void;
  clearLastViewedProcess: () => void;
}

const LastViewedProcessContext = createContext<LastViewedProcessContextValue | null>(null);

export function LastViewedProcessProvider({ children }: { children: React.ReactNode }) {
  const [lastViewedProcess, setLastViewedProcessState] = useState<string | null>(null);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setLastViewedProcessState(stored);
    } catch {}
  }, []);

  const setLastViewedProcess = (processo: string) => {
    setLastViewedProcessState(processo);
    try {
      sessionStorage.setItem(STORAGE_KEY, processo);
    } catch {}
  };

  const clearLastViewedProcess = () => {
    setLastViewedProcessState(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  return (
    <LastViewedProcessContext.Provider value={{ lastViewedProcess, setLastViewedProcess, clearLastViewedProcess }}>
      {children}
    </LastViewedProcessContext.Provider>
  );
}

export function useLastViewedProcess(): LastViewedProcessContextValue {
  const context = useContext(LastViewedProcessContext);
  if (!context) {
    return { lastViewedProcess: null, setLastViewedProcess: () => {}, clearLastViewedProcess: () => {} };
  }
  return context;
}
