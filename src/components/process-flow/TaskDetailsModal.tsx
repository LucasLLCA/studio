
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchSSEStreamWithRetry, getStreamDocumentSummaryUrl } from '@/lib/streaming';
import { extractDocumentNumber } from '@/lib/document-extraction';
import { assinarDocumento } from '@/lib/api/documents';
import React, { useState, useEffect } from 'react';
import { formatDisplayDate } from '@/lib/process-flow-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, User, Briefcase, CalendarClock, FileText, Sparkles, Layers, Loader2, ExternalLink, PenTool, TriangleAlert, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { AlertBox } from '@/components/ui/alert-box';
import { Separator } from '@/components/ui/separator';
import { useProcessContext } from '@/contexts/process-context';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useToast } from '@/hooks/use-toast';

interface TaskDetailsModalProps {
  task: ProcessedAndamento | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailsModal({ task, isOpen, onClose }: TaskDetailsModalProps) {
  const { sessionToken, isAuthenticated, selectedUnidadeFiltro, documents, isLoadingDocuments, refresh } = useProcessContext();
  const { orgao, idUsuario, idLogin, cargoAssinatura, unidadesFiltroList } = usePersistedAuth();
  const { toast } = useToast();
  const [extractedDocumentNumber, setExtractedDocumentNumber] = useState<string | null>(null);
  const [documentSummary, setDocumentSummary] = useState<string | null>(null);
  const [isLoadingDocumentSummary, setIsLoadingDocumentSummary] = useState<boolean>(false);
  const [documentSummaryError, setDocumentSummaryError] = useState<string | null>(null);
  const [matchedDocument, setMatchedDocument] = useState<Documento | null>(null);
  const [isSignatureExpanded, setIsSignatureExpanded] = useState(false);
  const [isResumoExpanded, setIsResumoExpanded] = useState(true);

  // Signing state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [signPassword, setSignPassword] = useState('');
  const [signUnidade, setSignUnidade] = useState<string>('');
  const [signCargo, setSignCargo] = useState('');

  useEffect(() => {
    // Reset document summary states when modal opens or task changes
    setExtractedDocumentNumber(null);
    setDocumentSummary(null);
    setDocumentSummaryError(null);
    setIsLoadingDocumentSummary(false);
    setMatchedDocument(null);
    setIsSignatureExpanded(false);
    setIsResumoExpanded(true);
    setIsSignModalOpen(false);
    setIsSigning(false);
    setSignError(null);
    setSignPassword('');
    setSignCargo(cargoAssinatura || '');
    setSignUnidade(selectedUnidadeFiltro || '');

    if (task && isOpen) {
      const docNumber = extractDocumentNumber(task.Descricao);
      if (docNumber) {
        setExtractedDocumentNumber(docNumber);
      }
    }
  }, [task, isOpen, cargoAssinatura, selectedUnidadeFiltro]);

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

  const handleFetchDocumentSummary = () => {
    if (!extractedDocumentNumber || !sessionToken || !task || !selectedUnidadeFiltro) {
      setDocumentSummaryError("Não foi possível carregar o resumo do documento. Verifique se você está logado e se o documento é válido.");
      return;
    }

    setIsLoadingDocumentSummary(true);
    setDocumentSummary("");
    setDocumentSummaryError(null);

    fetchSSEStreamWithRetry(
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
        setDocumentSummaryError(error || "Não foi possível obter o resumo do documento. Tente novamente.");
        setDocumentSummary(null);
        setIsLoadingDocumentSummary(false);
      },
    );
  };

  const handleOpenSignModal = () => {
    setSignError(null);
    setSignPassword('');
    setSignCargo(cargoAssinatura || '');
    setSignUnidade(selectedUnidadeFiltro || '');
    setIsSignModalOpen(true);
  };

