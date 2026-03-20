'use client';

import React from 'react';
import { AlertTriangle, XCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ValidationIssue } from '@/hooks/useFlowValidation';

interface ValidationPanelProps {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  onClose: () => void;
}

export default function ValidationPanel({ errors, warnings, onClose }: ValidationPanelProps) {
  const { fitView } = useReactFlow();
  const [collapsed, setCollapsed] = React.useState(false);

  const total = errors.length + warnings.length;

  const focusNode = (nodeId: string | undefined) => {
    if (!nodeId) return;
    fitView({ nodes: [{ id: nodeId }], padding: 0.5, duration: 400 });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-border bg-card shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">Validação do Fluxo</span>
          {errors.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
              <XCircle className="h-3 w-3" />
              {errors.length} erro{errors.length > 1 ? 's' : ''}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              {warnings.length} aviso{warnings.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expandir' : 'Minimizar'}
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClose}
            title="Fechar painel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lista */}
      {!collapsed && (
        <div className="max-h-48 overflow-y-auto divide-y divide-border">
          {total === 0 && (
            <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum problema encontrado.</p>
          )}

          {errors.map((issue, i) => (
            <IssueRow key={`err-${i}`} issue={issue} onFocus={focusNode} />
          ))}

          {warnings.map((issue, i) => (
            <IssueRow key={`warn-${i}`} issue={issue} onFocus={focusNode} />
          ))}
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue, onFocus }: { issue: ValidationIssue; onFocus: (id?: string) => void }) {
  const isError = issue.severity === 'error';

  return (
    <button
      className={cn(
        'w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors',
        issue.nodeId
          ? 'hover:bg-muted/60 cursor-pointer'
          : 'cursor-default',
      )}
      onClick={() => issue.nodeId && onFocus(issue.nodeId)}
      title={issue.nodeId ? 'Clicar para centralizar o nó no canvas' : undefined}
    >
      {isError
        ? <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
      }
      <div className="min-w-0">
        <p className={cn('text-sm', isError ? 'text-destructive' : 'text-amber-700')}>
          {issue.message}
        </p>
        {issue.nodeId && (
          <p className="text-[10px] text-muted-foreground mt-0.5">Clique para ir ao nó</p>
        )}
      </div>
    </button>
  );
}
