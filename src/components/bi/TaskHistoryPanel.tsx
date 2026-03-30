"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBiTasks } from "@/lib/react-query/queries/useBiQueries";
import type { BiTask } from "@/types/bi";

function statusBadge(status: BiTask["status"]) {
  switch (status) {
    case "SUCCESS":
      return (
        <Badge className="bg-success-light text-success dark:bg-success-light dark:text-success text-2xs px-1.5 py-0">
          SUCCESS
        </Badge>
      );
    case "FAILURE":
      return (
        <Badge className="bg-destructive-light text-destructive dark:bg-destructive-light dark:text-destructive text-2xs px-1.5 py-0">
          FAILURE
        </Badge>
      );
    case "STARTED":
      return (
        <Badge className="bg-warning-light text-warning dark:bg-warning-light dark:text-warning text-2xs px-1.5 py-0">
          STARTED
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="outline" className="text-2xs px-1.5 py-0">
          PENDING
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-2xs px-1.5 py-0">
          {status}
        </Badge>
      );
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "-";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

function resultSummary(task: BiTask): string {
  if (task.error_message) return task.error_message;
  if (task.result_summary) {
    return `${task.result_summary.total_processos} processos, ${task.result_summary.total_abertos} abertos`;
  }
  if (task.status === "STARTED") return "Em andamento...";
  if (task.status === "PENDING") return "Aguardando";
  return "-";
}

export function TaskHistoryPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: tasks, isLoading, isFetching } = useBiTasks();

  return (
    <div className="border rounded-lg bg-card mt-6">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span>Historico de Tarefas</span>
          {isFetching && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          {tasks && (
            <span className="text-xs text-muted-foreground">
              ({tasks.length} tarefa{tasks.length !== 1 ? "s" : ""})
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="border-t px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !tasks?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma tarefa encontrada.
            </p>
          ) : (
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-semibold text-xs">
                      Tarefa
                    </th>
                    <th className="px-3 py-2 text-center font-semibold text-xs">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs">
                      Iniciado em
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-xs">
                      Duracao
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-xs">
                      Resultado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task, idx) => (
                    <tr
                      key={`${task.task_id ?? task.task_name}-${idx}`}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 text-xs font-medium">
                        {task.task_name}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {statusBadge(task.status)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {task.started_at
                          ? new Date(task.started_at).toLocaleString("pt-BR")
                          : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs">
                        {formatDuration(task.duration_s)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground truncate max-w-[200px]">
                        {resultSummary(task)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
