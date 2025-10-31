"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Building,
  UserCircle,
  CalendarDays,
  CalendarClock,
  BookText,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  Info,
} from 'lucide-react';

interface ProcessCreationInfo {
  creatorUnit: string;
  creatorUser: string;
  creationDate: string;
  timeSinceCreation: string;
}

interface ProcessInfoCardsProps {
  processNumber: string;
  processCreationInfo: ProcessCreationInfo | null;
  processLinkAcesso: string | null;
  openUnitsInProcess: any[] | null;
  processSummary: string | null;
  backgroundLoading: {
    andamentos: boolean;
    unidades: boolean;
    documentos: boolean;
    resumo: boolean;
  };
}

export function ProcessInfoCards({
  processNumber,
  processCreationInfo,
  processLinkAcesso,
  openUnitsInProcess,
  processSummary,
  backgroundLoading,
}: ProcessInfoCardsProps) {
  const hasBackgroundLoading = Object.values(backgroundLoading).some((loading) => loading);

  const loadingTasks = [];
  if (backgroundLoading.andamentos) loadingTasks.push('Buscando andamentos do processo');
  if (backgroundLoading.unidades) loadingTasks.push('Verificando unidades abertas');
  if (backgroundLoading.documentos) loadingTasks.push('Carregando documentos');
  if (backgroundLoading.resumo) loadingTasks.push('Gerando resumo com IA');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
      {/* Card de Informações Gerais */}
      <Card>
        <CardHeader className="p-2">
          <CardTitle className="text-md flex items-center text-green-600">
            <FileText className="mr-2 h-5 w-5" /> Número: {processNumber}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm pt-2 p-2">
          {processCreationInfo && (
            <>
              <div className="flex items-center">
                <Building className="mr-2 h-4 w-4 text-muted-foreground" />
                Unidade: <span className="font-medium ml-1">{processCreationInfo.creatorUnit}</span>
              </div>
              <div className="flex items-center">
                <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                Usuário: <span className="font-medium ml-1">{processCreationInfo.creatorUser}</span>
              </div>
              <div className="flex items-center">
                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                Data: <span className="font-medium ml-1">{processCreationInfo.creationDate}</span>
              </div>
              <div className="flex items-center">
                <CalendarClock className="mr-2 h-4 w-4 text-muted-foreground" />
                Tempo: <span className="font-medium ml-1">{processCreationInfo.timeSinceCreation}</span>
              </div>
            </>
          )}
          {processLinkAcesso && (
            <div className="flex items-center">
              <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
              Link:
              <a
                href={processLinkAcesso}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium ml-1 text-blue-600 hover:text-blue-800 underline"
              >
                Abrir no SEI
              </a>
            </div>
          )}
          {openUnitsInProcess !== null && (
            <div className="flex items-center">
              {openUnitsInProcess.length === 0 ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Status: <span className="font-medium ml-1 text-green-600">Concluído</span>
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4 text-yellow-600" />
                  Status:{' '}
                  <span className="font-medium ml-1 text-yellow-600">
                    Em andamento ({openUnitsInProcess.length} unidade
                    {openUnitsInProcess.length !== 1 ? 's' : ''} aberta
                    {openUnitsInProcess.length !== 1 ? 's' : ''})
                  </span>
                </>
              )}
            </div>
          )}

          {/* Feedback de carregamento dentro do card de informações gerais */}
          {hasBackgroundLoading && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-start space-x-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-medium mb-1 text-green-600">Atualizando dados...</h4>
                  <div className="space-y-0.5">
                    {loadingTasks.map((task, index) => (
                      <div key={index} className="flex items-center space-x-1.5 text-xs">
                        <div className="w-1 h-1 bg-primary rounded-full animate-pulse flex-shrink-0"></div>
                        <span className="text-muted-foreground">{task}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de Resumo IA */}
      <Card>
        <CardHeader className="p-2">
          <CardTitle className="text-md flex items-center text-green-600">
            <BookText className="mr-2 h-5 w-5" /> Entendimento Automatizado (IA)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col flex-shrink-0 p-2 pt-0">
          {processSummary ? (
            <div className="h-[150px] rounded-md border">
              <ScrollArea className="h-full">
                <div className="p-3">
                  <pre className="text-sm whitespace-pre-wrap break-words font-sans">
                    {processSummary}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          ) : backgroundLoading.resumo ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <p className="ml-2 text-muted-foreground">Gerando resumo...</p>
            </div>
          ) : (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Info className="mr-2 h-4 w-4" />
              Nenhum resumo disponível.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
