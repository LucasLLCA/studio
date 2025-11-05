"use client";

import { useState, useEffect, useCallback } from 'react';
import type { LoginCredentials, UnidadeFiltro } from '@/types/process-flow';

interface PersistedAuthData {
  isAuthenticated: boolean;
  sessionToken: string | null; // Apenas token de sessão, não credenciais
  idUnidadeAtual: string | null; // ID da unidade atual para requisições
  unidadesFiltroList: UnidadeFiltro[];
  selectedUnidadeFiltro: string | undefined;
  timestamp: number;
}

const AUTH_STORAGE_KEY = 'sei_auth_data';
const AUTH_EXPIRY_HOURS = 8; // Expira em 8 horas

export function usePersistedAuth() {
  // Função para carregar dados do localStorage
  const loadFromStorage = useCallback((): PersistedAuthData | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;
      
      const rawData = JSON.parse(stored);
      
      // Migração apenas se necessário
      if (rawData.loginCredentials && !rawData.sessionToken) {
        console.log('[DEBUG] Migração de dados antigos');
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      
      const data: PersistedAuthData = rawData;
      
      // Verifica se os dados não expiraram
      const now = Date.now();
      const expiryTime = data.timestamp + (AUTH_EXPIRY_HOURS * 60 * 60 * 1000);
      
      if (now > expiryTime) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('Erro ao carregar dados de autenticação salvos:', error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }, []);

  // Inicializa os estados com dados do localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const stored = loadFromStorage();
    return stored?.isAuthenticated || false;
  });

  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    const stored = loadFromStorage();
    return stored?.sessionToken || null;
  });

  const [idUnidadeAtual, setIdUnidadeAtual] = useState<string | null>(() => {
    const stored = loadFromStorage();
    return stored?.idUnidadeAtual || null;
  });

  const [unidadesFiltroList, setUnidadesFiltroList] = useState<UnidadeFiltro[]>(() => {
    const stored = loadFromStorage();
    return stored?.unidadesFiltroList || [];
  });

  const [selectedUnidadeFiltro, setSelectedUnidadeFiltro] = useState<string | undefined>(() => {
    const stored = loadFromStorage();
    return stored?.selectedUnidadeFiltro;
  });

  // Função para salvar no localStorage
  const saveToStorage = useCallback((data: Partial<PersistedAuthData>) => {
    if (typeof window === 'undefined') return;
    
    try {
      const current = loadFromStorage() || {
        isAuthenticated: false,
        sessionToken: null,
        idUnidadeAtual: null,
        unidadesFiltroList: [],
        selectedUnidadeFiltro: undefined,
        timestamp: Date.now()
      };

      const updated: PersistedAuthData = {
        ...current,
        ...data,
        timestamp: Date.now()
      };

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Erro ao salvar dados de autenticação no armazenamento local:', error);
    }
  }, [loadFromStorage]);

  // Função para fazer login
  const login = useCallback((token: string, unidades: UnidadeFiltro[], idUnidadeAtual?: string) => {
    console.log('[DEBUG] Login iniciado - Token type:', typeof token);
    console.log('[DEBUG] Login - Token raw value:', token);
    console.log('[DEBUG] Login - Unidades:', unidades.length);
    
    // Tentar converter token para string se necessário
    let validToken: string;
    if (typeof token === 'string') {
      validToken = token;
    } else if (token && typeof token === 'object') {
      console.warn('[DEBUG] Token é objeto - tentando converter:', token);
      validToken = JSON.stringify(token);
    } else {
      console.error('[DEBUG] Login FALHOU - Token inválido:', token);
      return;
    }
    
    console.log('[DEBUG] Login - Token válido:', typeof validToken, validToken.substring(0, 20) + '...');
    
    setIsAuthenticated(true);
    setSessionToken(validToken);
    setIdUnidadeAtual(idUnidadeAtual || null);
    setUnidadesFiltroList(unidades);
    
    const dataToSave = {
      isAuthenticated: true,
      sessionToken: validToken,
      idUnidadeAtual: idUnidadeAtual || null,
      unidadesFiltroList: unidades
    };
    
    console.log('[DEBUG] Login - Salvando dados:', {
      isAuthenticated: dataToSave.isAuthenticated,
      tokenLength: dataToSave.sessionToken?.length,
      unidadesCount: dataToSave.unidadesFiltroList.length
    });
    
    saveToStorage(dataToSave);
    
    console.log('[DEBUG] Login concluído - isAuthenticated agora deve ser true');
  }, [saveToStorage]);

  // Função para fazer logout
  const logout = useCallback(() => {
    console.log('[DEBUG] usePersistedAuth.logout - Iniciando...');
    setIsAuthenticated(false);
    setSessionToken(null);
    setIdUnidadeAtual(null);
    setUnidadesFiltroList([]);
    setSelectedUnidadeFiltro(undefined);
    
    // Limpeza completa do localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      console.log('[DEBUG] localStorage limpo');
    }
    console.log('[DEBUG] usePersistedAuth.logout - Concluído');
  }, []);

  // Função para atualizar unidade selecionada
  const updateSelectedUnidade = useCallback((unidadeId: string | undefined) => {
    setSelectedUnidadeFiltro(unidadeId);
    saveToStorage({ selectedUnidadeFiltro: unidadeId });
  }, [saveToStorage]);

  // Função para forçar logout e limpeza
  const forceLogout = useCallback(() => {
    console.log('[DEBUG] Forçando logout e limpeza');
    setIsAuthenticated(false);
    setSessionToken(null);
    setIdUnidadeAtual(null);
    setUnidadesFiltroList([]);
    setSelectedUnidadeFiltro(undefined);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  // Função para limpar dados expirados na inicialização
  useEffect(() => {
    loadFromStorage();
    
    // Verificar se sessionToken contém dados corrompidos (credenciais em JSON)
    if (sessionToken && typeof sessionToken === 'string' && sessionToken.includes('usuario')) {
      console.warn('[DEBUG] Dados corrompidos detectados no sessionToken - forçando limpeza');
      forceLogout();
    }
  }, [loadFromStorage, sessionToken, forceLogout]);

  return {
    isAuthenticated,
    sessionToken,
    idUnidadeAtual,
    unidadesFiltroList,
    selectedUnidadeFiltro,
    login,
    logout,
    updateSelectedUnidade,
    forceLogout
  };
}