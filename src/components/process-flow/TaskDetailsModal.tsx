
"use client";

import type { ProcessedAndamento, LoginCredentials } from '@/types/process-flow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { summarizeTaskDescription } from '@/ai/flows/summarize-task-description';
import { fetchDocumentSummary } from '@/app/sei-actions';
import React, { useState, useEffect } from 'react';
import { formatDisplayDate } from '@/lib/process-flow-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, User, Briefcase, CalendarClock, FileText, Sparkles, Layers, Loader2, FileSearch } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TaskDetailsModalProps {
  task: ProcessedAndamento | null;
  isOpen: boolean;
  onClose: () => void;
  loginCredentials: LoginCredentials | null;
  isAuthenticated: boolean;
}

export function TaskDetailsModal({ task, isOpen, onClose, loginCredentials, isAuthenticated }: TaskDetailsModalProps) {
  const [taskAISummary, setTaskAISummary] = useState<string | null>(null);
  const [isLoadingTaskAISummary, setIsLoadingTaskAISummary] = useState<boolean>(false);
  const [taskAISummaryError, setTaskAISummaryError] = useState<string | null>(null);

  const [extractedDocumentNumber, setExtractedDocumentNumber] = useState<string | null>(null);
  const [documentSummary, setDocumentSummary] = useState<string | null>(null);
  const [isLoadingDocumentSummary, setIsLoadingDocumentSummary] = useState<boolean>(false);
  const [documentSummaryError, setDocumentSummaryError] = useState<string | null>(null);

  useEffect(() => {
    // Reset all summary states when modal opens or task changes
    setTaskAISummary(null);
    setTaskAISummaryError(null);
    setIsLoadingTaskAISummary(false);
    setExtractedDocumentNumber(null);
    setDocumentSummary(null);
    setDocumentSummaryError(null);
    setIsLoadingDocumentSummary(false);

    if (task && isOpen) {
      // Fetch AI summary for the task description
      if (!task.isSummaryNode) {
        setIsLoadingTaskAISummary(true);
        summarizeTaskDescription({ taskDescription: task.Descricao })
          .then(response => {
            setTaskAISummary(response.summary);
          })
          .catch(err => {
            console.error("Error summarizing task description:", err);
            setTaskAISummaryError("Falha ao resumir a descrição da tarefa (IA).");
          })
          .finally(() => {
            setIsLoadingTaskAISummary(false);
          });
      }

      // Extract document number for potential document summary
      const docNumberMatch = task.Descricao.match(/\b(\d{8,9})\b/);
      if (docNumberMatch && docNumberMatch[1]) {
        setExtractedDocumentNumber(docNumberMatch[1]);
      }
    }
  }, [task, isOpen]);

  const handleFetchDocumentSummary = async () => {
    if (!extractedDocumentNumber || !loginCredentials || !task) {
      setDocumentSummaryError("Não é possível buscar o resumo do documento. Dados ausentes.");
      return;
    }

    setIsLoadingDocumentSummary(true);
    setDocumentSummary(null);
    setDocumentSummaryError(null);

    try {
      const result = await fetchDocumentSummary(loginCredentials, extractedDocumentNumber, task.Unidade.IdUnidade);
      if ('error' in result) {
        setDocumentSummaryError(result.error || "Erro desconhecido ao buscar resumo do documento.");
      } else {
        setDocumentSummary(result.summary);
      }
    } catch (err) {
      console.error("Error fetching document summary:", err);
      setDocumentSummaryError("Falha crítica ao buscar resumo do documento.");
    } finally {
      setIsLoadingDocumentSummary(false);
    }
  };

  if (!task) return null;

  const cleanDescription = task.Descricao.replace(/<[^>]*>?/gm, '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
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
            {!task.isSummaryNode && (
              <div className="flex items-start space-x-3">
                <Sparkles className="h-5 w-5 mt-1 text-accent flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-foreground">Resumo AI da Tarefa</h3>
                  {isLoadingTaskAISummary ? (
                    <Skeleton className="h-12 w-full rounded-md" />
                  ) : taskAISummaryError ? (
                    <p className="text-sm text-destructive flex items-center"><AlertCircle className="h-4 w-4 mr-1" /> {taskAISummaryError}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{taskAISummary || "Nenhum resumo de IA disponível para esta tarefa."}</p>
                  )}
                </div>
              </div>
            )}

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
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground flex items-center">
                    <FileSearch className="h-5 w-5 mr-2 text-accent" />
                    Resumo do Documento ({extractedDocumentNumber})
                  </h3>
                  <Button 
                    onClick={handleFetchDocumentSummary} 
                    disabled={isLoadingDocumentSummary || !loginCredentials}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    {isLoadingDocumentSummary ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Gerar Resumo do Documento
                  </Button>
                  {isLoadingDocumentSummary && (
                     <div className="flex items-center text-sm text-muted-foreground mt-2">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Buscando resumo do documento...
                     </div>
                  )}
                  {documentSummaryError && (
                    <p className="text-sm text-destructive flex items-center mt-2"><AlertCircle className="h-4 w-4 mr-1" /> {documentSummaryError}</p>
                  )}
                  {documentSummary && !isLoadingDocumentSummary && (
                    <div className="mt-2 p-3 border rounded-md bg-secondary/30">
                        <p className="text-sm text-secondary-foreground whitespace-pre-wrap">{documentSummary}</p>
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

```