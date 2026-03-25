'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2, ChevronDown } from 'lucide-react';
import type { Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { useUnidadesSei } from '@/hooks/use-unidades-sei';
import { useTiposDocumento } from '@/hooks/use-tipos-documento';

function AutoResizeTextarea({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      className={className}
      style={{ resize: 'none', overflow: 'hidden', minHeight: '2.25rem' }}
    />
  );
}

interface NodePropertiesPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
  onDelete?: (nodeId: string) => void;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  baixa:   { label: 'Baixa',   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' },
  media:   { label: 'Média',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300' },
  alta:    { label: 'Alta',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  critica: { label: 'Crítica', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' },
};

const NODE_TYPE_LABEL: Record<string, string> = {
  inicio: 'Início',
  fim: 'Fim',
  decisao: 'Decisão',
  fork: 'Fork',
  join: 'Join',
  etapa: 'Etapa Personalizada',
  sei_task: 'Tarefa SEI',
};

export default function NodePropertiesPanel({ node, onUpdate, onClose, onDelete }: NodePropertiesPanelProps) {
  const [unidadeSearch, setUnidadeSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [unidadeOpen, setUnidadeOpen] = useState(false);
  const unidadeRef = useRef<HTMLDivElement>(null);

  // Estado do seletor de documentos
  const [docSearch, setDocSearch] = useState('');
  const [debouncedDocSearch, setDebouncedDocSearch] = useState('');
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDocSearch(docSearch), 300);
    return () => clearTimeout(timer);
  }, [docSearch]);

  const { data: tiposDocumento = [], isFetching: loadingTipos } = useTiposDocumento(debouncedDocSearch);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (docRef.current && !docRef.current.contains(e.target as Node)) {
        setDocDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce: só dispara a busca 350ms após parar de digitar
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(unidadeSearch), 350);
    return () => clearTimeout(timer);
  }, [unidadeSearch]);

  const { data: unidades = [], isFetching: loadingUnidades } = useUnidadesSei(debouncedSearch);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (unidadeRef.current && !unidadeRef.current.contains(e.target as Node)) {
        setUnidadeOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!node) return null;

  const d = node.data as Record<string, unknown>;
  const meta = (d.metadata_extra as Record<string, unknown>) || {};

  const update = (key: string, value: unknown) => {
    onUpdate(node.id, { ...d, [key]: value });
  };

  const checklist = (d.checklist as Array<{ item: string; obrigatorio: boolean }>) || [];
  const documentos = (d.documentos_necessarios as string[]) || [];
  const prioridade = (d.prioridade as string) || '';

  const selectedUnidadeId = meta.unidade_sei_id as string | undefined;
  // Tenta mostrar a unidade salva tanto nos resultados atuais quanto no meta (para exibir mesmo sem busca ativa)
  const selectedUnidade = unidades.find((u) => u.Id === selectedUnidadeId) || (
    selectedUnidadeId ? { Id: selectedUnidadeId, Sigla: meta.unidade_sei_sigla as string, Descricao: meta.unidade_sei_descricao as string } : undefined
  );

  return (
    <div className="w-96 border-l border-border bg-card overflow-y-auto flex-shrink-0 flex flex-col">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {NODE_TYPE_LABEL[node.type || ''] || node.type}
          </p>
          <h3 className="text-sm font-semibold truncate">{(d.nome as string) || 'Sem nome'}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/10"
              onClick={() => { onDelete(node.id); onClose(); }}
              title="Excluir nó"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Formulário */}
      <div className="p-3 space-y-4 flex-1 overflow-y-auto">
        {/* Nome */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nome</label>
          <Input
            value={(d.nome as string) || ''}
            onChange={(e) => update('nome', e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Descrição */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Descrição</label>
          <AutoResizeTextarea
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={(d.descricao as string) || ''}
            onChange={(e) => update('descricao', e.target.value)}
          />
        </div>

        {/* Responsável */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Responsável</label>
          <Input
            value={(d.responsavel as string) || ''}
            onChange={(e) => update('responsavel', e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Unidade SEI */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Unidade</label>
          <div ref={unidadeRef} className="relative mt-1">
            <button
              type="button"
              disabled={loadingUnidades}
              className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-wait"
              onClick={() => { setUnidadeOpen((v) => !v); setUnidadeSearch(''); }}
            >
              {selectedUnidade ? (
                <span className="truncate">
                  <span className="font-medium">{selectedUnidade.Sigla}</span>
                  <span className="text-muted-foreground ml-1 text-xs">— {selectedUnidade.Descricao}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {loadingUnidades ? 'Carregando unidades...' : 'Selecione uma unidade...'}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
            </button>

            {unidadeOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                <div className="p-1.5 border-b border-border">
                  <Input
                    autoFocus
                    placeholder="Digite 2+ letras para buscar..."
                    value={unidadeSearch}
                    onChange={(e) => setUnidadeSearch(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {selectedUnidade && (
                    <button
                      className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
                      onClick={() => {
                        update('metadata_extra', { ...meta, unidade_sei_id: null, unidade_sei_sigla: null, unidade_sei_descricao: null });
                        setUnidadeOpen(false);
                      }}
                    >
                      Limpar seleção
                    </button>
                  )}
                  {debouncedSearch.trim().length < 2 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Digite para buscar entre 9000+ unidades...</p>
                  )}
                  {debouncedSearch.trim().length >= 2 && loadingUnidades && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Buscando...</p>
                  )}
                  {debouncedSearch.trim().length >= 2 && !loadingUnidades && unidades.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Nenhuma unidade encontrada.</p>
                  )}
                  {unidades.map((u) => (
                    <button
                      key={u.Id}
                      className={cn(
                        'w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors',
                        selectedUnidadeId === u.Id && 'bg-accent font-medium',
                      )}
                      onClick={() => {
                        update('metadata_extra', { ...meta, unidade_sei_id: u.Id, unidade_sei_sigla: u.Sigla, unidade_sei_descricao: u.Descricao });
                        setUnidadeOpen(false);
                      }}
                    >
                      <span className="font-medium">{u.Sigla}</span>
                      <span className="text-muted-foreground ml-1">{u.Descricao}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Prioridade — botões coloridos */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {/* Nenhuma */}
            <button
              onClick={() => update('prioridade', null)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                !prioridade
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:border-muted-foreground',
              )}
            >
              Nenhuma
            </button>
            {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => update('prioridade', key)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-semibold border transition-all',
                  prioridade === key
                    ? cn(cfg.bg, cfg.color, cfg.border, 'ring-2 ring-offset-1', cfg.border.replace('border-', 'ring-'))
                    : cn('bg-background border-border hover:border-muted-foreground', cfg.color),
                )}
              >
                {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Documentos necessários */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Documentos necessários</label>

          {/* Pills dos documentos selecionados */}
          {documentos.filter(Boolean).length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {documentos.filter(Boolean).map((doc, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent border border-border"
                >
                  <span className="max-w-[180px] truncate">{doc}</span>
                  <button
                    type="button"
                    className="hover:text-destructive transition-colors shrink-0"
                    onClick={() => update('documentos_necessarios', documentos.filter((_, j) => j !== i))}
                    title="Remover"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Seletor com busca */}
          <div ref={docRef} className="relative mt-1.5">
            <button
              type="button"
              className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
              onClick={() => { setDocDropdownOpen((v) => !v); setDocSearch(''); }}
            >
              <span className="text-muted-foreground">Adicionar documento...</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
            </button>

            {docDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                <div className="p-1.5 border-b border-border">
                  <Input
                    autoFocus
                    placeholder="Buscar tipo de documento..."
                    value={docSearch}
                    onChange={(e) => setDocSearch(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {loadingTipos && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Buscando...</p>
                  )}

                  {/* Opção de adicionar manualmente se digitou algo que não está na lista */}
                  {docSearch.trim() && !documentos.includes(docSearch.trim()) && (
                    <button
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors flex items-center gap-1.5 border-b border-border"
                      onClick={() => {
                        update('documentos_necessarios', [...documentos.filter(Boolean), docSearch.trim()]);
                        setDocDropdownOpen(false);
                        setDocSearch('');
                      }}
                    >
                      <Plus className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>Adicionar <strong>"{docSearch.trim()}"</strong> manualmente</span>
                    </button>
                  )}

                  {!loadingTipos && tiposDocumento.length === 0 && !docSearch.trim() && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      Digite para buscar ou adicionar um documento...
                    </p>
                  )}

                  {tiposDocumento
                    .filter((t) => !documentos.includes(t.nome))
                    .map((tipo) => (
                      <button
                        key={tipo.id}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors"
                        onClick={() => {
                          update('documentos_necessarios', [...documentos.filter(Boolean), tipo.nome]);
                          setDocDropdownOpen(false);
                          setDocSearch('');
                        }}
                      >
                        {tipo.nome}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Checklist */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Checklist</label>
          <div className="mt-1 space-y-1">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-1">
                <input
                  type="checkbox"
                  checked={item.obrigatorio}
                  onChange={(e) => {
                    const updated = [...checklist];
                    updated[i] = { ...item, obrigatorio: e.target.checked };
                    update('checklist', updated);
                  }}
                  title="Obrigatório"
                  className="mt-2.5"
                />
                <AutoResizeTextarea
                  value={item.item}
                  onChange={(e) => {
                    const updated = [...checklist];
                    updated[i] = { ...item, item: e.target.value };
                    update('checklist', updated);
                  }}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Item..."
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => update('checklist', checklist.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => update('checklist', [...checklist, { item: '', obrigatorio: false }])}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar item
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
