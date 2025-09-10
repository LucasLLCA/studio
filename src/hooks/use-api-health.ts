"use client";

import { useState, useEffect, useCallback } from 'react';
import { checkSEIApiHealth, checkSummaryApiHealth } from '@/app/sei-actions';
import type { HealthCheckResponse } from '@/app/sei-actions';

interface UseApiHealthReturn {
  seiApiStatus: HealthCheckResponse | null;
  summaryApiStatus: HealthCheckResponse | null;
  isChecking: boolean;
  lastCheck: Date | null;
  refreshHealth: () => Promise<void>;
}

export function useApiHealth(): UseApiHealthReturn {
  const [seiApiStatus, setSeiApiStatus] = useState<HealthCheckResponse | null>(null);
  const [summaryApiStatus, setSummaryApiStatus] = useState<HealthCheckResponse | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const refreshHealth = useCallback(async () => {
    setIsChecking(true);
    
    try {
      const [seiHealth, summaryHealth] = await Promise.all([
        checkSEIApiHealth(),
        checkSummaryApiHealth()
      ]);
      
      setSeiApiStatus(seiHealth);
      setSummaryApiStatus(summaryHealth);
      setLastCheck(new Date());
    } catch (error) {
      console.error('Erro ao verificar health das APIs:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  return {
    seiApiStatus,
    summaryApiStatus,
    isChecking,
    lastCheck,
    refreshHealth
  };
}