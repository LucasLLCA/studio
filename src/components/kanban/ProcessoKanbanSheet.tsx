"use client";

import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter } from 'next/navigation';
import { formatProcessNumber } from '@/lib/utils';
import type { KanbanProcesso } from '@/types/teams';

import { MoveToGroupsSection } from './MoveToGroupsSection';
import { TagsSection } from './TagsSection';
import { CommentSection } from './CommentSection';

interface ProcessoKanbanSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  processo: KanbanProcesso;
  equipeId: string;
  onTagsChanged: () => void;
}

export function ProcessoKanbanSheet({
  isOpen,
  onOpenChange,
  processo,
  equipeId,
  onTagsChanged,
}: ProcessoKanbanSheetProps) {
  const { usuario, idUnidadeAtual, selectedUnidadeFiltro, updateSelectedUnidade } = usePersistedAuth();
  const router = useRouter();

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        showOverlay={false}
        showCloseButton={false}
        className="w-full sm:w-[480px] sm:max-w-[480px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {processo.numero_processo_formatado || formatProcessNumber(processo.numero_processo)}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-lg"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Move to groups */}
          <MoveToGroupsSection
            processoNumero={processo.numero_processo}
            processoNumeroFormatado={processo.numero_processo_formatado}
            equipeId={equipeId}
            usuario={usuario}
            onMoved={onTagsChanged}
          />

          <SheetDescription className="sr-only">Detalhes do processo no kanban</SheetDescription>
        </SheetHeader>

        {processo.nota && (
          <p className="text-sm text-muted-foreground px-1 mt-1">{processo.nota}</p>
        )}

        {/* Tags */}
        <TagsSection
          processoNumero={processo.numero_processo}
          equipeId={equipeId}
          usuario={usuario}
          initialTags={processo.team_tags || []}
          onTagsChanged={onTagsChanged}
        />

        <Separator className="my-3" />

        {/* Comments / Observacoes */}
        <CommentSection
          processoNumero={processo.numero_processo}
          equipeId={equipeId}
          usuario={usuario}
        />

        {/* Full-width button at the bottom */}
        <div className="flex-shrink-0 pt-3 border-t">
          <Button
            className="w-full"
            onClick={() => {
              const unitId = selectedUnidadeFiltro || idUnidadeAtual;
              if (unitId) {
                updateSelectedUnidade(unitId);
              }
              router.push(`/processo/${encodeURIComponent(processo.numero_processo)}/visualizar`);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir processo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
