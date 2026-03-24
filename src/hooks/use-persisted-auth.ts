"use client";

import { useState, useEffect, useCallback } from 'react';
import type { LoginCredentials, UnidadeFiltro } from '@/types/process-flow';
import { AUTH_CONFIG } from '@/config/constants';

interface PersistedAuthData {
  isAuthenticated: boolean;
  sessionToken: string | null;
  idUnidadeAtual: string | null;
  orgao: string | null;
  usuario: string | null;
  nomeUsuario: string | null;
  idUsuario: string | null;
  idLogin: string | null;
  cargoAssinatura: string | null;
  idPessoa: number | null;
  unidadesFiltroList: UnidadeFiltro[];
  selectedUnidadeFiltro: string | undefined;
  timestamp: number;
}

const AUTH_STORAGE_KEY = AUTH_CONFIG.STORAGE_KEY;
const AUTH_EXPIRY_HOURS = AUTH_CONFIG.EXPIRY_HOURS;

function sanitizeDisplayName(name?: string | null): string | null {
  if (!name) return null;

  // Remove sufixos comuns de matrícula, ex.: " - Matr.0371160-9" ou "Matr.E.03610730"
  const cleaned = name
    .replace(/\s*[-–]?\s*Matr\.?\s*[A-Za-z0-9.\-_/]+/gi, '')
    .trim();

  return cleaned || null;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage;
}

