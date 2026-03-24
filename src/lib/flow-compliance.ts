/**
 * Flow compliance computation engine.
 *
 * Compares a flow's expected steps (nodes/edges) against actual
 * process andamentos to determine which steps were completed,
 * skipped (violated), or are still pending.
 */

import type { Andamento } from '@/types/process-flow';
import type {
  FluxoDetalhe,
  FluxoProcesso,
  FluxoNode,
  FluxoNodeCompliance,
  FluxoComplianceResult,
  FluxoComplianceSummary,
  ComplianceStatus,
} from '@/types/fluxos';
import { TASK_GROUPS } from '@/lib/task-groups';
import { parseCustomDateString } from '@/lib/process-flow-utils';

// ── Helpers ─────────────────────────────────────────────────

/** Build a Set of SEI task type strings for a given task group key. */
function getTaskTypesForKey(seiTaskKey: string): Set<string> {
  const group = TASK_GROUPS.find((g) => g.key === seiTaskKey);
  return new Set(group?.tasks ?? []);
}

/** Topological sort via Kahn's algorithm, excluding loop edges. */
function topologicalSort(
  nodes: FluxoNode[],
  edges: { source_node_id: string; target_node_id: string; tipo: string }[],
): string[] {
  // Build adjacency and in-degree maps using node_id
  const nodeIds = new Set(nodes.map((n) => n.node_id));
  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    successors.set(id, []);
  }

  for (const edge of edges) {
    if (edge.tipo === 'loop') continue; // exclude loops from ordering
    if (!nodeIds.has(edge.source_node_id) || !nodeIds.has(edge.target_node_id)) continue;
    successors.get(edge.source_node_id)!.push(edge.target_node_id);
    inDegree.set(edge.target_node_id, (inDegree.get(edge.target_node_id) ?? 0) + 1);
  }

  // Kahn's algorithm
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const next of successors.get(current) ?? []) {
      const newDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) queue.push(next);
    }
  }

  // If there are nodes not in sorted (cycles), append them at the end
  for (const id of nodeIds) {
    if (!sorted.includes(id)) sorted.push(id);
  }

  return sorted;
}

// ── Main computation ────────────────────────────────────────