  const handleSign = async () => {
    if (!matchedDocument || !sessionToken || !signPassword || !signUnidade) return;

    if (!idUsuario || !idLogin || !orgao) {
      setSignError('Dados de autenticação incompletos. Faça login novamente.');
      return;
    }

    if (!signCargo) {
      setSignError('Informe o cargo para assinatura.');
      return;
    }

    setIsSigning(true);
    setSignError(null);

    const result = await assinarDocumento({
      protocoloDocumento: matchedDocument.DocumentoFormatado,
      idUnidade: signUnidade,
      token: sessionToken,
      orgao,
      cargo: signCargo,
      idLogin,
      senha: signPassword,
      idUsuario,
    });

    setIsSigning(false);

    if (result.success) {
      setIsSignModalOpen(false);
      onClose();
      toast({
        title: 'Documento assinado',
        description: `O documento ${matchedDocument.DocumentoFormatado} foi assinado com sucesso.`,
      });
      refresh?.();
    } else {
      setSignError(result.error || 'Erro ao assinar documento.');
    }
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
                    <FileText className="h-5 w-5 mr-2 text-primary" />
                    Documento Identificado ({extractedDocumentNumber})
                  </h3>
                  
                  {matchedDocument && (
                    <div className="p-3 border rounded-md bg-info/5 border-info/30">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{matchedDocument.Serie.Nome}</div>
                          <div className="text-sm text-muted-foreground mt-1">
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
                          {/* Assinar — available for unsigned Ofício documents */}
                          {matchedDocument.Serie.Nome.toLowerCase().includes('oficio') && (!matchedDocument.Assinaturas || matchedDocument.Assinaturas.length === 0) && (
                            <Button variant="outline" size="sm" onClick={handleOpenSignModal} disabled={!sessionToken || !idUsuario || !idLogin}>
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

                      {/* Signature status — collapsible */}
                      <div className="mt-3 pt-3 border-t border-info/30">
                        {(!matchedDocument.Assinaturas || matchedDocument.Assinaturas.length === 0) ? (
                          <div className="flex items-center gap-2">
                            <TriangleAlert className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-yellow-600">Sem assinatura</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <button
                              type="button"
                              className="flex items-center gap-2 w-full text-left"
                              onClick={() => setIsSignatureExpanded(prev => !prev)}
                            >
                              <PenTool className="h-4 w-4 text-success flex-shrink-0" />
                              <span className="text-sm font-medium text-success">
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
                                    <User className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-success" />
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

                      {/* Resumo do documento — collapsible, default open */}
                      {documentSummaryError && (
                        <div className="mt-3 pt-3 border-t border-info/30">
                          <p className="text-sm text-destructive flex items-center">
                            <AlertCircle className="h-4 w-4 mr-1" /> {documentSummaryError}
                          </p>
                        </div>
                      )}

                      {(isLoadingDocumentSummary || (documentSummary !== null && documentSummary !== undefined && documentSummary.length > 0)) && (
                        <div className="mt-3 pt-3 border-t border-info/30">
                          <button
                            type="button"
                            className="flex items-center gap-2 w-full text-left mb-2"
                            onClick={() => setIsResumoExpanded(prev => !prev)}
                          >
                            <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
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
                    <AlertBox variant="error" icon={<Lock />} title="Documento restrito">
                      Você não possui permissão para acessar este documento. Entre em contato com a unidade responsável caso precise de acesso.
                    </AlertBox>
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

      {/* Signing confirmation dialog */}
      <Dialog open={isSignModalOpen} onOpenChange={setIsSignModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <PenTool className="mr-2 h-5 w-5" />
              Assinar Documento
            </DialogTitle>
            <DialogDescription>
              {matchedDocument?.DocumentoFormatado} — {matchedDocument?.Serie.Nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sign-unidade">Unidade</Label>
              <Select value={signUnidade} onValueChange={setSignUnidade}>
                <SelectTrigger id="sign-unidade">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {unidadesFiltroList.map((u) => (
                    <SelectItem key={u.Id} value={u.Id}>
                      {u.Sigla} — {u.Descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign-cargo">Cargo / Função</Label>
              <Input
                id="sign-cargo"
                value={signCargo}
                onChange={(e) => setSignCargo(e.target.value)}
                placeholder="Ex: Assessor Técnico"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign-senha">Senha SEI</Label>
              <Input
                id="sign-senha"
                type="password"
                value={signPassword}
                onChange={(e) => setSignPassword(e.target.value)}
                placeholder="Sua senha de login SEI"
                autoComplete="off"
              />
            </div>
            {signError && (
              <p className="text-sm text-destructive flex items-center">
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" /> {signError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsSignModalOpen(false)} disabled={isSigning}>
              Cancelar
            </Button>
            <Button onClick={handleSign} disabled={isSigning || !signPassword || !signUnidade || !signCargo}>
              {isSigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assinando...
                </>
              ) : (
                <>
                  <PenTool className="mr-2 h-4 w-4" />
                  Assinar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
