'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus, Trash2, ChevronDown, FileText, Inbox, PenTool, Paperclip, Send, CheckSquare, Zap, ClipboardList, Settings, Play } from 'lucide-react';
import type { Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { useUnidadesSei } from '@/hooks/use-unidades-sei';
import { useTiposDocumento } from '@/hooks/use-tipos-documento';

// ── Helpers ──

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

// ── Types ──

export interface ActionUnidade {
  id: string;
  sigla: string;
  descricao?: string;
  responsavel?: string;
}

export interface NodeAction {
  tipo: string;
  /** For actions with a single unidade (structured). */
  unidade_sel?: ActionUnidade | null;
  /** For tramitação: multiple target unidades. */
  unidades?: ActionUnidade[];
  responsavel?: string;
  dependente_de?: number | null;
  /** For documento actions: single document type */
  documento_tipo?: string;
  /** For documento actions: which signature type is auto-generated */
  assinatura_tipo?: 'assinatura' | 'bloco_assinatura';
  /** For assinatura: single responsavel. For bloco_assinatura: multiple responsaveis. */
  assinatura_responsaveis?: string[];
  /** For tramitação: whether it triggers automatic conclusion in the current unit. */
  conclusao_automatica?: boolean;
  /** True if this action depends on a tramitação from the previous step (cross-step dependency). */
  dependente_etapa_anterior?: boolean;
  /** For tramitação: unidade selection mode. */
  tramitacao_modo?: 'qualquer' | 'especifica' | 'hierarquia';
}

export interface ChecklistItem {
  item: string;
  obrigatorio: boolean;
  responsavel?: string;
}

// ── Constants ──

/** All known action types (for display labels/icons). */
const ALL_ACTION_TYPES: Record<string, { label: string; icon: React.ReactNode }> = {
  geracao_procedimento: { label: 'Geração do Procedimento', icon: <Play className="h-3.5 w-3.5" /> },
  documento: { label: 'Documento', icon: <FileText className="h-3.5 w-3.5" /> },
  recebimento: { label: 'Recebimento', icon: <Inbox className="h-3.5 w-3.5" /> },
  assinatura: { label: 'Assinatura', icon: <PenTool className="h-3.5 w-3.5" /> },
  bloco_assinatura: { label: 'Bloco de Assinatura', icon: <PenTool className="h-3.5 w-3.5" /> },
  anexo: { label: 'Anexo', icon: <Paperclip className="h-3.5 w-3.5" /> },
  tramitacao: { label: 'Tramitação', icon: <Send className="h-3.5 w-3.5" /> },
  conclusao: { label: 'Conclusão', icon: <CheckSquare className="h-3.5 w-3.5" /> },
};

/** Selectable action types (excludes auto-generated ones like assinatura/bloco). */
const SELECTABLE_ACTION_TYPES = [
  { value: 'geracao_procedimento', label: 'Geração do Procedimento', icon: <Play className="h-3.5 w-3.5" /> },
  { value: 'documento', label: 'Documento', icon: <FileText className="h-3.5 w-3.5" /> },
  { value: 'recebimento', label: 'Recebimento', icon: <Inbox className="h-3.5 w-3.5" /> },
  { value: 'anexo', label: 'Anexo', icon: <Paperclip className="h-3.5 w-3.5" /> },
  { value: 'tramitacao', label: 'Tramitação', icon: <Send className="h-3.5 w-3.5" /> },
  { value: 'conclusao', label: 'Conclusão', icon: <CheckSquare className="h-3.5 w-3.5" /> },
];

/** Action types not allowed on inicio nodes. */
const INICIO_EXCLUDED_TYPES = new Set(['recebimento']);

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  baixa:   { label: 'Baixa',   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300' },
  media:   { label: 'Média',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-300' },
  alta:    { label: 'Alta',    color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300' },
  critica: { label: 'Crítica', color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' },
};

const NODE_TYPE_LABEL: Record<string, string> = {
  inicio: 'Início', fim: 'Fim', decisao: 'Decisão', fork: 'Fork', join: 'Join',
  etapa: 'Etapa', sei_task: 'Tarefa SEI',
};


// ── Props ──

interface NodePropertiesPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onChangeType?: (nodeId: string, newType: string) => void;
  onClose: () => void;
  onDelete?: (nodeId: string) => void;
}

// ── Unidade Picker (extracted for reuse) ──

function UnidadePicker({ value, onChange, label }: {
  value: { id?: string; sigla?: string; descricao?: string } | null;
  onChange: (val: { id: string; sigla: string; descricao: string } | null) => void;
  label?: string;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data: unidades = [], isFetching } = useUnidadesSei(debounced);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div>
      {label && <label className="text-xs font-medium text-muted-foreground">{label}</label>}
      <div ref={ref} className="relative mt-1">
        <button
          type="button"
          className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
          onClick={() => { setOpen(v => !v); setSearch(''); }}
        >
          {value?.sigla ? (
            <span className="truncate">
              <span className="font-medium">{value.sigla}</span>
              {value.descricao && <span className="text-muted-foreground ml-1 text-xs">— {value.descricao}</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">Selecione...</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 ml-1" />
        </button>
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
            <div className="p-1.5 border-b border-border">
              <Input autoFocus placeholder="Digite 2+ letras..." value={search} onChange={e => setSearch(e.target.value)} className="h-7 text-xs" />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {value?.sigla && (
                <button className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent" onClick={() => { onChange(null); setOpen(false); }}>
                  Limpar seleção
                </button>
              )}
              {debounced.trim().length < 2 && <p className="px-3 py-2 text-xs text-muted-foreground">Digite para buscar...</p>}
              {debounced.trim().length >= 2 && isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">Buscando...</p>}
              {debounced.trim().length >= 2 && !isFetching && unidades.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">Nenhuma unidade encontrada.</p>}
              {unidades.map(u => (
                <button key={u.Id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent" onClick={() => { onChange({ id: u.Id, sigla: u.Sigla, descricao: u.Descricao }); setOpen(false); }}>
                  <span className="font-medium">{u.Sigla}</span> <span className="text-muted-foreground">{u.Descricao}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Document Type Picker (for documento actions) ──

function DocumentTypePicker({ excludeNames, onSelect }: {
  excludeNames: string[];
  onSelect: (nome: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: tipos = [], isFetching } = useTiposDocumento(debounced);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as globalThis.Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative mt-1.5">
      <button
        type="button"
        className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-xs text-left hover:bg-accent transition-colors"
        onClick={() => { setOpen(v => !v); setSearch(''); }}
      >
        <span className="text-muted-foreground">Adicionar tipo...</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 ml-1" />
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-border">
            <Input autoFocus placeholder="Buscar tipo de documento..." value={search} onChange={e => setSearch(e.target.value)} className="h-7 text-xs" />
          </div>
          <div className="max-h-44 overflow-y-auto">
            {isFetching && <p className="px-3 py-2 text-xs text-muted-foreground">Buscando...</p>}
            {!isFetching && tipos.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {debounced.trim().length >= 2 ? 'Nenhum tipo encontrado.' : 'Digite para buscar...'}
              </p>
            )}
            {tipos.filter(t => !excludeNames.includes(t.nome)).map(tipo => (
              <button key={tipo.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors" onClick={() => { onSelect(tipo.nome); setOpen(false); setSearch(''); }}>
                {tipo.nome}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

export default function NodePropertiesPanel({ node, onUpdate, onChangeType, onClose, onDelete }: NodePropertiesPanelProps) {
  if (!node) return null;

  const d = node.data as Record<string, unknown>;
  const meta = (d.metadata_extra as Record<string, unknown>) || {};
  const prioridade = (d.prioridade as string) || '';
  const documentos = (d.documentos_necessarios as string[]) || [];
  const checklist = (d.checklist as ChecklistItem[]) || [];
  const acoes = (d.acoes as NodeAction[]) || [];

  const update = (key: string, value: unknown) => {
    onUpdate(node.id, { ...d, [key]: value });
  };

  const isInicio = node.type === 'inicio';

  // Auto-ensure geracao_procedimento action for inicio nodes
  if (isInicio && !acoes.some(a => a.tipo === 'geracao_procedimento')) {
    const withGeracao: NodeAction[] = [{ tipo: 'geracao_procedimento', responsavel: '', dependente_de: null }, ...acoes];
    // Schedule update for next tick to avoid render-during-render
    setTimeout(() => update('acoes', withGeracao), 0);
  }

  // Unidade from metadata (for the node-level unidade picker in Dados Essenciais)
  const nodeUnidade = meta.unidade_sei_id
    ? { id: meta.unidade_sei_id as string, sigla: meta.unidade_sei_sigla as string, descricao: meta.unidade_sei_descricao as string }
    : null;

  return (
    <div className="w-96 border-l border-border bg-card overflow-y-auto flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="min-w-0">
          <p className="text-2xs text-muted-foreground uppercase tracking-wide">
            {NODE_TYPE_LABEL[node.type || ''] || node.type}
          </p>
          <h3 className="text-sm font-semibold truncate">{(d.nome as string) || 'Sem nome'}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {onDelete && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-destructive/10" onClick={() => { onDelete(node.id); onClose(); }} title="Excluir nó">
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={['dados', 'acoes', 'checklist', 'automacoes']} className="w-full">

          {/* ── DADOS ESSENCIAIS ── */}
          <AccordionItem value="dados" className="border-b border-border">
            <AccordionTrigger className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> Dados Essenciais</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-3">
              {/* Tipo */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                {isInicio ? (
                  <div className="mt-1 flex items-center px-3 py-1.5 rounded-md border border-input bg-background text-xs text-muted-foreground">
                    Início
                  </div>
                ) : (
                  <Select
                    value={node.type || 'etapa'}
                    onValueChange={(v) => {
                      if (onChangeType) {
                        onChangeType(node.id, v);
                        update('tipo', v);
                      }
                    }}
                    disabled={!onChangeType}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="etapa">Etapa</SelectItem>
                      <SelectItem value="fim">Fim</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Nome */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <Input value={(d.nome as string) || ''} onChange={e => update('nome', e.target.value)} className="mt-1" />
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                <AutoResizeTextarea
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={(d.descricao as string) || ''}
                  onChange={e => update('descricao', e.target.value)}
                />
              </div>

              {/* Unidade */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Unidade</label>
                  <Select
                    value={(meta.unidade_modo as string) || 'qualquer'}
                    onValueChange={(v) => {
                      const newMeta: Record<string, unknown> = { ...meta, unidade_modo: v };
                      if (v === 'qualquer') {
                        newMeta.unidade_sei_id = null;
                        newMeta.unidade_sei_sigla = null;
                        newMeta.unidade_sei_descricao = null;
                      }
                      update('metadata_extra', newMeta);
                    }}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qualquer">Qualquer unidade</SelectItem>
                      <SelectItem value="especifica">Unidade específica</SelectItem>
                      <SelectItem value="hierarquia">Unidade e subordinadas</SelectItem>
                    </SelectContent>
                  </Select>
                  {((meta.unidade_modo as string) === 'especifica' || (meta.unidade_modo as string) === 'hierarquia') && (
                    <div className="mt-1.5">
                      <UnidadePicker
                        value={nodeUnidade}
                        onChange={(val) => {
                          update('metadata_extra', {
                            ...meta,
                            unidade_sei_id: val?.id ?? null,
                            unidade_sei_sigla: val?.sigla ?? null,
                            unidade_sei_descricao: val?.descricao ?? null,
                          });
                        }}
                      />
                      {(meta.unidade_modo as string) === 'hierarquia' && nodeUnidade?.sigla && (
                        <p className="text-2xs text-muted-foreground mt-1">
                          Inclui {nodeUnidade.sigla} e todas suas subordinadas
                        </p>
                      )}
                    </div>
                  )}
                </div>

              {/* Responsável */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Responsável</label>
                <Input value={(d.responsavel as string) || ''} onChange={e => update('responsavel', e.target.value)} className="mt-1" />
              </div>

              {/* Prioridade */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => update('prioridade', null)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                      !prioridade ? 'bg-foreground text-background border-foreground' : 'bg-background text-muted-foreground border-border hover:border-muted-foreground',
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

            </AccordionContent>
          </AccordionItem>

          {/* ── AÇÕES ── */}
          <AccordionItem value="acoes" className="border-b border-border">
            <AccordionTrigger className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Ações <span className="font-normal text-muted-foreground/70">({acoes.length})</span></span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-2">
              {acoes.map((acao, i) => {
                const actionType = ALL_ACTION_TYPES[acao.tipo];
                const isGeracao = acao.tipo === 'geracao_procedimento';
                const isLocked = isGeracao && isInicio;
                return (
                  <div key={i} className={cn('rounded-md border p-2.5 space-y-2', isLocked ? 'border-green-300 bg-green-50/50' : 'border-border bg-muted/30')}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium">
                        {actionType?.icon}
                        <span>{actionType?.label || 'Ação'} #{i + 1}</span>
                        {isLocked && <span className="text-2xs text-muted-foreground font-normal">(obrigatória)</span>}
                      </div>
                      {!isLocked && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => update('acoes', acoes.filter((_, j) => j !== i))}>
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      )}
                    </div>

                    {/* Tipo — locked for mandatory geracao_procedimento */}
                    {isLocked ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-xs text-muted-foreground">
                        <Play className="h-3.5 w-3.5" /> Geração do Procedimento
                      </div>
                    ) : (
                      <Select value={acao.tipo} onValueChange={(v) => { const updated = [...acoes]; updated[i] = { ...acao, tipo: v }; update('acoes', updated); }}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Tipo de ação" />
                        </SelectTrigger>
                        <SelectContent>
                          {SELECTABLE_ACTION_TYPES
                            .filter(at => !(isInicio && INICIO_EXCLUDED_TYPES.has(at.value)))
                            .map(at => (
                            <SelectItem key={at.value} value={at.value}>
                              <span className="flex items-center gap-1.5">{at.icon} {at.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* Unidade — per action type */}
                    {isGeracao ? null : acao.tipo === 'tramitacao' ? (
                      /* Tramitação: mode selector + unidade(s) destino + conclusão automática */
                      <>
                        <div>
                          <label className="text-2xs font-medium text-muted-foreground">Destino</label>
                          <Select
                            value={acao.tramitacao_modo || 'especifica'}
                            onValueChange={(v) => {
                              const updated = [...acoes];
                              const newAcao = { ...acao, tramitacao_modo: v as 'qualquer' | 'especifica' | 'hierarquia' };
                              if (v === 'qualquer') {
                                // Remove specific unidades and their auto-created etapa nodes
                                const deleteNode = (window as unknown as Record<string, unknown>).__flowEditorDeleteNode as
                                  | ((id: string) => void) | undefined;
                                const allNodes = ((window as unknown as Record<string, unknown>).__flowEditorNodes as Array<{ id: string; type?: string; data: Record<string, unknown> }>) || [];
                                const allEdges = ((window as unknown as Record<string, unknown>).__flowEditorEdges as Array<{ source: string; target: string }>) || [];
                                if (deleteNode && node) {
                                  for (const u of (acao.unidades || [])) {
                                    const etapa = allNodes.find(n =>
                                      n.type === 'etapa' &&
                                      (n.data.metadata_extra as Record<string, unknown> | undefined)?.unidade_sei_id === u.id &&
                                      allEdges.some(e => e.source === node.id && e.target === n.id)
                                    );
                                    if (etapa) deleteNode(etapa.id);
                                  }
                                }
                                newAcao.unidades = [];

                                // Auto-create etapa node with qualquer unidade
                                const addConnected = (window as unknown as Record<string, unknown>).__flowEditorAddConnectedNode as
                                  | ((sourceId: string, tipo: string, nome: string, data?: Record<string, unknown>) => string | null)
                                  | undefined;
                                if (addConnected && node) {
                                  addConnected(node.id, 'etapa', 'Qualquer Unidade', {
                                    metadata_extra: { unidade_modo: 'qualquer' },
                                    acoes: [{ tipo: 'recebimento', responsavel: '', dependente_de: null, dependente_etapa_anterior: true }],
                                  });
                                }
                              }
                              updated[i] = newAcao;
                              update('acoes', updated);
                            }}
                          >
                            <SelectTrigger className="mt-1 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="qualquer">Qualquer unidade</SelectItem>
                              <SelectItem value="especifica">Unidade(s) específica(s)</SelectItem>
                              <SelectItem value="hierarquia">Unidade e subordinadas</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Unidades list — only for especifica and hierarquia modes */}
                        {(acao.tramitacao_modo || 'especifica') !== 'qualquer' && (
                          <div>
                            <label className="text-2xs font-medium text-muted-foreground">Unidade(s) destino</label>
                            {(acao.unidades || []).map((u, ui) => (
                              <div key={ui} className="rounded-md border border-border p-2 mt-1.5 space-y-1.5 bg-background">
                                <div className="flex items-center gap-1">
                                  <span className="flex-1 text-xs font-medium truncate">{u.sigla}</span>
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0" onClick={() => {
                                    const updated = [...acoes];
                                    updated[i] = { ...acao, unidades: (acao.unidades || []).filter((_, uj) => uj !== ui) };
                                    update('acoes', updated);

                                    // Delete the auto-created etapa node for this unidade
                                    const deleteNode = (window as unknown as Record<string, unknown>).__flowEditorDeleteNode as
                                      | ((id: string) => void) | undefined;
                                    const allNodes = ((window as unknown as Record<string, unknown>).__flowEditorNodes as Array<{ id: string; type?: string; data: Record<string, unknown> }>) || [];
                                    const allEdges = ((window as unknown as Record<string, unknown>).__flowEditorEdges as Array<{ source: string; target: string }>) || [];
                                    if (deleteNode && node) {
                                      const connectedEtapa = allNodes.find(n =>
                                        n.type === 'etapa' &&
                                        (n.data.metadata_extra as Record<string, unknown> | undefined)?.unidade_sei_id === u.id &&
                                        allEdges.some(e => e.source === node.id && e.target === n.id)
                                      );
                                      if (connectedEtapa) deleteNode(connectedEtapa.id);
                                    }
                                  }}>
                                    <X className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                </div>
                                {u.descricao && <p className="text-2xs text-muted-foreground truncate">{u.descricao}</p>}
                                {(acao.tramitacao_modo || 'especifica') === 'hierarquia' && (
                                  <p className="text-2xs text-muted-foreground/70">Inclui subordinadas</p>
                                )}
                                <Input
                                  placeholder="Responsável (opcional)"
                                  value={u.responsavel || ''}
                                  onChange={e => {
                                    const updated = [...acoes];
                                    const newUnidades = [...(acao.unidades || [])];
                                    newUnidades[ui] = { ...u, responsavel: e.target.value };
                                    updated[i] = { ...acao, unidades: newUnidades };
                                    update('acoes', updated);
                                  }}
                                  className="h-7 text-xs"
                                />
                              </div>
                            ))}
                            <UnidadePicker
                              value={null}
                              onChange={(val) => {
                                if (!val) return;
                                const existing = acao.unidades || [];
                                if (existing.some(u => u.id === val.id)) return;
                                const updated = [...acoes];
                                updated[i] = { ...acao, unidades: [...existing, { id: val.id, sigla: val.sigla, descricao: val.descricao, responsavel: '' }] };
                                update('acoes', updated);

                                // Auto-create etapa node connected to this node with mandatory recebimento
                                const addConnected = (window as unknown as Record<string, unknown>).__flowEditorAddConnectedNode as
                                  | ((sourceId: string, tipo: string, nome: string, data?: Record<string, unknown>) => string | null)
                                  | undefined;
                                if (addConnected && node) {
                                  addConnected(node.id, 'etapa', val.sigla, {
                                    metadata_extra: {
                                      unidade_sei_id: val.id,
                                      unidade_sei_sigla: val.sigla,
                                      unidade_sei_descricao: val.descricao,
                                      unidade_modo: (acao.tramitacao_modo || 'especifica') as string,
                                    },
                                    acoes: [{ tipo: 'recebimento', unidade_sel: { id: val.id, sigla: val.sigla, descricao: val.descricao }, responsavel: '', dependente_de: null, dependente_etapa_anterior: true }],
                                  });
                                }
                              }}
                            />
                          </div>
                        )}

                        {/* Qualquer unidade — responsável geral */}
                        {(acao.tramitacao_modo) === 'qualquer' && (
                          <Input
                            placeholder="Responsável pela tramitação (opcional)"
                            value={acao.responsavel || ''}
                            onChange={e => { const updated = [...acoes]; updated[i] = { ...acao, responsavel: e.target.value }; update('acoes', updated); }}
                            className="h-8 text-xs"
                          />
                        )}

                        {/* Conclusão automática */}
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="checkbox"
                            id={`conclusao-auto-${i}`}
                            checked={acao.conclusao_automatica ?? false}
                            onChange={e => { const updated = [...acoes]; updated[i] = { ...acao, conclusao_automatica: e.target.checked }; update('acoes', updated); }}
                          />
                          <label htmlFor={`conclusao-auto-${i}`} className="text-xs text-muted-foreground cursor-pointer">
                            Conclusão automática na unidade atual
                          </label>
                        </div>
                      </>
                    ) : acao.tipo !== 'documento' ? (
                      /* Other actions: single unidade picker */
                      <UnidadePicker
                        label="Unidade"
                        value={acao.unidade_sel || null}
                        onChange={(val) => {
                          const updated = [...acoes];
                          updated[i] = { ...acao, unidade_sel: val ? { id: val.id, sigla: val.sigla, descricao: val.descricao } : null };
                          update('acoes', updated);
                        }}
                      />
                    ) : null}

                    {/* Documento action: single doc type + signature config */}
                    {acao.tipo === 'documento' && (() => {
                      const sigResps = acao.assinatura_responsaveis || [];
                      const isBloco = acao.assinatura_tipo === 'bloco_assinatura';
                      return (
                        <>
                          {/* Single document type */}
                          <div>
                            <label className="text-2xs font-medium text-muted-foreground">Tipo de documento</label>
                            {acao.documento_tipo ? (
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-accent border border-border flex-1 min-w-0">
                                  <FileText className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{acao.documento_tipo}</span>
                                </span>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => { const updated = [...acoes]; updated[i] = { ...acao, documento_tipo: undefined }; update('acoes', updated); }}>
                                  <X className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </div>
                            ) : (
                              <DocumentTypePicker
                                excludeNames={[]}
                                onSelect={(nome) => { const updated = [...acoes]; updated[i] = { ...acao, documento_tipo: nome }; update('acoes', updated); }}
                              />
                            )}
                          </div>

                          {/* Signature type */}
                          <div>
                            <label className="text-2xs font-medium text-muted-foreground">Tipo de assinatura</label>
                            <Select
                              value={acao.assinatura_tipo || 'assinatura'}
                              onValueChange={(v) => {
                                const updated = [...acoes];
                                const newAcao = { ...acao, assinatura_tipo: v as 'assinatura' | 'bloco_assinatura' };
                                // When switching to assinatura, keep only first responsavel
                                if (v === 'assinatura' && sigResps.length > 1) {
                                  newAcao.assinatura_responsaveis = [sigResps[0]];
                                }
                                updated[i] = newAcao;
                                update('acoes', updated);
                              }}
                            >
                              <SelectTrigger className="mt-1 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="assinatura">Assinatura (1 responsável)</SelectItem>
                                <SelectItem value="bloco_assinatura">Bloco de Assinatura (N responsáveis)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Signature responsaveis */}
                          <div>
                            <label className="text-2xs font-medium text-muted-foreground">
                              {isBloco ? 'Responsáveis pela assinatura' : 'Responsável pela assinatura'}
                            </label>
                            {sigResps.map((resp, ri) => (
                              <div key={ri} className="flex items-center gap-1 mt-1">
                                <Input
                                  placeholder="Nome ou unidade"
                                  value={resp}
                                  onChange={e => {
                                    const updated = [...acoes];
                                    const newResps = [...sigResps];
                                    newResps[ri] = e.target.value;
                                    updated[i] = { ...acao, assinatura_responsaveis: newResps };
                                    update('acoes', updated);
                                  }}
                                  className="h-7 text-xs flex-1"
                                />
                                {(isBloco || sigResps.length > 1) && (
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => {
                                    const updated = [...acoes];
                                    updated[i] = { ...acao, assinatura_responsaveis: sigResps.filter((_, rj) => rj !== ri) };
                                    update('acoes', updated);
                                  }}>
                                    <X className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                )}
                              </div>
                            ))}
                            {(isBloco || sigResps.length === 0) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full mt-1.5 h-7 text-xs"
                                onClick={() => {
                                  // For assinatura (not bloco), only allow 1
                                  if (!isBloco && sigResps.length >= 1) return;
                                  const updated = [...acoes];
                                  updated[i] = { ...acao, assinatura_responsaveis: [...sigResps, ''] };
                                  update('acoes', updated);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" /> Adicionar responsável
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}

                    {/* Responsável — hidden for documento, tramitação, and geracao_procedimento (managed elsewhere) */}
                    {acao.tipo !== 'documento' && acao.tipo !== 'tramitacao' && acao.tipo !== 'geracao_procedimento' && (
                      <Input
                        placeholder="Responsável (opcional)"
                        value={acao.responsavel || ''}
                        onChange={e => { const updated = [...acoes]; updated[i] = { ...acao, responsavel: e.target.value }; update('acoes', updated); }}
                        className="h-8 text-xs"
                      />
                    )}

                    {/* Dependência: every action depends on another */}
                    {(() => {
                      const isFirst = i === 0;
                      const hasCrossStepDep = acao.dependente_etapa_anterior;
                      // Effective dependency: first action has none, others default to first (index 0)
                      const effectiveDep = isFirst ? null : (acao.dependente_de ?? 0);

                      if (isFirst && isLocked) {
                        // geracao_procedimento — primeira ação, sem dependência
                        return null;
                      }

                      if (isFirst) {
                        return (
                          <div>
                            <label className="text-2xs font-medium text-muted-foreground">Acontece após</label>
                            <div className="mt-1 px-3 py-1.5 rounded-md border border-input bg-background text-xs text-muted-foreground">
                              {hasCrossStepDep ? 'Tramitação da etapa anterior' : 'Primeira ação da etapa'}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div>
                          <label className="text-2xs font-medium text-muted-foreground">Acontece após</label>
                          {hasCrossStepDep ? (
                            <div className="mt-1 px-3 py-1.5 rounded-md border border-input bg-background text-xs text-muted-foreground">
                              Tramitação da etapa anterior
                            </div>
                          ) : (
                            <Select
                              value={String(effectiveDep)}
                              onValueChange={(v) => { const updated = [...acoes]; updated[i] = { ...acao, dependente_de: Number(v) }; update('acoes', updated); }}
                            >
                              <SelectTrigger className="mt-1 h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {acoes.map((other, j) => {
                                  if (j === i) return null;
                                  const otherType = ALL_ACTION_TYPES[other.tipo];
                                  return <SelectItem key={j} value={String(j)}>{otherType?.label || 'Ação'} #{j + 1}</SelectItem>;
                                })}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => update('acoes', [...acoes, { tipo: 'documento', responsavel: '', dependente_de: null }])}
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar ação
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ── CHECKLIST ── */}
          <AccordionItem value="checklist" className="border-b border-border">
            <AccordionTrigger className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" /> Checklist <span className="font-normal text-muted-foreground/70">({checklist.length})</span></span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3 space-y-2">
              {checklist.map((item, i) => (
                <div key={i} className="rounded-md border border-border p-2 space-y-1.5 bg-muted/30">
                  <div className="flex items-start gap-1.5">
                    <input
                      type="checkbox"
                      checked={item.obrigatorio}
                      onChange={e => { const updated = [...checklist]; updated[i] = { ...item, obrigatorio: e.target.checked }; update('checklist', updated); }}
                      title="Obrigatório"
                      className="mt-2"
                    />
                    <AutoResizeTextarea
                      value={item.item}
                      onChange={e => { const updated = [...checklist]; updated[i] = { ...item, item: e.target.value }; update('checklist', updated); }}
                      className="flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs"
                      placeholder="Item..."
                    />
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => update('checklist', checklist.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                  <Input
                    placeholder="Responsável"
                    value={item.responsavel || ''}
                    onChange={e => { const updated = [...checklist]; updated[i] = { ...item, responsavel: e.target.value }; update('checklist', updated); }}
                    className="h-7 text-xs ml-5"
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => update('checklist', [...checklist, { item: '', obrigatorio: false, responsavel: '' }])}
              >
                <Plus className="h-3 w-3 mr-1" /> Adicionar item
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* ── AUTOMAÇÕES ── */}
          <AccordionItem value="automacoes" className="border-b border-border">
            <AccordionTrigger className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:no-underline">
              <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Automações</span>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
              <p className="text-xs text-muted-foreground py-2 text-center">Em breve</p>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
    </div>
  );
}
