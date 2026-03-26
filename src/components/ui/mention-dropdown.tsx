"use client";

import React, { useState, useEffect } from 'react';
import type { TeamMember } from '@/types/teams';

interface MentionDropdownProps {
  show: boolean;
  members: TeamMember[];
  onSelect: (m: TeamMember) => void;
  onClose: () => void;
  className?: string;
}

export function MentionDropdown({
  show,
  members,
  onSelect,
  onClose,
  className = '',
}: MentionDropdownProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!show) {
      setSelectedIndex(0);
    }
  }, [show]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!show || members.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % members.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + members.length) % members.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (members[selectedIndex]) {
          onSelect(members[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, members, selectedIndex, onSelect, onClose]);

  if (!show || members.length === 0) {
    return null;
  }

  return (
    <div
      className={`absolute bottom-full left-0 mb-1 w-full bg-popover border rounded-md shadow-md z-50 max-h-36 overflow-y-auto ${className}`}
    >
      {members.map((membro, idx) => (
        <button
          key={membro.id}
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(membro);
          }}
          onMouseEnter={() => setSelectedIndex(idx)}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
            idx === selectedIndex ? 'bg-accent' : 'hover:bg-accent'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
            {membro.usuario[0].toUpperCase()}
          </span>
          <span className="truncate">{membro.usuario}</span>
        </button>
      ))}
    </div>
  );
}
