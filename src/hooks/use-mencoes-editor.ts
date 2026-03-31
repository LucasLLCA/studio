import { useState, useRef, useCallback } from 'react';
import type { TeamMember } from '@/types/teams';

export function useMencoesEditor(membrosEquipe: TeamMember[], usuarioAtual: string | null | undefined = undefined) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mencaoQuery, setMencaoQuery] = useState<string | null>(null);
  const insertFnRef = useRef<((usuario: string) => void) | null>(null);

  const membrosFiltrados = useCallback(() => {
    if (mencaoQuery === null) return [];
    return membrosEquipe.filter(
      m => m.usuario !== usuarioAtual && m.usuario.toLowerCase().includes(mencaoQuery.toLowerCase())
    );
  }, [membrosEquipe, mencaoQuery, usuarioAtual]);

  const handleMentionQuery = useCallback(
    (query: string | null | undefined, insertFn: (usuario: string) => void) => {
      const q = query ?? null;
      setMencaoQuery(q);
      insertFnRef.current = insertFn;
      setShowDropdown(q !== null && q !== '');
    },
    []
  );

  const handleSelectMembro = useCallback((membro: TeamMember) => {
    if (insertFnRef.current) {
      insertFnRef.current(membro.usuario);
    }
    setShowDropdown(false);
    setMencaoQuery(null);
  }, []);

  const handleCloseMentionDropdown = useCallback(() => {
    setShowDropdown(false);
    setMencaoQuery(null);
  }, []);

  /**
   * Extrai menções (@usuario) do HTML
   * Procura por padrão @usuario (sem espaço antes) no texto puro
   */
  const extrairMencoes = useCallback((html: string): string[] => {
    // Remove tags HTML para extrair texto puro
    const tempDiv = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (tempDiv) {
      tempDiv.innerHTML = html;
      const texto = tempDiv.textContent || '';
      const matches = texto.match(/@([\w.]+)/g) || [];
      const mencoes = matches.map(m => m.slice(1)); // remove o @
      return [...new Set(mencoes)]; // deduplica
    }
    return [];
  }, []);

  return {
    showDropdown,
    setShowDropdown,
    mencaoQuery,
    membrosFiltrados,
    handleMentionQuery,
    handleSelectMembro,
    handleCloseMentionDropdown,
    extrairMencoes,
  };
}
