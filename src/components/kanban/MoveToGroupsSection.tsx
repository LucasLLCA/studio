"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  X,
  Check,
  ChevronDown,
  Info,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { salvarProcessoNoKanban } from '@/lib/api/tags-api-client';
import type { TeamTag } from '@/types/teams';

interface MoveToGroupsSectionProps {
  processoNumero: string;
  processoNumeroFormatado?: string | null;
  equipeId: string;
  usuario: string | null;
  onMoved: () => void;
}

export function MoveToGroupsSection({
  processoNumero,
  processoNumeroFormatado,
  equipeId,
  usuario,
  onMoved,
}: MoveToGroupsSectionProps) {
  const { toast } = useToast();

  const [moverModalAberto, setMoverModalAberto] = useState(false);
  const [gruposDestino, setGruposDestino] = useState<TeamTag[]>([]);
  const [multiSelectAberto, setMultiSelectAberto] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [kanbanColunas, setKanbanColunas] = useState<any[]>([]);

  const colunaJaTemProcesso = useCallback((coluna: any) => {
    const listaProcessos =
      coluna?.processos ??
      coluna?.listaDeProcessos ??
      coluna?.lista_processos ??
      coluna?.items ??
      [];
    return listaProcessos.some((p: any) => p?.numero_processo === processoNumero);
  }, [processoNumero]);

  const loadKanbanColunas = useCallback(async () => {
    if (!usuario) return;
    const boardResult = await import('@/lib/api/tags-api-client').then(m => m.getKanbanBoard(equipeId, usuario));
    if (!('error' in boardResult)) {
      setKanbanColunas(boardResult.colunas);
    } else {
      setKanbanColunas([]);
    }
  }, [equipeId, usuario]);

  useEffect(() => {
    loadKanbanColunas();
  }, [loadKanbanColunas]);

  const toggleGrupoDestino = useCallback((coluna: { tag_id: string; tag_nome: string; tag_cor: string; equipe_id?: string; criado_por?: string; criado_em?: string; atualizado_em?: string }) => {
    if (colunaJaTemProcesso(coluna)) return;

    const tag: TeamTag = {
      id: coluna.tag_id,
      nome: coluna.tag_nome,
      cor: coluna.tag_cor,
      equipe_id: coluna.equipe_id ?? equipeId,
      criado_por: coluna.criado_por ?? '',
      criado_em: coluna.criado_em ?? '',
      atualizado_em: coluna.atualizado_em ?? '',
    };
    setGruposDestino(prev =>
      prev.some(g => g.id === tag.id)
        ? prev.filter(g => g.id !== tag.id)
        : [...prev, tag]
    );
  }, [equipeId, colunaJaTemProcesso]);

  const moverProcessoParaGrupos = useCallback(async () => {
    if (!usuario || gruposDestino.length === 0) return;

    const destinosValidos = gruposDestino.filter(grupo => {
      const coluna = kanbanColunas.find((c) => c.tag_id === grupo.id);
      return !coluna || !colunaJaTemProcesso(coluna);
    });

    if (destinosValidos.length === 0) {
      toast({
        title: 'Nenhum destino valido',
        description: 'O processo ja esta presente nos grupos selecionados.',
        variant: 'destructive',
      });
      return;
    }

    setIsMoving(true);
    try {
      const resultados = await Promise.all(
        destinosValidos.map(grupo =>
          salvarProcessoNoKanban(
            equipeId,
            grupo.id,
            processoNumero,
            processoNumeroFormatado ?? undefined,
            usuario,
          )
        )
      );

      const erros = resultados.filter(r => 'error' in r) as { error: string; status?: number }[];
      const sucessos = resultados.filter(r => !('error' in r));
      const errosDuplicidade = erros.filter(e => e.status === 409);
      const errosOutros = erros.filter(e => e.status !== 409);

      if (erros.length === 0) {
        toast({
          title: "Processo adicionado com sucesso!",
          description: destinosValidos.length === 1
            ? `Adicionado ao grupo "${destinosValidos[0].nome}".`
            : `Adicionado a ${destinosValidos.length} grupos.`,
        });
      } else if (sucessos.length > 0 || errosDuplicidade.length > 0) {
        toast({
          title: "Adicionado parcialmente",
          description: `${sucessos.length} grupo(s) com sucesso, ${errosDuplicidade.length} ja tinham o processo${errosOutros.length > 0 ? `, ${errosOutros.length} com outro erro` : ''}.`,
          variant: "destructive",
        });
      } else {
        const primeiroErro = erros[0];
        const description = primeiroErro.status === 409
          ? 'O processo ja existe em todos os grupos selecionados.'
          : primeiroErro.error;
        toast({ title: "Erro ao adicionar processo", description, variant: "destructive" });
        return;
      }

      setGruposDestino([]);
      setMoverModalAberto(false);
      onMoved();
    } finally {
      setIsMoving(false);
    }
  }, [equipeId, processoNumero, processoNumeroFormatado, usuario, toast, onMoved, gruposDestino, kanbanColunas, colunaJaTemProcesso]);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Adicionar a outros grupos:</h3>
      </div>

      {/* Informativo */}
      <div className="flex items-start gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1.5">
        <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-600 leading-snug">
          Selecione um ou mais grupos para adicionar este processo a todos eles simultaneamente.
        </p>
      </div>

      {/* Popover multi-select */}
      <Popover open={multiSelectAberto} onOpenChange={setMultiSelectAberto}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={multiSelectAberto}
            className="w-full justify-between font-normal text-muted-foreground hover:text-foreground"
          >
            {gruposDestino.length === 0
              ? 'Selecione os grupos de destino...'
              : `${gruposDestino.length} grupo${gruposDestino.length > 1 ? 's' : ''} selecionado${gruposDestino.length > 1 ? 's' : ''}`}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
          <div className="max-h-48 overflow-y-auto">
            {kanbanColunas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum grupo encontrado.</p>
            ) : (
              kanbanColunas.map(coluna => {
                const isSelecionado = gruposDestino.some(g => g.id === coluna.tag_id);
                const jaAdicionado = colunaJaTemProcesso(coluna);
                return (
                  <button
                    key={coluna.tag_id}
                    type="button"
                    onClick={() => !jaAdicionado && toggleGrupoDestino(coluna)}
                    disabled={jaAdicionado}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left transition-colors',
                      jaAdicionado
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-accent cursor-pointer'
                    )}
                  >
                    <div className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center flex-shrink-0',
                      isSelecionado
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/40'
                    )}>
                      {isSelecionado && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="flex-1">{coluna.tag_nome}</span>
                    {jaAdicionado && (
                      <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100">
                        Ja adicionado
                      </Badge>
                    )}
                  </button>
                );
              })
            )}
          </div>
          {gruposDestino.length > 0 && (
            <>
              <Separator className="my-1" />
              <div className="px-1 pb-0.5 pt-0.5">
                <Button
                  className="w-full h-8 text-sm"
                  onClick={() => {
                    setMultiSelectAberto(false);
                    setMoverModalAberto(true);
                  }}
                >
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                  Adicionar a {gruposDestino.length} grupo{gruposDestino.length > 1 ? 's' : ''}
                </Button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* Chips dos grupos selecionados */}
      {gruposDestino.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {gruposDestino.map(grupo => (
            <span
              key={grupo.id}
              className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5"
            >
              {grupo.nome}
              <button
                type="button"
                onClick={() => setGruposDestino(prev => prev.filter(g => g.id !== grupo.id))}
                className="hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dialog de confirmacao */}
      <Dialog open={moverModalAberto} onOpenChange={setMoverModalAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar adicao</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              O processo sera adicionado {gruposDestino.length === 1 ? 'ao grupo:' : `aos seguintes ${gruposDestino.length} grupos:`}
            </p>
            <ul className="space-y-1.5">
              {gruposDestino.map(grupo => (
                <li key={grupo.id} className="flex items-center gap-2 text-sm font-medium">
                  <ArrowRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  {grupo.nome}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline" disabled={isMoving}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              disabled={isMoving}
              onClick={moverProcessoParaGrupos}
            >
              {isMoving
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adicionando...</>
                : 'Confirmar'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
