"use client";

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/keys';
import { useToast } from '@/hooks/use-toast';
import { useBiTasks, useRotinas } from '@/lib/react-query/queries/useBiQueries';
import { triggerRotina } from '@/lib/api/bi-api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Clock4, CheckCircle2, XCircle, Cog, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function RotinasTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: rotinas, isLoading: rotinasLoading } = useRotinas();
  const { data: tasks, isLoading: tasksLoading } = useBiTasks();
  const [triggeringKey, setTriggeringKey] = useState<string | null>(null);

  const isLoading = rotinasLoading || tasksLoading;

  const handleTrigger = async (rotina: { key: string; name: string; refresh_endpoint: string }) => {
    setTriggeringKey(rotina.key);
    const result = await triggerRotina(rotina.refresh_endpoint);
    if ('error' in result) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: `${rotina.name} iniciada` });
      queryClient.invalidateQueries({ queryKey: queryKeys.bi.tasks });
    }
    setTriggeringKey(null);
  };

  const rotinaStatus = (taskName: string) => {
    if (!tasks) return { lastRun: null, isRunning: false, lastStatus: null as string | null, lastDuration: null as number | null, lastResult: null as Record<string, unknown> | null, lastError: null as string | null };
    const matching = tasks.filter(t => t.task_name === taskName);
    const running = matching.find(t => t.status === 'STARTED');
    const lastFinished = matching.find(t => t.status === 'SUCCESS' || t.status === 'FAILURE');
    const last = running ?? lastFinished ?? matching[0];
    return {
      lastRun: last?.started_at ? new Date(last.started_at) : null,
      isRunning: !!running,
      lastStatus: lastFinished?.status ?? null,
      lastDuration: lastFinished?.duration_s ?? null,
      lastResult: (lastFinished?.result_summary as Record<string, unknown>) ?? null,
      lastError: lastFinished?.error_message ?? null,
    };
  };

  const formatResultSummary = (result: Record<string, unknown> | null) => {
    if (!result) return null;
    return Object.entries(result)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="h-5 w-5" /> Rotinas
        </CardTitle>
        <CardDescription>
          Rotinas agendadas de pré-computação e manutenção do sistema (descoberta automática)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !rotinas?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma rotina registrada no backend.
          </p>
        ) : (
          <div className="space-y-3">
            {rotinas.map(rotina => {
              const status = rotinaStatus(rotina.task_name);
              const isTriggering = triggeringKey === rotina.key;

              return (
                <div key={rotina.key} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{rotina.name}</span>
                        <Badge variant="outline" className="text-2xs px-1.5 py-0">
                          {rotina.category}
                        </Badge>
                        {status.isRunning && (
                          <Badge variant="secondary" className="gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Executando
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rotina.description}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock4 className="h-3 w-3" />
                          {rotina.schedule}
                        </span>
                        {status.lastRun && (
                          <span className="flex items-center gap-1">
                            {status.lastStatus === 'SUCCESS' ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : status.lastStatus === 'FAILURE' ? (
                              <XCircle className="h-3 w-3 text-red-500" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            Última: {status.lastRun.toLocaleString('pt-BR')}
                            {status.lastDuration != null && (
                              <span>({status.lastDuration.toFixed(1)}s)</span>
                            )}
                          </span>
                        )}
                        {status.lastResult && (
                          <span>{formatResultSummary(status.lastResult)}</span>
                        )}
                        {status.lastError && (
                          <span className="text-red-500 truncate max-w-[300px]" title={status.lastError}>
                            Erro: {status.lastError}
                          </span>
                        )}
                        {!status.lastRun && (
                          <span className="italic">Nunca executada</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTrigger(rotina)}
                      disabled={isTriggering || status.isRunning}
                      className="shrink-0"
                    >
                      {isTriggering ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1.5" />
                      )}
                      Executar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
