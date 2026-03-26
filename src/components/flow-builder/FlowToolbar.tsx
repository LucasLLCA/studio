'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Edit, Eye, Link2, Loader2, LayoutList } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FlowToolbarProps {
  fluxoId: string;
  nome: string;
  status: string;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  showSummary: boolean;
  isEditMode?: boolean;
  onNameChange: (name: string) => void;
  onStatusChange: (status: string) => void;
  onSave: () => void;
  onAssignProcess: () => void;
  onToggleSummary: () => void;
  onToggleEditMode?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  publicado: 'bg-green-100 text-green-800 border-green-300',
  arquivado: 'bg-gray-100 text-gray-800 border-gray-300',
};

export default function FlowToolbar({
  fluxoId,
  nome,
  status,
  isSaving,
  hasUnsavedChanges,
  showSummary,
  isEditMode = false,
  onNameChange,
  onStatusChange,
  onSave,
  onAssignProcess,
  onToggleSummary,
  onToggleEditMode,
}: FlowToolbarProps) {
  const router = useRouter();
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(nome);

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      onNameChange(tempName.trim());
    }
    setEditingName(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 border-b border-border bg-card flex-shrink-0">
      <Button variant="ghost" size="sm" onClick={() => router.push('/fluxos')}>
        <ArrowLeft className="h-4 w-4" />
      </Button>

      {isEditMode && editingName ? (
        <Input
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onBlur={handleNameSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
          className="max-w-xs"
          autoFocus
        />
      ) : (
        <button
          className="text-lg font-semibold text-foreground hover:underline"
          onClick={() => {
            if (!isEditMode) return;
            setTempName(nome);
            setEditingName(true);
          }}
        >
          {nome}
        </button>
      )}

      {isEditMode && (
        <select
          className={`rounded-md border px-2 py-1 text-xs font-medium ${STATUS_COLORS[status] || 'border-input bg-background'}`}
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="rascunho">Rascunho</option>
          <option value="publicado">Publicado</option>
          <option value="arquivado">Arquivado</option>
        </select>
      )}

      {!isEditMode && (
        <span className={`rounded-md border px-2 py-1 text-xs font-medium ${STATUS_COLORS[status] || 'border-input bg-background'}`}>
          {status === 'rascunho' ? 'Rascunho' : status === 'publicado' ? 'Publicado' : 'Arquivado'}
        </span>
      )}

      <div className="flex-1" />

      {isEditMode && hasUnsavedChanges && (
        <span className="text-xs text-muted-foreground">Alterações não salvas</span>
      )}

      {isEditMode && (
        <>
          <Button variant="outline" size="sm" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Salvar
          </Button>

          <Button variant="outline" size="sm" onClick={onAssignProcess}>
            <Link2 className="h-4 w-4 mr-1" />
            Vincular Processo
          </Button>
        </>
      )}

      <Button
        variant={showSummary ? 'default' : 'outline'}
        size="sm"
        onClick={onToggleSummary}
      >
        <LayoutList className="h-4 w-4 mr-1" />
        Resumo
      </Button>

      {onToggleEditMode && (
        <Button
          variant={isEditMode ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleEditMode}
        >
          {isEditMode ? (
            <><Eye className="h-4 w-4 mr-1" /> Visualizar</>
          ) : (
            <><Edit className="h-4 w-4 mr-1" /> Editar</>
          )}
        </Button>
      )}
    </div>
  );
}
