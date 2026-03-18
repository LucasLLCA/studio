# React Query - Sistema de Cache

Sistema de cache local implementado com React Query (TanStack Query v5).

## 📁 Estrutura

```
src/lib/react-query/
├── README.md                    # Este arquivo
├── keys.ts                      # Factory de query keys
└── queries/
    ├── useOpenUnits.ts         # Hook para unidades em aberto (✅ implementado)
    └── TEMPLATE_HOOKS.md       # Templates para novos hooks
```

## 🚀 Quick Start

### 1. Usar Hook Existente

```typescript
import { useOpenUnits } from '@/lib/react-query/queries/useOpenUnits';

function MyComponent() {
  const { data, isLoading, error } = useOpenUnits({
    processo: '12345678901234567890',
    unidadeOrigem: '12345',
    token: sessionToken,
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  const unidades = data?.unidades || [];

  return <div>{unidades.length} unidades encontradas</div>;
}
```

### 2. Criar Novo Hook

1. Copie template de [`queries/TEMPLATE_HOOKS.md`](queries/TEMPLATE_HOOKS.md)
2. Adapte para sua necessidade
3. Adicione query key em [`keys.ts`](keys.ts)
4. Importe e use no componente

### 3. Invalidar Cache

```typescript
import { invalidateQueries } from '@/lib/queryClient';

// Invalidar uma query específica
invalidateQueries.openUnits('12345678901234567890');

// Invalidar todas as queries
invalidateQueries.all();
```

## 📋 Hooks Disponíveis

| Hook | Status | Arquivo | TTL | Descrição |
|------|--------|---------|-----|-----------|
| `useOpenUnits` | ✅ Implementado | [`useOpenUnits.ts`](queries/useOpenUnits.ts) | 2h | Unidades em aberto |
| `useProcessData` | ⏳ Template | [`TEMPLATE_HOOKS.md`](queries/TEMPLATE_HOOKS.md) | 5min | Andamentos |
| `useDocuments` | ⏳ Template | [`TEMPLATE_HOOKS.md`](queries/TEMPLATE_HOOKS.md) | 30min | Documentos |
| `useProcessSummary` | ⏳ Template | [`TEMPLATE_HOOKS.md`](queries/TEMPLATE_HOOKS.md) | 1h | Resumo IA |

## 🔑 Query Keys

As query keys são organizadas hierarquicamente para invalidação eficiente:

```typescript
import { queryKeys } from '@/lib/react-query/keys';

// Exemplos de uso
queryKeys.openUnits.all                        // ['openUnits']
queryKeys.openUnits.byProcess('12345')         // ['openUnits', '12345']
queryKeys.openUnits.detail('12345', '100')     // ['openUnits', '12345', '100']
```

**Invalidação em cascata:**
```typescript
// Invalida TODAS as unidades abertas
invalidate(queryKeys.openUnits.all);

// Invalida apenas unidades do processo X
invalidate(queryKeys.openUnits.byProcess('12345'));

// Invalida apenas consulta específica
invalidate(queryKeys.openUnits.detail('12345', '100'));
```

## ⚙️ Configuração Global

Arquivo: [`../queryClient.ts`](../queryClient.ts)

- **GC Time:** 2 horas (TTL do cache)
- **Stale Time:** 5 minutos (dados "fresh")
- **Retry:** 2 tentativas com backoff exponencial
- **Network Mode:** Online only

## 🛠️ Debug

### React Query DevTools

1. Inicie dev server: `npm run dev`
2. Abra aplicação no browser
3. Clique no ícone do React Query (canto inferior)
4. Inspecione queries, cache e estados

### Logs

```typescript
// Habilitar logs detalhados (desenvolvimento)
import { queryClient } from '@/lib/queryClient';

queryClient.setLogger({
  log: console.log,
  warn: console.warn,
  error: console.error,
});
```

## 📚 Documentação

- **[Implementação Completa](../../CACHE_IMPLEMENTATION.md)** - Documentação técnica detalhada
- **[Resumo Executivo](../../RESUMO_IMPLEMENTACAO.md)** - Visão geral e métricas
- **[Templates](queries/TEMPLATE_HOOKS.md)** - Templates para novos hooks

## 🤝 Contribuindo

### Adicionar Novo Hook

1. Crie arquivo em `queries/useNomeDoHook.ts`
2. Use template de [`TEMPLATE_HOOKS.md`](queries/TEMPLATE_HOOKS.md)
3. Adicione query key em [`keys.ts`](keys.ts)
4. Atualize esta tabela
5. Teste build: `npm run build`

### Padrão de Nomenclatura

- **Arquivo:** `useFeatureName.ts` (camelCase)
- **Hook:** `useFeatureName()` (camelCase)
- **Query Key:** `queryKeys.featureName.*` (camelCase)
- **Tipo:** `UseFeatureNameOptions` (PascalCase)

## ⚡ Performance Tips

### 1. Prefetch ao Hover
```typescript
<Link
  onMouseEnter={() => prefetch(queryKeys.openUnits.detail(...))}
>
  Link
</Link>
```

### 2. Dependent Queries
```typescript
const { data: dataA } = useQueryA();
const { data: dataB } = useQueryB({
  enabled: !!dataA, // Só executa se dataA existir
});
```

### 3. Parallel Queries
```typescript
const query1 = useQuery1();
const query2 = useQuery2();
const query3 = useQuery3();
// Executam em paralelo automaticamente
```

## 📊 Métricas

Para ver métricas de cache hit/miss, use React Query DevTools em desenvolvimento.

---

**Versão:** 1.0.0
**React Query:** 5.66.0
**Última atualização:** 2025-11-18
