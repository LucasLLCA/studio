'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { Node } from '@xyflow/react';

interface ProcessAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (data: {
    numero_processo: string;
    numero_processo_formatado?: string;
    node_atual_id?: string;
    notas?: string;
  }) => void;
  nodes: Node[];
  isLoading: boolean;
}

export default function ProcessAssignmentDialog({
  open,
  onOpenChange,
  onAssign,
  nodes,
  isLoading,
}: ProcessAssignmentDialogProps) {
  const [numero, setNumero] = useState('');
  const [nodeAtualId, setNodeAtualId] = useState('');
  const [notas, setNotas] = useState('');

  const handleSubmit = () => {
    if (!numero.trim()) return;
    onAssign({
      numero_processo: numero.trim().replace(/\D/g, ''),
      numero_processo_formatado: numero.trim(),
      node_atual_id: nodeAtualId || undefined,
      notas: notas || undefined,
    });
    setNumero('');
    setNodeAtualId('');
    setNotas('');
  };

  const startNodes = nodes.filter(
    (n) => (n.data as Record<string, unknown>).tipo === 'inicio' || n.type === 'inicio',
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Processo ao Fluxo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Número do Processo</label>
            <Input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="00000.000000/0000-00"
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Etapa Inicial (opcional)</label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={nodeAtualId}
              onChange={(e) => setNodeAtualId(e.target.value)}
            >
              <option value="">Sem etapa inicial</option>
              {startNodes.length > 0 && (
                <optgroup label="Nós de Início">
                  {startNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {(n.data as Record<string, unknown>).nome as string}
                    </option>
                  ))}
                </optgroup>
              )}
              {nodes
                .filter((n) => !startNodes.includes(n))
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {(n.data as Record<string, unknown>).nome as string}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Notas (opcional)</label>
            <textarea
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!numero.trim() || isLoading}>
            {isLoading ? 'Vinculando...' : 'Vincular'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
