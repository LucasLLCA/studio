'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2, Search, Loader2 } from 'lucide-react';
import type { Node } from '@xyflow/react';
import { fetchUnidadesSei } from '@/lib/api/unidades-api-client';
import type { UnidadeSei } from '@/types/fluxos';

interface NodePropertiesPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

// ── Shared unidade search dropdown ──────────────────────────

function UnidadeSearchDropdown({
  onSelect,
  selectedIds,
}: {
  onSelect: (unit: UnidadeSei) => void;
  selectedIds: Set<number>;
}) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [results, setResults] = useState<UnidadeSei[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    fetchUnidadesSei(debouncedSearch, 1, 30)
      .then((res) => { if (!cancelled) setResults(res.items); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, isOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar caixa/unidade..."
          className="pl-7 h-8 text-xs"
        />
      </div>
      {isOpen && (
        <div className="mt-1 border border-border rounded-md max-h-40 overflow-y-auto bg-popover shadow-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-3">
              {debouncedSearch ? 'Nenhuma unidade encontrada' : 'Digite para buscar'}
            </div>
          ) : (
            results.map((unit) => {
              const isSelected = selectedIds.has(unit.id_unidade);
              return (
                <button
                  key={unit.id_unidade}
                  onClick={() => onSelect(unit)}
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors ${
                    isSelected ? 'bg-accent/50 font-medium' : ''
                  }`}
                >
                  <div className="font-medium">{unit.sigla}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{unit.descricao}</div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Início: multi-select unidades ───────────────────────────

function UnidadeMultiSelect({
  selected,
  onChange,
}: {
  selected: Array<{ id_unidade: number; sigla: string }>;
  onChange: (value: Array<{ id_unidade: number; sigla: string }>) => void;
}) {
  const [isAny, setIsAny] = useState(selected.length === 0);
  const selectedIds = new Set(selected.map((s) => s.id_unidade));

  const handleAnyToggle = () => {
    if (isAny) {
      setIsAny(false);
    } else {
      setIsAny(true);
      onChange([]);
    }
  };

  const toggleUnit = useCallback((unit: UnidadeSei) => {
    const exists = selected.some((s) => s.id_unidade === unit.id_unidade);
    if (exists) {
      onChange(selected.filter((s) => s.id_unidade !== unit.id_unidade));
    } else {
      onChange([...selected, { id_unidade: unit.id_unidade, sigla: unit.sigla }]);
    }
  }, [selected, onChange]);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
        <input type="checkbox" checked={isAny} onChange={handleAnyToggle} className="rounded" />
        Qualquer caixa/unidade
      </label>

      {!isAny && (
        <>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selected.map((u) => (
                <Badge key={u.id_unidade} variant="secondary" className="text-[10px] gap-1 pr-1">
                  {u.sigla}
                  <button
                    onClick={() => onChange(selected.filter((s) => s.id_unidade !== u.id_unidade))}
                    className="hover:text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <UnidadeSearchDropdown onSelect={toggleUnit} selectedIds={selectedIds} />
        </>
      )}
    </div>
  );
}

// ── Etapa: unidade selector with "incluir filhas" toggle ────

interface UnidadeEtapaItem {
  id_unidade: number;
  sigla: string;
  incluir_filhas: boolean;
}

function UnidadeEtapaSelect({
  selected,
  onChange,
}: {
  selected: UnidadeEtapaItem[];
  onChange: (value: UnidadeEtapaItem[]) => void;
}) {
  const [isAny, setIsAny] = useState(selected.length === 0);
  const selectedIds = new Set(selected.map((s) => s.id_unidade));

  const handleAnyToggle = () => {
    if (isAny) {
      setIsAny(false);
    } else {
      setIsAny(true);
      onChange([]);
    }
  };

  const addUnit = useCallback((unit: UnidadeSei) => {
    if (selected.some((s) => s.id_unidade === unit.id_unidade)) {
      onChange(selected.filter((s) => s.id_unidade !== unit.id_unidade));
    } else {
      onChange([...selected, { id_unidade: unit.id_unidade, sigla: unit.sigla, incluir_filhas: false }]);
    }
  }, [selected, onChange]);

  const toggleFilhas = useCallback((id: number) => {
    onChange(selected.map((s) =>
      s.id_unidade === id ? { ...s, incluir_filhas: !s.incluir_filhas } : s
    ));
  }, [selected, onChange]);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs cursor-pointer">
        <input type="checkbox" checked={isAny} onChange={handleAnyToggle} className="rounded" />
        Qualquer caixa/unidade
      </label>

      {!isAny && (
        <>
          {selected.length > 0 && (
            <div className="space-y-1">
              {selected.map((u) => (
                <div key={u.id_unidade} className="flex items-center gap-1 rounded border border-border px-2 py-1 bg-muted/30">
                  <span className="text-[10px] font-medium flex-1 truncate">{u.sigla}</span>
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={u.incluir_filhas}
                      onChange={() => toggleFilhas(u.id_unidade)}
                      className="rounded"
                    />
                    + filhas
                  </label>
                  <button
                    onClick={() => onChange(selected.filter((s) => s.id_unidade !== u.id_unidade))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <UnidadeSearchDropdown onSelect={addUnit} selectedIds={selectedIds} />
        </>
      )}
    </div>
  );
}

// ── Main panel ──────────────────────────────────────────────

export default function NodePropertiesPanel({ node, onUpdate, onClose }: NodePropertiesPanelProps) {
  if (!node) return null;

  const d = node.data as Record<string, unknown>;
  const isInicio = (d.tipo as string) === 'inicio' || node.type === 'inicio';
  const isEtapa = (d.tipo as string) === 'etapa' || node.type === 'etapa';

  const update = (key: string, value: unknown) => {
    onUpdate(node.id, { ...d, [key]: value });
  };

  const checklist = (d.checklist as Array<{ nome: string; descricao: string; obrigatorio: boolean }>) || [];
  const documentos = (d.documentos_necessarios as Array<{ nome: string; descricao: string }>) || [];
  const unidadesInicio = (d.unidades_inicio as Array<{ id_unidade: number; sigla: string }>) || [];
  const unidadesEtapa = (d.unidades_etapa as UnidadeEtapaItem[]) || [];
  const publicoAlvo = (d.publico_alvo as string) || 'publico';

  return (
    <div className="w-72 border-l border-border bg-card overflow-y-auto flex-shrink-0 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold">Propriedades</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="p-3 space-y-4 flex-1 overflow-y-auto">
        {/* ── Início-specific fields ── */}
        {isInicio && (
          <>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Público alvo</label>
              <div className="mt-1 flex rounded-md border border-input overflow-hidden">
                <button
                  onClick={() => update('publico_alvo', 'servidores')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                    publicoAlvo === 'servidores'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent'
                  }`}
                >
                  Apenas servidores
                </button>
                <button
                  onClick={() => update('publico_alvo', 'publico')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors ${
                    publicoAlvo === 'publico'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-accent'
                  }`}
                >
                  Público
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Caixa/Unidade de Origem</label>
              <div className="mt-1">
                <UnidadeMultiSelect
                  selected={unidadesInicio}
                  onChange={(value) => update('unidades_inicio', value)}
                />
              </div>
            </div>
          </>
        )}

        {/* ── Etapa-specific: unidade selector ── */}
        {isEtapa && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Caixa/Unidade da Etapa</label>
            <p className="text-[10px] text-muted-foreground mt-0.5 mb-1">
              Marque &quot;+ filhas&quot; para incluir sub-unidades (ex: SEAD-PI/GAB inclui SEAD-PI/GAB/NTGD)
            </p>
            <UnidadeEtapaSelect
              selected={unidadesEtapa}
              onChange={(value) => update('unidades_etapa', value)}
            />
          </div>
        )}

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
          <textarea
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={3}
            value={(d.descricao as string) || ''}
            onChange={(e) => update('descricao', e.target.value)}
          />
        </div>

        {/* Responsável (email institucional) */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Responsável</label>
          <div className="mt-1 flex items-center gap-0">
            <Input
              value={((d.responsavel as string) || '').replace(/@.*$/, '')}
              onChange={(e) => {
                const user = e.target.value.replace(/@.*$/, '').trim();
                const domain = ((d.responsavel_dominio as string) || 'orgao') + '.pi.gov.br';
                update('responsavel', user ? `${user}@${domain}` : '');
              }}
              placeholder="usuario"
              className="rounded-r-none border-r-0 flex-1"
            />
            <span className="inline-flex items-center px-2 py-2 border border-input bg-muted text-[10px] text-muted-foreground whitespace-nowrap rounded-r-md">
              @
              <input
                value={(d.responsavel_dominio as string) || 'orgao'}
                onChange={(e) => {
                  const domain = e.target.value.trim();
                  const user = ((d.responsavel as string) || '').replace(/@.*$/, '');
                  update('responsavel_dominio', domain);
                  if (user) update('responsavel', `${user}@${domain}.pi.gov.br`);
                }}
                className="w-12 bg-transparent border-none outline-none text-[10px]"
                placeholder="orgao"
              />
              .pi.gov.br
            </span>
          </div>
        </div>

        {/* Duração estimada (not for inicio) */}
        {!isInicio && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Duração estimada (horas)</label>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={(d.duracao_estimada_horas as number) || ''}
              onChange={(e) => update('duracao_estimada_horas', e.target.value ? parseFloat(e.target.value) : null)}
              className="mt-1"
            />
          </div>
        )}

        {/* Prioridade */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Prioridade</label>
          <select
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={(d.prioridade as string) || ''}
            onChange={(e) => update('prioridade', e.target.value || null)}
          >
            <option value="">Nenhuma</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="critica">Crítica</option>
          </select>
        </div>

        {/* Documentos necessários */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Documentos necessários</label>
          <div className="mt-1 space-y-2">
            {documentos.map((doc: { nome: string; descricao: string }, i: number) => (
              <div key={i} className="border border-border rounded-md p-2 space-y-1">
                <div className="flex items-center gap-1">
                  <Input
                    value={doc.nome}
                    onChange={(e) => {
                      const updated = [...documentos];
                      updated[i] = { ...doc, nome: e.target.value };
                      update('documentos_necessarios', updated);
                    }}
                    placeholder="Nome do documento"
                    className="flex-1 h-7 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => update('documentos_necessarios', documentos.filter((_: unknown, j: number) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={doc.descricao}
                  onChange={(e) => {
                    const updated = [...documentos];
                    updated[i] = { ...doc, descricao: e.target.value };
                    update('documentos_necessarios', updated);
                  }}
                  placeholder="Descrição"
                  className="h-7 text-xs text-muted-foreground"
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => update('documentos_necessarios', [...documentos, { nome: '', descricao: '' }])}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        </div>

        {/* Checklist */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Checklist</label>
          <div className="mt-1 space-y-2">
            {checklist.map((item: { nome: string; descricao: string; obrigatorio: boolean }, i: number) => (
              <div key={i} className="border border-border rounded-md p-2 space-y-1">
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={item.obrigatorio}
                    onChange={(e) => {
                      const updated = [...checklist];
                      updated[i] = { ...item, obrigatorio: e.target.checked };
                      update('checklist', updated);
                    }}
                    title="Obrigatório"
                  />
                  <Input
                    value={item.nome}
                    onChange={(e) => {
                      const updated = [...checklist];
                      updated[i] = { ...item, nome: e.target.value };
                      update('checklist', updated);
                    }}
                    className="flex-1 h-7 text-xs"
                    placeholder="Nome do item"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => update('checklist', checklist.filter((_: unknown, j: number) => j !== i))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Input
                  value={item.descricao}
                  onChange={(e) => {
                    const updated = [...checklist];
                    updated[i] = { ...item, descricao: e.target.value };
                    update('checklist', updated);
                  }}
                  placeholder="Descrição"
                  className="h-7 text-xs text-muted-foreground ml-5"
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => update('checklist', [...checklist, { nome: '', descricao: '', obrigatorio: false }])}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar item
            </Button>
          </div>
        </div>

        {/* Regras de prazo (not applicable to inicio) */}
        {!isInicio && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">Prazo (dias úteis)</label>
            <Input
              type="number"
              min={0}
              value={((d.regras_prazo as Record<string, unknown>)?.dias_uteis as number) || ''}
              onChange={(e) =>
                update('regras_prazo', e.target.value ? { dias_uteis: parseInt(e.target.value), tipo: 'padrao' } : null)
              }
              className="mt-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}