export function computeFlowCompliance(
  fluxo: FluxoDetalhe,
  vinculacao: FluxoProcesso,
  andamentos: Andamento[],
): FluxoComplianceResult {
  const { nodes, edges } = fluxo;
  const nodeMap = new Map(nodes.map((n) => [n.node_id, n]));

  // Build successor map (non-loop edges only)
  const successorMap = new Map<string, string[]>();
  for (const n of nodes) successorMap.set(n.node_id, []);
  for (const e of edges) {
    if (e.tipo === 'loop') continue;
    successorMap.get(e.source_node_id)?.push(e.target_node_id);
  }

  // Topological ordering
  const order = topologicalSort(nodes, edges);
  const orderIndex = new Map(order.map((id, i) => [id, i]));

  // Historico lookup
  const historicoMap = new Map<string, { entrada_em: string; saida_em?: string | null }>();
  for (const entry of vinculacao.historico ?? []) {
    historicoMap.set(entry.node_id, entry);
  }

  // ── Step 1: Classify each node ──

  const complianceMap = new Map<string, FluxoNodeCompliance>();

  for (const node of nodes) {
    let status: ComplianceStatus = 'pendente';
    const matched: FluxoNodeCompliance['matched_andamentos'] = [];
    let timestamp: string | null = null;

    switch (node.tipo) {
      case 'inicio': {
        status = 'concluido';
        // Use earliest andamento as timestamp
        if (andamentos.length > 0) {
          const earliest = andamentos.reduce((min, a) => {
            const d = parseCustomDateString(a.DataHora);
            const mDate = parseCustomDateString(min.DataHora);
            return d < mDate ? a : min;
          });
          timestamp = earliest.DataHora;
        }
        break;
      }

      case 'fim': {
        status = vinculacao.status === 'concluido' ? 'concluido' : 'pendente';
        timestamp = vinculacao.concluido_em ?? null;
        break;
      }

      case 'sei_task': {
        if (node.sei_task_key) {
          const taskTypes = getTaskTypesForKey(node.sei_task_key);
          for (const a of andamentos) {
            if (taskTypes.has(a.Tarefa)) {
              matched.push({
                Tarefa: a.Tarefa,
                DataHora: a.DataHora,
                Usuario: a.Usuario ? { Nome: a.Usuario.Nome } : undefined,
              });
            }
          }
          if (matched.length > 0) {
            status = 'concluido';
            // Earliest match
            timestamp = matched.reduce((min, m) => {
              const d = parseCustomDateString(m.DataHora);
              const mDate = parseCustomDateString(min.DataHora);
              return d < mDate ? m : min;
            }).DataHora;
          }
        }
        break;
      }

      case 'etapa': {
        const hist = historicoMap.get(node.node_id);
        if (hist) {
          if (hist.saida_em) {
            status = 'concluido';
            timestamp = hist.saida_em;
          } else {
            status = 'em_andamento';
            timestamp = hist.entrada_em;
          }
        }
        // Also check if it's the current node
        if (vinculacao.node_atual_id === node.node_id && status === 'pendente') {
          status = 'em_andamento';
        }
        break;
      }

      case 'decisao': {
        // Concluido if any successor path has started
        const succs = successorMap.get(node.node_id) ?? [];
        // Will be re-evaluated after all nodes are classified
        // For now, mark as pendente; we'll fix in a second pass
        if (succs.length === 0) status = 'pendente';
        break;
      }

      case 'fork': {
        // Same as decisao - depends on successors
        break;
      }

      case 'join': {
        // Depends on predecessors - will be resolved in second pass
        break;
      }
    }

    complianceMap.set(node.node_id, {
      node,
      status,
      matched_andamentos: matched,
      timestamp,
      order: orderIndex.get(node.node_id) ?? 999,
    });
  }

  // ── Step 2: Resolve decisao/fork/join based on neighbors ──

  // Build predecessor map
  const predecessorMap = new Map<string, string[]>();
  for (const n of nodes) predecessorMap.set(n.node_id, []);
  for (const e of edges) {
    if (e.tipo === 'loop') continue;
    predecessorMap.get(e.target_node_id)?.push(e.source_node_id);
  }

  for (const nodeId of order) {
    const comp = complianceMap.get(nodeId)!;
    if (comp.node.tipo === 'decisao' || comp.node.tipo === 'fork') {
      const succs = successorMap.get(nodeId) ?? [];
      const anySuccDone = succs.some((s) => {
        const sc = complianceMap.get(s);
        return sc && (sc.status === 'concluido' || sc.status === 'em_andamento');
      });
      const allPredsDone = (predecessorMap.get(nodeId) ?? []).every((p) => {
        const pc = complianceMap.get(p);
        return pc && pc.status === 'concluido';
      });
      if (anySuccDone) {
        comp.status = 'concluido';
      } else if (allPredsDone) {
        comp.status = 'em_andamento';
      }
    }

    if (comp.node.tipo === 'join') {
      const preds = predecessorMap.get(nodeId) ?? [];
      const allDone = preds.every((p) => complianceMap.get(p)?.status === 'concluido');
      const someDone = preds.some((p) => {
        const pc = complianceMap.get(p);
        return pc && (pc.status === 'concluido' || pc.status === 'em_andamento');
      });
      if (allDone) {
        comp.status = 'concluido';
      } else if (someDone) {
        comp.status = 'em_andamento';
      }
    }
  }

  // ── Step 3: Violation detection ──
  // Walk in reverse topological order. If a node is 'pendente' but
  // has any downstream successor that is 'concluido', mark as 'violado'.

  const hasDownstreamCompleted = new Map<string, boolean>();

  for (let i = order.length - 1; i >= 0; i--) {
    const nodeId = order[i];
    const comp = complianceMap.get(nodeId)!;
    const succs = successorMap.get(nodeId) ?? [];

    // A node has downstream completed if it itself is completed,
    // or any of its successors has downstream completed
    const selfDone = comp.status === 'concluido' || comp.status === 'em_andamento';
    const anySuccDownstream = succs.some((s) => hasDownstreamCompleted.get(s) === true);

    hasDownstreamCompleted.set(nodeId, selfDone || anySuccDownstream);

    // If this node is pendente but successors downstream are completed → violated
    if (comp.status === 'pendente' && anySuccDownstream) {
      comp.status = 'violado';
    }
  }

  // ── Step 4: Build result ──

  const nodeResults = Array.from(complianceMap.values()).sort((a, b) => a.order - b.order);

  // Only count actionable nodes (skip inicio/fim for progress)
  const actionable = nodeResults.filter(
    (n) => n.node.tipo !== 'inicio' && n.node.tipo !== 'fim'
  );
  const total = actionable.length;
  const concluido = actionable.filter((n) => n.status === 'concluido').length;
  const em_andamento = actionable.filter((n) => n.status === 'em_andamento').length;
  const pendente = actionable.filter((n) => n.status === 'pendente').length;
  const violado = actionable.filter((n) => n.status === 'violado').length;

  const summary: FluxoComplianceSummary = {
    total,
    concluido,
    em_andamento,
    pendente,
    violado,
    progress_percent: total > 0 ? Math.round((concluido / total) * 100) : 0,
  };

  return {
    fluxo,
    vinculacao,
    nodes: nodeResults,
    summary,
  };
}
