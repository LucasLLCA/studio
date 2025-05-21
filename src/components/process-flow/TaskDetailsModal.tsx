"use client";

import type { ProcessedAndamento } from '@/types/process-flow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { summarizeTaskDescription } from '@/ai/flows/summarize-task-description';
import React, { useState, useEffect } from 'react';
import { formatDisplayDate } from '@/lib/process-flow-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, CheckCircle, User, Briefcase, CalendarClock, FileText, Sparkles } from 'lucide-react';

interface TaskDetailsModalProps {
  task: ProcessedAndamento | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskDetailsModal({ task, isOpen, onClose }: TaskDetailsModalProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task && isOpen) {
      // Reset state for new task
      setSummary(null);
      setError(null);
      setIsLoadingSummary(true);

      summarizeTaskDescription({ taskDescription: task.Descricao })
        .then(response => {
          setSummary(response.summary);
        })
        .catch(err => {
          console.error("Error summarizing task:", err);
          setError("Falha ao resumir a descrição da tarefa.");
        })
        .finally(() => {
          setIsLoadingSummary(false);
        });
    }
  }, [task, isOpen]);

  if (!task) return null;

  // Basic HTML stripping for display, consider a more robust sanitizer for production
  const cleanDescription = task.Descricao.replace(/<[^>]*>?/gm, '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold text-primary flex items-center">
             <FileText className="mr-2 h-6 w-6" /> Detalhes da Tarefa #{task.globalSequence}
          </DialogTitle>
          <DialogDescription>
            Informações detalhadas sobre o andamento do processo.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6">
          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-3">
              <Sparkles className="h-5 w-5 mt-1 text-accent" />
              <div>
                <h3 className="font-medium text-foreground">Resumo AI</h3>
                {isLoadingSummary ? (
                  <Skeleton className="h-12 w-full rounded-md" />
                ) : error ? (
                  <p className="text-sm text-destructive flex items-center"><AlertCircle className="h-4 w-4 mr-1" /> {error}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">{summary || "Nenhum resumo disponível."}</p>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 mt-1 text-primary" />
              <div>
                <h3 className="font-medium text-foreground">Tarefa (Tipo)</h3>
                <p className="text-sm text-muted-foreground">{task.Tarefa}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 mt-1 text-primary" />
              <div>
                <h3 className="font-medium text-foreground">Descrição Original</h3>
                <p className="text-sm text-muted-foreground break-words">{cleanDescription}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <CalendarClock className="h-5 w-5 mt-1 text-primary" />
              <div>
                <h3 className="font-medium text-foreground">Data e Hora</h3>
                <p className="text-sm text-muted-foreground">{formatDisplayDate(task.parsedDate)}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Briefcase className="h-5 w-5 mt-1 text-primary" />
              <div>
                <h3 className="font-medium text-foreground">Unidade</h3>
                <p className="text-sm text-muted-foreground">{task.Unidade.Sigla} - {task.Unidade.Descricao}</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 mt-1 text-primary" />
              <div>
                <h3 className="font-medium text-foreground">Usuário</h3>
                <p className="text-sm text-muted-foreground">{task.Usuario.Nome} ({task.Usuario.Sigla})</p>
              </div>
            </div>
          </div>
        </ScrollArea>
        <div className="mt-auto pt-4">
          <Button onClick={onClose} variant="outline" className="w-full">
            <CheckCircle className="mr-2 h-4 w-4" /> Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
