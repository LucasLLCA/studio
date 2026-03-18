import React from 'react';
import type { Andamento, Documento } from '@/types/process-flow';

interface LinkedTextProps {
  text: string;
  andamentos: Andamento[] | null;
  documents: Documento[] | null;
  onNavigate?: (id: string, type: 'andamento' | 'document') => void;
}

const REFERENCE_PATTERN = /(Documento\s+SEI[- ](\d{7,13}))|(Documento\s+(\d{7,13}))|(Atividade\s+(\d{5,12}))/gi;

export function LinkedText({ text, andamentos, documents, onNavigate }: LinkedTextProps) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  REFERENCE_PATTERN.lastIndex = 0;

  while ((match = REFERENCE_PATTERN.exec(text)) !== null) {
    // Add plain text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const fullMatch = match[0];
    let id: string | undefined;
    let type: 'andamento' | 'document' | undefined;
    let isClickable = false;

    if (match[1]) {
      // "Documento SEI-XXXXX" pattern
      id = match[2];
      type = 'document';
    } else if (match[3]) {
      // "Documento XXXXX" pattern
      id = match[4];
      type = 'document';
    } else if (match[5]) {
      // "Atividade XXXXX" pattern
      id = match[6];
      type = 'andamento';
    }

    if (id && type) {
      if (type === 'document' && documents) {
        isClickable = documents.some(d => d.DocumentoFormatado?.includes(id!));
      } else if (type === 'andamento' && andamentos) {
        isClickable = andamentos.some(a => a.IdAndamento === id);
      }
    }

    if (isClickable && id && type && onNavigate) {
      parts.push(
        <button
          key={`ref-${match.index}`}
          type="button"
          className="text-primary underline decoration-dotted cursor-pointer hover:decoration-solid inline"
          onClick={() => onNavigate(id!, type!)}
        >
          {fullMatch}
        </button>
      );
    } else {
      parts.push(fullMatch);
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
