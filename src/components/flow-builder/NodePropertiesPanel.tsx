'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Node } from '@xyflow/react';

interface NodePropertiesPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export default function NodePropertiesPanel({ node, onUpdate, onClose }: NodePropertiesPanelProps) {
  if (!node) return null;

  const d = node.data as Record<string, unknown>;

  const update = (key: string, value: unknown) => {
    onUpdate(node.id, { ...d, [key]: value });
  };

  const checklist = (d.checklist as Array<{ item: string; obrigatorio: boolean }>) || [];
  const documentos = (d.documentos_necessarios as string[]) || [];

  return (
    <div className="w-72 border-l border-border bg-card overflow-y-auto flex-shrink-0 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold">Propriedades</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
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
          <textarea
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            rows={3}
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

        {/* Duração estimada */}
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
          <div className="mt-1 space-y-1">
            {documentos.map((doc, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input
                  value={doc}
                  onChange={(e) => {
                    const updated = [...documentos];
                    updated[i] = e.target.value;
                    update('documentos_necessarios', updated);
                  }}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    update('documentos_necessarios', documentos.filter((_, j) => j !== i));
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => update('documentos_necessarios', [...documentos, ''])}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          </div>
        </div>

        {/* Checklist */}
        <div>
          <label className="text-xs font-medium text-muted-foreground">Checklist</label>
          <div className="mt-1 space-y-1">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-1">
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
                  value={item.item}
                  onChange={(e) => {
                    const updated = [...checklist];
                    updated[i] = { ...item, item: e.target.value };
                    update('checklist', updated);
                  }}
                  className="flex-1"
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

        {/* Regras de prazo */}
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
      </div>
    </div>
  );
}
