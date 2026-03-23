'use client';

import { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';

export interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  nodeId?: string;
}

export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  isValid: boolean;
}

const EMPTY_RESULT: ValidationResult = { errors: [], warnings: [], isValid: true };

export function useFlowValidation() {
  const [result, setResult] = useState<ValidationResult>(EMPTY_RESULT);

  const validate = useCallback((nodes: Node[], edges: Edge[]): ValidationResult => {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // ── 1. Fluxo vazio ────────────────────────────────────────────────────
    if (nodes.length === 0) {
      errors.push({
        code: 'EMPTY_FLOW',
        message: 'O fluxo está vazio. Adicione pelo menos um nó ao canvas.',
        severity: 'error',
      });
      const res = { errors, warnings, isValid: false };
      setResult(res);
      return res;
    }

    // ── 2 & 3 & 4. Início e Fim ───────────────────────────────────────────
    const inicioNodes = nodes.filter((n) => n.type === 'inicio');
    const fimNodes = nodes.filter((n) => n.type === 'fim');

    if (inicioNodes.length === 0) {
      errors.push({
        code: 'NO_START_NODE',
        message: 'O fluxo não possui nó de Início.',
        severity: 'error',
      });
    } else if (inicioNodes.length > 1) {
      inicioNodes.forEach((n) =>
        errors.push({
          code: 'MULTIPLE_START_NODES',
          message: 'Existe mais de um nó de Início. O fluxo deve ter apenas um.',
          severity: 'error',
          nodeId: n.id,
        }),
      );
    }

    if (fimNodes.length === 0) {
      errors.push({
        code: 'NO_END_NODE',
        message: 'O fluxo não possui nó de Fim.',
        severity: 'error',
      });
    } else if (fimNodes.length > 1) {
      fimNodes.forEach((n) =>
        errors.push({
          code: 'MULTIPLE_END_NODES',
          message: 'Existe mais de um nó de Fim. O fluxo deve ter apenas um.',
          severity: 'error',
          nodeId: n.id,
        }),
      );
    }

    // ── 5. Decisão com número errado de saídas ────────────────────────────
    const decisaoNodes = nodes.filter((n) => n.type === 'decisao');
    decisaoNodes.forEach((n) => {
      const outgoing = edges.filter((e) => e.source === n.id);
      if (outgoing.length !== 2) {
        errors.push({
          code: 'DECISION_MISSING_BRANCHES',
          message: `Nó de Decisão "${(n.data as Record<string, unknown>).nome || n.id}" deve ter exatamente 2 setas saindo (tem ${outgoing.length}).`,
          severity: 'error',
          nodeId: n.id,
        });
      }
    });

    // ── 6. Caminho válido de Início ao Fim (BFS) ──────────────────────────
    if (inicioNodes.length === 1 && fimNodes.length === 1) {
      const startId = inicioNodes[0].id;
      const endId = fimNodes[0].id;

      // Monta grafo de adjacência
      const adjMap = new Map<string, string[]>();
      nodes.forEach((n) => adjMap.set(n.id, []));
      edges.forEach((e) => adjMap.get(e.source)?.push(e.target));

      // BFS
      const visited = new Set<string>();
      const queue = [startId];
      visited.add(startId);
      let reachedEnd = false;

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (current === endId) { reachedEnd = true; break; }
        for (const neighbor of adjMap.get(current) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      if (!reachedEnd) {
        errors.push({
          code: 'NO_PATH_TO_END',
          message: 'Não existe caminho conectado do nó Início até o nó Fim.',
          severity: 'error',
        });
      }

      // ── 9. Nós inalcançáveis a partir do Início ───────────────────────
      nodes.forEach((n) => {
        if (n.id !== startId && !visited.has(n.id)) {
          warnings.push({
            code: 'UNREACHABLE_NODE',
            message: `Nó "${(n.data as Record<string, unknown>).nome || n.id}" não é alcançável a partir do Início.`,
            severity: 'warning',
            nodeId: n.id,
          });
        }
      });
    }

    // ── 7. Nó solto (sem entradas nem saídas) ─────────────────────────────
    nodes.forEach((n) => {
      const hasAnyEdge = edges.some((e) => e.source === n.id || e.target === n.id);
      if (!hasAnyEdge) {
        warnings.push({
          code: 'ISOLATED_NODE',
          message: `Nó "${(n.data as Record<string, unknown>).nome || n.id}" está solto — sem nenhuma seta conectada.`,
          severity: 'warning',
          nodeId: n.id,
        });
      }
    });

    // ── 8. Seta de Decisão sem rótulo ─────────────────────────────────────
    edges.forEach((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      if (sourceNode?.type === 'decisao' && !e.label) {
        warnings.push({
          code: 'DECISION_EDGE_NO_LABEL',
          message: `Uma seta saindo do nó de Decisão "${(sourceNode.data as Record<string, unknown>).nome || sourceNode.id}" não tem rótulo (ex: "Sim" / "Não").`,
          severity: 'warning',
          nodeId: sourceNode.id,
        });
      }
    });

    const res: ValidationResult = { errors, warnings, isValid: errors.length === 0 };
    setResult(res);
    return res;
  }, []);

  const clear = useCallback(() => setResult(EMPTY_RESULT), []);

  return { ...result, validate, clear };
}
