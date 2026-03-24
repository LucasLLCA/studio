"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import type { EstoqueListItem } from "@/types/bi";

interface ProcessoDetailSheetProps {
  processo: EstoqueListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const lower = status.toLowerCase();
  const variant = lower.includes("aberto")
    ? "default"
    : lower.includes("fechado") || lower.includes("conclu")
    ? "secondary"
    : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

export function ProcessoDetailSheet({
  processo,
  open,
  onOpenChange,
}: ProcessoDetailSheetProps) {
  const router = useRouter();

  if (!processo) return null;

  const goToProcesso = () => {
    router.push(`/processo/${encodeURIComponent(processo.protocolo)}/visualizar`);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
            <SheetTitle className="font-mono text-base">
              {processo.protocolo}
            </SheetTitle>
            <StatusBadge status={processo.status} />
          </div>
          <SheetDescription>
            Detalhes do processo no estoque
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6">
          {/* Origem */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Origem</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Unidade Origem</span>
                <p className="font-medium">{processo.unidade_origem || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Orgao Origem</span>
                <p className="font-medium">{processo.orgao_origem || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Tipo Procedimento</span>
                <p className="font-medium">{processo.tipo_procedimento || "-"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Unidade em Aberto</span>
                <p className="font-medium">{processo.unidade_aberta}</p>
              </div>
            </div>
          </section>

          {/* Ultimo Andamento */}
          <section className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              Ultimo Andamento
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Data</span>
                <p className="font-medium">
                  {processo.ultimo_andamento
                    ? new Date(processo.ultimo_andamento).toLocaleString("pt-BR")
                    : "-"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Dias sem Atividade</span>
                <p className="font-medium">
                  <Badge
                    variant={
                      processo.dias_sem_atividade > 90
                        ? "destructive"
                        : processo.dias_sem_atividade > 30
                        ? "default"
                        : "secondary"
                    }
                  >
                    {processo.dias_sem_atividade}d
                  </Badge>
                </p>
              </div>
            </div>
          </section>

          {/* Entendimento IA */}
          {processo.entendimento_processo && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                Entendimento do Processo (IA)
              </h4>
              <div className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                {processo.entendimento_processo}
              </div>
            </section>
          )}

          {/* Situacao Atual IA */}
          {processo.situacao_atual && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">
                Situacao Atual (IA)
              </h4>
              <div className="rounded-md bg-muted/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                {processo.situacao_atual}
              </div>
            </section>
          )}

          {/* Action */}
          <div className="pt-2">
            <Button onClick={goToProcesso} className="w-full gap-2">
              <ExternalLink className="h-4 w-4" />
              Visualizar Processo
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
