
"use client";

import type { ProcessedAndamento, Documento } from '@/types/process-flow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fetchSSEStream, getStreamDocumentSummaryUrl } from '@/lib/streaming';
import { isNetworkError } from '@/lib/network-retry';
import React, { useState, useEffect } from 'react';
import { formatDisplayDate } from '@/lib/process-flow-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, User, Briefcase, CalendarClock, FileText, Sparkles, Layers, Loader2, ExternalLink, PenTool, TriangleAlert, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TaskDetailsModalProps {
  task: ProcessedAndamento | null;
  isOpen: boolean;
  onClose: () => void;
  sessionToken: string | null;
  isAuthenticated: boolean;
  selectedUnidadeFiltro: string | undefined;
  processNumber?: string;
  documents?: Documento[] | null;
  isLoadingDocuments?: boolean;
}

export function TaskDetailsModal({ task, isOpen, onClose, sessionToken, isAuthenticated, selectedUnidadeFiltro, processNumber, documents, isLoadingDocuments }: TaskDetailsModalProps) {
  const [extractedDocumentNumber, setExtractedDocumentNumber] = useState<string | null>(null);
  const [documentSummary, setDocumentSummary] = useState<string | null>(null);
  const [isLoadingDocumentSummary, setIsLoadingDocumentSummary] = useState<boolean>(false);
  const [documentSummaryError, setDocumentSummaryError] = useState<string | null>(null);
  const [matchedDocument, setMatchedDocument] = useState<Documento | null>(null);
  const [isSignatureExpanded, setIsSignatureExpanded] = useState(false);
  const [isResumoExpanded, setIsResumoExpanded] = useState(true);

  useEffect(() => {
    // Reset document summary states when modal opens or task changes
    setExtractedDocumentNumber(null);
    setDocumentSummary(null);
    setDocumentSummaryError(null);
    setIsLoadingDocumentSummary(false);
    setMatchedDocument(null);
    setIsSignatureExpanded(false);
    setIsResumoExpanded(true);

    if (task && isOpen) {
      // Extract document number with multiple flexible patterns
      const patterns = [
        // Padrão original (8-9 dígitos isolados) - mais confiável
        { name: 'isolado', regex: /\b(\d{8,9})\b/, priority: 1 },
        
        // Com prefixos comuns (DOC, DOCUMENTO, ANEXO, etc.)
        { name: 'prefixo_doc', regex: /(?:DOC|DOCUMENTO|ANEXO|PROCESS)[O]?[:\s#-]*(\d{7,18})/i, priority: 2 },
        
        // Protocolo ou número de processo
        { name: 'protocolo', regex: /(?:PROTOCOLO|PROCESSO|SEI)[:\s#-]*(\d{7,10})/i, priority: 2 },
        
        // Entre parênteses ou colchetes
        { name: 'parenteses', regex: /[\(\[](\d{7,10})[\)\]]/, priority: 3 },
        
        // Precedido por "nº", "n°", "num", "número"
        { name: 'numero', regex: /(?:n[ºo°]?|num|número)[:\s]*(\d{7,10})/i, priority: 3 },
        
        // Qualquer sequência de 7-10 dígitos (menos confiável)
        { name: 'generico', regex: /(\d{7,10})(?=\s|$|[^\d])/g, priority: 4 }
      ];

      let bestMatch = null;
      let bestPriority = 999;

      for (const pattern of patterns) {
        const matches = pattern.regex.global ? 
          [...task.Descricao.matchAll(pattern.regex)] : 
          [task.Descricao.match(pattern.regex)];

        for (const match of matches) {
          if (match && match[1] && pattern.priority < bestPriority) {
            // Validações adicionais
            const number = match[1];
            
            // Rejeitar números muito pequenos (menos de 7 dígitos)
            if (number.length < 7) continue;
            
            // Rejeitar números muito grandes (mais de 12 dígitos)  
            if (number.length > 12) continue;
            
            // Rejeitar padrões óbvios de data (formato YYYYMMDD ou DDMMYYYY)
            if (number.length === 8) {
              const year = parseInt(number.substring(0, 4));
              const year2 = parseInt(number.substring(4, 8));
              if ((year >= 1990 && year <= 2030) || (year2 >= 1990 && year2 <= 2030)) {
                console.log(`Rejeitando possível data: ${number}`);
                continue;
              }
            }

            bestMatch = number;
            bestPriority = pattern.priority;
            console.log(`Número do documento extraído (${pattern.name}): ${number} da descrição: "${task.Descricao.substring(0, 100)}..."`);
          }
        }
      }

      if (bestMatch) {
        setExtractedDocumentNumber(bestMatch);
      } else {
        console.log(`Nenhum número de documento encontrado na descrição: "${task.Descricao}"`);
      }
    }
  }, [task, isOpen]);

  // Buscar documento correspondente quando número é extraído (busca local)
  useEffect(() => {
    if (!extractedDocumentNumber || !documents || documents.length === 0) {
      setMatchedDocument(null);
      return;
    }

    // Buscar documento que corresponde ao número extraído na lista local
    const matchedDoc = documents.find(doc => 
      doc.DocumentoFormatado === extractedDocumentNumber ||
      doc.Numero === extractedDocumentNumber ||
      doc.DocumentoFormatado.includes(extractedDocumentNumber) ||
      extractedDocumentNumber.includes(doc.DocumentoFormatado)
    );

    if (matchedDoc) {
      setMatchedDocument(matchedDoc);
      console.log(`Documento correspondente encontrado: ${matchedDoc.DocumentoFormatado} - ${matchedDoc.Serie.Nome}`);
    } else {
      setMatchedDocument(null);
    }
  }, [extractedDocumentNumber, documents]);

  // Auto-fetch document summary when a matched document is found
  useEffect(() => {
    if (matchedDocument && isOpen && extractedDocumentNumber && sessionToken && selectedUnidadeFiltro && !documentSummary && !isLoadingDocumentSummary && !documentSummaryError) {
      handleFetchDocumentSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedDocument]);

  // Auto-scroll quando o resumo do documento é gerado
  useEffect(() => {
    if (documentSummary && !isLoadingDocumentSummary) {
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollArea) {
          scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [documentSummary, isLoadingDocumentSummary]);

  const handleFetchDocumentSummary = (attempt = 0) => {
    if (!extractedDocumentNumber || !sessionToken || !task || !selectedUnidadeFiltro) {
      setDocumentSummaryError("Não foi possível carregar o resumo do documento. Verifique se você está logado e se o documento é válido.");
      return;
    }

    setIsLoadingDocumentSummary(true);
    setDocumentSummary("");
    setDocumentSummaryError(null);

    fetchSSEStream(
      getStreamDocumentSummaryUrl(extractedDocumentNumber, selectedUnidadeFiltro!),
      sessionToken!,
      (chunk) => {
        setDocumentSummary(prev => (prev || "") + chunk);
      },
      (fullResult) => {
        const summaryText = typeof fullResult === 'string'
          ? fullResult
          : fullResult?.resumo?.resposta_ia || "";
        setDocumentSummary(summaryText);
        setIsLoadingDocumentSummary(false);
      },
      (error) => {
        if (attempt < 2 && isNetworkError(error)) {
          const delay = 2000 * (attempt + 1);
          console.warn(`[RETRY] resumo documento SSE: tentativa ${attempt + 1} falhou (rede), aguardando ${delay}ms...`);
          setTimeout(() => handleFetchDocumentSummary(attempt + 1), delay);
        } else {
          setDocumentSummaryError(error || "Não foi possível obter o resumo do documento. Tente novamente.");
          setDocumentSummary(null);
          setIsLoadingDocumentSummary(false);
        }
      },
    );
  };

  if (!task) return null;

  const cleanDescription = task.Descricao.replace(/<[^>]*>?/gm, '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-primary flex items-center">
             {task.isSummaryNode ? <Layers className="mr-2 h-6 w-6" /> : <FileText className="mr-2 h-6 w-6" />}
             {task.isSummaryNode ? `Resumo de ${task.groupedTasksCount} Ações` : `Detalhes da Tarefa #${task.globalSequence}`}
          </DialogTitle>
          <DialogDescription>
            {task.isSummaryNode ? `Informações sobre ${task.groupedTasksCount} ações agrupadas.` : "Informações detalhadas sobre o andamento do processo."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6"> {/* Offset scrollbar */}
          <div className="space-y-4 py-4 pr-2"> {/* Padding for scrollbar */}
            
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-medium text-foreground">
                  {task.isSummaryNode ? "Ações Agrupadas (Tipo da primeira ação)" : "Tarefa (Tipo)"}
                </h3>
                <p className="text-sm text-muted-foreground">{task.Tarefa}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-medium text-foreground">Descrição Completa</h3>
                <p className="text-sm text-muted-foreground break-words whitespace-pre-wrap">{cleanDescription}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CalendarClock className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-medium text-foreground">Data e Hora {task.isSummaryNode ? '(Início do Grupo)' : ''}</h3>
                <p className="text-sm text-muted-foreground">{formatDisplayDate(task.parsedDate)}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Briefcase className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
              <div>
                <h3 className="font-medium text-foreground">Unidade</h3>
                <p className="text-sm text-muted-foreground">{task.Unidade.Sigla} - {task.Unidade.Descricao}</p>
              </div>
            </div>

            {!task.isSummaryNode && (
              <div className="flex items-start space-x-3">
                <User className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-foreground">Usuário</h3>
                  <p className="text-sm text-muted-foreground">{task.Usuario.Nome} ({task.Usuario.Sigla})</p>
                </div>
              </div>
            )}
            {task.isSummaryNode && task.originalTaskIds && (
                 <div className="flex items-start space-x-3">
                    <Layers className="h-5 w-5 mt-1 text-primary flex-shrink-0" />
                    <div>
                        <h3 className="font-medium text-foreground">IDs das Tarefas Originais Agrupadas</h3>
                        <p className="text-xs text-muted-foreground break-all">{task.originalTaskIds.join(', ')}</p>
                    </div>
                </div>
            )}

            {extractedDocumentNumber && isAuthenticated && (
              <>
                <Separator className="my-4" />
                
                {/* Link do Documento */}
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Documento Identificado ({extractedDocumentNumber})
                  </h3>
                  
                  {matchedDocument && (
                    <div className="p-3 border rounded-md bg-blue-50/50 border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-blue-900">{matchedDocument.Serie.Nome}</div>
                          <div className="text-sm text-blue-700 mt-1">
                            Doc: {matchedDocument.DocumentoFormatado} | Nº: {matchedDocument.Numero}
                          </div>
                          {matchedDocument.Descricao && (
                            <div className="text-sm text-muted-foreground mt-1">{matchedDocument.Descricao}</div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            {matchedDocument.Data} - {matchedDocument.UnidadeElaboradora.Sigla}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                          {/* Assinar — disabled placeholder when signature is pending */}
                          {matchedDocument.Serie.IdSerie === '11' && (!matchedDocument.Assinaturas || matchedDocument.Assinaturas.length === 0) && (
                            <Button variant="outline" size="sm" disabled>
                              <PenTool className="mr-1 h-4 w-4" />
                              Assinar
                            </Button>
                          )}
                          <Button
                            onClick={() => handleFetchDocumentSummary()}
                            disabled={isLoadingDocumentSummary || !!documentSummary || !sessionToken}
                            variant="outline"
                            size="sm"
                          >
                            {isLoadingDocumentSummary ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="mr-1 h-4 w-4" />
                            )}
                            Resumir
                          </Button>
                          <Button
                            onClick={() => window.open(matchedDocument.LinkAcesso, '_blank')}
                            variant="outline"
                            size="sm"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Abrir
                          </Button>
                        </div>
                      </div>

                      {/* Signature status for Serie 11 (Oficio) documents — collapsible */}
                      {matchedDocument.Serie.IdSerie === '11' && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          {(!matchedDocument.Assinaturas || matchedDocument.Assinaturas.length === 0) ? (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
                              <TriangleAlert className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              <span className="text-sm font-medium text-amber-800">Sem assinatura</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <button
                                type="button"
                                className="flex items-center gap-2 w-full text-left"
                                onClick={() => setIsSignatureExpanded(prev => !prev)}
                              >
                                <PenTool className="h-4 w-4 text-green-600 flex-shrink-0" />
                                <span className="text-sm font-medium text-green-800">
                                  {matchedDocument.Assinaturas.length === 1 ? '1 assinatura' : `${matchedDocument.Assinaturas.length} assinaturas`}
                                </span>
                                {isSignatureExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                                )}
                              </button>
                              {isSignatureExpanded && (
                                <div className="space-y-1">
                                  {matchedDocument.Assinaturas.map((assinatura, idx) => (
                                    <div key={idx} className="flex items-start gap-2 pl-6 text-sm text-muted-foreground">
                                      <User className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-green-600" />
                                      <div>
                                        <span className="font-medium text-foreground">{assinatura.Nome}</span>
                                        {assinatura.CargoFuncao && (
                                          <span className="text-xs ml-1">({assinatura.CargoFuncao})</span>
                                        )}
                                        <div className="text-xs">{assinatura.DataHora}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Resumo do documento — collapsible, default open */}
                      {documentSummaryError && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-sm text-destructive flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" /> {documentSummaryError}
                          </p>
                        </div>
                      )}

                      {(isLoadingDocumentSummary || (documentSummary !== null && documentSummary !== undefined && documentSummary.length > 0)) && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full text-left mb-2"
                            onClick={() => setIsResumoExpanded(prev => !prev)}
                          >
                            <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground">
                              {isLoadingDocumentSummary ? "Gerando resumo..." : "Resumo Gerado"}
                            </span>
                            {isLoadingDocumentSummary && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            )}
                            {isResumoExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                            )}
                          </button>
                          {isResumoExpanded && (
                            <div className="border rounded-md bg-muted/20 p-3">
                              <div className="text-sm text-secondary-foreground whitespace-pre-wrap">
                                {documentSummary}
                                {isLoadingDocumentSummary && (
                                  <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {!matchedDocument && extractedDocumentNumber && !isLoadingDocuments && (
                    <div className="p-3 border rounded-md bg-slate-50 border-slate-300">
                      <div className="flex items-center gap-2 mb-1">
                        <Lock className="h-4 w-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700">Documento restrito</span>
                      </div>
                      <p className="text-sm text-slate-600 pl-6">
                        Você não possui permissão para acessar este documento. Entre em contato com a unidade responsável caso precise de acesso.
                      </p>
                    </div>
                  )}
                  
                  {!matchedDocument && extractedDocumentNumber && isLoadingDocuments && (
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Carregando lista de documentos...
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button onClick={onClose} variant="outline" className="w-full">
            <CheckCircle className="mr-2 h-4 w-4" /> Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
