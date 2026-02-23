"use client";

import React, { useState } from 'react';
import type { ProcessoData, UnidadeAberta } from '@/types/process-flow';
import type { ProcessCreationInfo } from '@/hooks/use-process-creation-info';
import { Loader2, BookText, Info, CalendarDays, UserCircle, Building, CalendarClock, CheckCircle, Clock, ExternalLink, AlertTriangle, X, Share2, Copy } from 'lucide-react';
import { AlertBox } from '@/components/ui/alert-box';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatProcessNumber } from '@/lib/utils';
import { parseCustomDateString } from '@/lib/process-flow-utils';
import { extractOrgaoFromSigla } from '@/hooks/use-orgao-metrics';

interface ProcessDetailsSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rawProcessData: ProcessoData | null;
  numeroProcesso: string;
  processCreationInfo: ProcessCreationInfo | null;
  openUnitsInProcess: UnidadeAberta[] | null;
  processSummary: string | null;
  situacaoAtual: string | null;
  backgroundLoading: { resumo: boolean; situacao: boolean };
  unitAccessDenied: boolean;
  userOrgao: string | null;
  isExternalProcess: boolean;
  daysOpenInUserOrgao: number | null;
}

export function ProcessDetailsSheet({
  isOpen,
  onOpenChange,
  rawProcessData,
  numeroProcesso,
  processCreationInfo,
  openUnitsInProcess,
  processSummary,
  situacaoAtual,
  backgroundLoading,
  unitAccessDenied,
  userOrgao,
  isExternalProcess,
  daysOpenInUserOrgao,
}: ProcessDetailsSheetProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('entendimento');

  const activeTabContent = activeTab === 'entendimento' ? processSummary : situacaoAtual;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="left"
        showOverlay={false}
        showCloseButton={false}
        className="w-[720px] sm:max-w-[720px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-medium text-foreground">
              Processo,
              <br />
              <span className="text-2xl font-bold text-primary">
                {formatProcessNumber(rawProcessData?.Info?.NumeroProcesso || numeroProcesso)}
              </span>
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0 flex-shrink-0"
              aria-label="Fechar detalhes"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SheetDescription className="sr-only">Detalhes do processo</SheetDescription>
          <Separator />
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-6 pr-1">
          {unitAccessDenied && (
            <AlertBox variant="warning" icon={<AlertTriangle />}>
              Sua unidade não possui acesso direto a este processo. Documentos e resumos de IA não estão disponíveis.
            </AlertBox>
          )}

          {/* Metadados section */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Info className="h-5 w-5" /> Metadados
            </h3>
            {processCreationInfo && (
              <div className="space-y-3 text-lg">
                <div className="flex items-center"><Building className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />Unidade: <span className="font-medium ml-1">{processCreationInfo.creatorUnit}</span></div>
                <div className="flex items-center"><UserCircle className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />Usuário: <span className="font-medium ml-1">{processCreationInfo.creatorUser}</span></div>
                <div className="flex items-center"><CalendarDays className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />Data: <span className="font-medium ml-1">{processCreationInfo.creationDate}</span></div>
                <div className="flex items-center"><CalendarClock className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />Tempo: <span className="font-medium ml-1">{processCreationInfo.timeSinceCreation}</span></div>
                {openUnitsInProcess !== null && (
                  <div className="flex items-center">
                    {openUnitsInProcess.length === 0 ? (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />
                        Status: <span className="font-medium ml-1">Concluído</span>
                      </>
                    ) : (
                      <>
                        <Clock className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />
                        Status: <span className="font-medium ml-1">Em andamento ({openUnitsInProcess.length} unidade{openUnitsInProcess.length !== 1 ? 's' : ''} aberta{openUnitsInProcess.length !== 1 ? 's' : ''})</span>
                      </>
                    )}
                  </div>
                )}
                {userOrgao && processCreationInfo && (
                  <>
                    <div className="flex items-center">
                      <ExternalLink className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />
                      Processo externo: <span className={`font-medium ml-1 ${isExternalProcess ? 'text-warning' : 'text-success'}`}>{isExternalProcess ? 'Sim' : 'Não'}</span>
                    </div>
                    {isExternalProcess && rawProcessData?.Andamentos && (
                      (() => {
                        const userOrgaoNormalized = userOrgao.toUpperCase();
                        const andamentosInUserOrgao = rawProcessData.Andamentos.filter(a => {
                          const andamentoOrgao = extractOrgaoFromSigla(a.Unidade.Sigla).toUpperCase();
                          return andamentoOrgao === userOrgaoNormalized;
                        });

                        if (andamentosInUserOrgao.length > 0) {
                          const firstAndamento = andamentosInUserOrgao.sort((a, b) =>
                            parseCustomDateString(a.DataHora).getTime() - parseCustomDateString(b.DataHora).getTime()
                          )[0];

                          return (
                            <div className="flex items-center ml-7">
                              <Building className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />
                              Chegou em: <span className="font-medium ml-1 text-primary">{firstAndamento.Unidade.Sigla}</span>
                            </div>
                          );
                        }
                        return null;
                      })()
                    )}
                  </>
                )}
                {userOrgao && daysOpenInUserOrgao !== null && (
                  <div className="flex items-center">
                    <Clock className="mr-2 h-5 w-5 text-muted-foreground flex-shrink-0" />
                    Dias em aberto no órgão: <span className="font-medium ml-1 text-destructive">{daysOpenInUserOrgao} {daysOpenInUserOrgao === 1 ? 'dia' : 'dias'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Entendimento / Situação Atual tabs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BookText className="h-5 w-5" /> Resumo (IA)
              </h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={!activeTabContent}
                  onClick={() => {
                    if (activeTabContent) {
                      const processNum = formatProcessNumber(rawProcessData?.Info?.NumeroProcesso || numeroProcesso);
                      const message = `*Processo ${processNum}*\n\n${activeTabContent}`;
                      window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
                    }
                  }}
                >
                  <Share2 className="mr-1 h-3 w-3" />
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={!activeTabContent}
                  onClick={() => {
                    if (activeTabContent) {
                      navigator.clipboard.writeText(activeTabContent);
                      toast({ title: "Copiado", description: "Texto copiado para a área de transferência." });
                    }
                  }}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copiar
                </Button>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="entendimento" className="flex-1">Entendimento</TabsTrigger>
                <TabsTrigger value="situacao" className="flex-1">Situação Atual</TabsTrigger>
              </TabsList>

              <TabsContent value="entendimento">
                {unitAccessDenied ? (
                  <div className="flex items-center justify-center p-6 text-warning-foreground text-base">
                    <AlertTriangle className="mr-2 h-5 w-5 flex-shrink-0" />
                    Resumo indisponível — sua unidade não possui acesso aos documentos deste processo.
                  </div>
                ) : processSummary !== null && processSummary !== undefined && processSummary.length > 0 ? (
                  <div>
                    <pre className="text-lg whitespace-pre-wrap break-words font-sans leading-relaxed">{processSummary}</pre>
                    {backgroundLoading.resumo && (
                      <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                    )}
                  </div>
                ) : backgroundLoading.resumo ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <p className="ml-2 text-lg text-muted-foreground">Gerando resumo...</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 text-muted-foreground text-lg">
                    <Info className="mr-2 h-5 w-5" />
                    Nenhum resumo disponível.
                  </div>
                )}
              </TabsContent>

              <TabsContent value="situacao">
                {unitAccessDenied ? (
                  <div className="flex items-center justify-center p-6 text-warning-foreground text-base">
                    <AlertTriangle className="mr-2 h-5 w-5 flex-shrink-0" />
                    Situação atual indisponível — sua unidade não possui acesso aos documentos deste processo.
                  </div>
                ) : situacaoAtual !== null && situacaoAtual !== undefined && situacaoAtual.length > 0 ? (
                  <div>
                    <pre className="text-lg whitespace-pre-wrap break-words font-sans leading-relaxed">{situacaoAtual}</pre>
                    {backgroundLoading.situacao && (
                      <span className="inline-block w-2 h-5 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                    )}
                  </div>
                ) : backgroundLoading.situacao ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <p className="ml-2 text-lg text-muted-foreground">Gerando situação atual...</p>
                  </div>
                ) : situacaoAtual === null ? (
                  <div className="flex items-center justify-center p-6 text-muted-foreground text-lg">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Aguardando dados do processo...
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-6 text-muted-foreground text-lg">
                    <Info className="mr-2 h-5 w-5" />
                    Nenhuma situação disponível.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Fechar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