export function usePersistedAuth() {
  const loadFromStorage = useCallback((): PersistedAuthData | null => {
    const storage = getStorage();
    if (!storage) return null;

    try {
      const stored = storage.getItem(AUTH_STORAGE_KEY);
      if (!stored) return null;

      const rawData = JSON.parse(stored);

      // Migração apenas se necessário
      if (rawData.loginCredentials && !rawData.sessionToken) {
        storage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }

      const data: PersistedAuthData = rawData;

      // Verifica se os dados não expiraram
      const now = Date.now();
      const expiryTime = data.timestamp + (AUTH_EXPIRY_HOURS * 60 * 60 * 1000);

      if (now > expiryTime) {
        storage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Erro ao carregar dados de autenticação salvos:', error);
      storage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
  }, []);

  // Inicializa os estados com dados do sessionStorage
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

  const [orgao, setOrgao] = useState<string | null>(() => {
    const stored = loadFromStorage();
    return stored?.orgao || null;
  });

  const [usuario, setUsuario] = useState<string | null>(() => {
    const stored = loadFromStorage();
    return stored?.usuario || null;
  });

  const [nomeUsuario, setNomeUsuario] = useState<string | null>(() => {
    const stored = loadFromStorage();
    return stored?.nomeUsuario || null;
  });

  const [idUsuario, setIdUsuario] = useState<string | null>(() => {
    const stored = loadFromStorage();
    return stored?.idUsuario || null;
  });

  const [idLogin, setIdLogin] = useState<string | null>(() => {
    const stored = loadFromStorage();
    return stored?.idLogin || null;
  });

  const [cargoAssinatura, setCargoAssinatura] = useState<string | null>(() => {
    const stored = loadFromStorage();
    return stored?.cargoAssinatura || null;
  });

  const [idPessoa, setIdPessoa] = useState<number | null>(() => {
    const stored = loadFromStorage();
    return stored?.idPessoa || null;
  });

  const [unidadesFiltroList, setUnidadesFiltroList] = useState<UnidadeFiltro[]>(() => {
    const stored = loadFromStorage();
    return stored?.unidadesFiltroList || [];
  });

  const [selectedUnidadeFiltro, setSelectedUnidadeFiltro] = useState<string | undefined>(() => {
    const stored = loadFromStorage();
    return stored?.selectedUnidadeFiltro;
  });

  const saveToStorage = useCallback((data: Partial<PersistedAuthData>) => {
    const storage = getStorage();
    if (!storage) return;

    try {
      const current = loadFromStorage() || {
        isAuthenticated: false,
        sessionToken: null,
        idUnidadeAtual: null,
        orgao: null,
        usuario: null,
        nomeUsuario: null,
        idUsuario: null,
        idLogin: null,
        cargoAssinatura: null,
        idPessoa: null,
        unidadesFiltroList: [],
        selectedUnidadeFiltro: undefined,
        timestamp: Date.now()
      };

      const updated: PersistedAuthData = {
        ...current,
        ...data,
        timestamp: Date.now(),
        usuario: data.usuario !== undefined ? data.usuario : (current.usuario || null)
      };

      storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.warn('Erro ao salvar dados de autenticação:', error);
    }
  }, [loadFromStorage]);

  const login = useCallback((token: string, unidades: UnidadeFiltro[], idUnidadeAtual?: string, userOrgao?: string, userEmail?: string, userName?: string, userIdUsuario?: string, userIdLogin?: string, userCargoAssinatura?: string, userIdPessoa?: number) => {
    let validToken: string;
    if (typeof token === 'string') {
      validToken = token;
    } else if (token && typeof token === 'object') {
      console.warn('Token recebido como objeto - convertendo para string');
      validToken = JSON.stringify(token);
    } else {
      console.error('Login falhou - token invalido');
      return;
    }

    // Clear any stale localStorage data from previous versions
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }

    setIsAuthenticated(true);
    setSessionToken(validToken);
    setIdUnidadeAtual(idUnidadeAtual || null);
    setOrgao(userOrgao || null);
    setUsuario(userEmail || null);
    const cleanUserName = sanitizeDisplayName(userName);
    setNomeUsuario(cleanUserName);
    setIdUsuario(userIdUsuario || null);
    setIdLogin(userIdLogin || null);
    setCargoAssinatura(userCargoAssinatura || null);
    setIdPessoa(userIdPessoa || null);
    setUnidadesFiltroList(unidades);

    saveToStorage({
      isAuthenticated: true,
      sessionToken: validToken,
      idUnidadeAtual: idUnidadeAtual || null,
      orgao: userOrgao || null,
      usuario: userEmail || null,
      nomeUsuario: cleanUserName,
      idUsuario: userIdUsuario || null,
      idLogin: userIdLogin || null,
      cargoAssinatura: userCargoAssinatura || null,
      idPessoa: userIdPessoa || null,
      unidadesFiltroList: unidades
    });
  }, [saveToStorage]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setSessionToken(null);
    setIdUnidadeAtual(null);
    setOrgao(null);
    setUsuario(null);
    setNomeUsuario(null);
    setIdUsuario(null);
    setIdLogin(null);
    setCargoAssinatura(null);
    setIdPessoa(null);
    setUnidadesFiltroList([]);
    setSelectedUnidadeFiltro(undefined);

    const storage = getStorage();
    if (storage) {
      storage.removeItem(AUTH_STORAGE_KEY);
    }
    // Also clear any stale localStorage data
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const updateSessionToken = useCallback((newToken: string) => {
    setSessionToken(newToken);
    saveToStorage({ sessionToken: newToken });
  }, [saveToStorage]);

  const updateSelectedUnidade = useCallback((unidadeId: string | undefined) => {
    setSelectedUnidadeFiltro(unidadeId);
    saveToStorage({ selectedUnidadeFiltro: unidadeId });
  }, [saveToStorage]);

  const forceLogout = useCallback(() => {
    setIsAuthenticated(false);
    setSessionToken(null);
    setIdUnidadeAtual(null);
    setOrgao(null);
    setUsuario(null);
    setNomeUsuario(null);
    setIdUsuario(null);
    setIdLogin(null);
    setCargoAssinatura(null);
    setIdPessoa(null);
    setUnidadesFiltroList([]);
    setSelectedUnidadeFiltro(undefined);
    const storage = getStorage();
    if (storage) {
      storage.removeItem(AUTH_STORAGE_KEY);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  // Limpar dados expirados na inicialização
  useEffect(() => {
    loadFromStorage();

    // Verificar se sessionToken contém dados corrompidos (credenciais em JSON)
    if (sessionToken && typeof sessionToken === 'string' && sessionToken.includes('usuario')) {
      forceLogout();
    }
  }, [loadFromStorage, sessionToken, forceLogout]);


  return {
    isAuthenticated,
    sessionToken,
    idUnidadeAtual,
    orgao,
    usuario,
    nomeUsuario,
    idUsuario,
    idLogin,
    cargoAssinatura,
    idPessoa,
    unidadesFiltroList,
    selectedUnidadeFiltro,
    login,
    logout,
    updateSessionToken,
    updateSelectedUnidade,
    forceLogout
  };
}
