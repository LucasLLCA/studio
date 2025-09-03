"use client";

import { useState, useEffect, useCallback } from 'react';
import type { LoginCredentials, UnidadeFiltro } from '@/types/process-flow';

interface PersistedAuthData {
  isAuthenticated: boolean;
  loginCredentials: LoginCredentials | null;
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
      
      const data: PersistedAuthData = JSON.parse(stored);
      
      // Verifica se os dados não expiraram
      const now = Date.now();
      const expiryTime = data.timestamp + (AUTH_EXPIRY_HOURS * 60 * 60 * 1000);
      
      if (now > expiryTime) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      
      return data;
    } catch (error) {
      console.warn('Erro ao carregar dados de autenticação:', error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }, []);

  // Inicializa os estados com dados do localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const stored = loadFromStorage();
    return stored?.isAuthenticated || false;
  });

  const [loginCredentials, setLoginCredentials] = useState<LoginCredentials | null>(() => {
    const stored = loadFromStorage();
    return stored?.loginCredentials || null;
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
        loginCredentials: null,
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
      console.warn('Erro ao salvar dados de autenticação:', error);
    }
  }, [loadFromStorage]);

  // Função para fazer login
  const login = useCallback((credentials: LoginCredentials, unidades: UnidadeFiltro[]) => {
    setIsAuthenticated(true);
    setLoginCredentials(credentials);
    setUnidadesFiltroList(unidades);
    
    saveToStorage({
      isAuthenticated: true,
      loginCredentials: credentials,
      unidadesFiltroList: unidades
    });
  }, [saveToStorage]);

  // Função para fazer logout
  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setLoginCredentials(null);
    setUnidadesFiltroList([]);
    setSelectedUnidadeFiltro(undefined);
    
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  // Função para atualizar unidade selecionada
  const updateSelectedUnidade = useCallback((unidadeId: string | undefined) => {
    setSelectedUnidadeFiltro(unidadeId);
    saveToStorage({ selectedUnidadeFiltro: unidadeId });
  }, [saveToStorage]);

  // Função para limpar dados expirados na inicialização
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return {
    isAuthenticated,
    loginCredentials,
    unidadesFiltroList,
    selectedUnidadeFiltro,
    login,
    logout,
    updateSelectedUnidade
  };
}