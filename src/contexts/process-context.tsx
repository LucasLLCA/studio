"use client";

import React, { createContext, useContext } from 'react';
import type { Documento, UnidadeAberta } from '@/types/process-flow';

interface ProcessContextValue {
  sessionToken: string | null;
  isAuthenticated: boolean;
  selectedUnidadeFiltro: string | undefined;
  processNumber: string;
  documents: Documento[] | null;
  isLoadingDocuments: boolean;
  openUnitsInProcess: UnidadeAberta[] | null;
  refresh?: () => void;
}

const ProcessContext = createContext<ProcessContextValue | null>(null);

export function ProcessProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: ProcessContextValue;
}) {
  return (
    <ProcessContext.Provider value={value}>
      {children}
    </ProcessContext.Provider>
  );
}

export function useProcessContext(): ProcessContextValue {
  const context = useContext(ProcessContext);
  if (!context) {
    throw new Error('useProcessContext must be used within a ProcessProvider');
  }
  return context;
}
