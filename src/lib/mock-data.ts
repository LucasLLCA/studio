/**
 * Mock data for frontend development without a real backend.
 * Activated by setting NEXT_PUBLIC_MOCK_DATA=true in .env
 */

import type {
  ClientLoginResponse,
  ProcessoData,
  DocumentosResponse,
  UnidadeAberta,
  ProcessSummaryResponse,
} from '@/types/process-flow';
import type { HealthCheckResponse } from '@/lib/sei-api-client';

// ── Document IDs (referenced in andamento descriptions) ──────────────────────

const DOC_OFICIO_SIGNED = '12345678';
const DOC_OFICIO_UNSIGNED = '12345679';
const DOC_DESPACHO = '12345680';
const DOC_NOTA_TECNICA = '12345681';
const DOC_INFORMACAO = '12345682';

// ── Mock functions ───────────────────────────────────────────────────────────

export function mockLogin(): ClientLoginResponse {
  return {
    success: true,
    token: 'mock-session-token-abc123',
    idUnidadeAtual: '110000001',
    unidades: [
      { Id: '110000001', Sigla: 'GAB/SEAD', Descricao: 'Gabinete do Secretário' },
      { Id: '110000002', Sigla: 'DAF/SEAD', Descricao: 'Diretoria de Administração e Finanças' },
    ],
  };
}

export function mockProcessData(): ProcessoData {
  return {
    Info: {
      Pagina: 1,
      TotalPaginas: 1,
      QuantidadeItens: 8,
      TotalItens: 8,
      NumeroProcesso: '00000.000001/2025-00',
    },
    Andamentos: [
      {
        IdAndamento: '1001',
        Tarefa: 'Autuação',
        Descricao: 'Processo autuado na unidade GAB/SEAD',
        DataHora: '2025-01-10T09:00:00',
        Unidade: { IdUnidade: '110000001', Sigla: 'GAB/SEAD', Descricao: 'Gabinete do Secretário' },
        Usuario: { IdUsuario: 'U001', Sigla: 'joao.silva', Nome: 'João Silva' },
      },
      {
        IdAndamento: '1002',
        Tarefa: 'Geração de Documento',
        Descricao: `Geração do documento ${DOC_OFICIO_SIGNED} (Ofício assinado)`,
        DataHora: '2025-01-11T10:30:00',
        Unidade: { IdUnidade: '110000001', Sigla: 'GAB/SEAD', Descricao: 'Gabinete do Secretário' },
        Usuario: { IdUsuario: 'U001', Sigla: 'joao.silva', Nome: 'João Silva' },
      },
      {
        IdAndamento: '1003',
        Tarefa: 'Geração de Documento',
        Descricao: `Geração do documento ${DOC_OFICIO_UNSIGNED} (Ofício pendente assinatura)`,
        DataHora: '2025-01-12T14:00:00',
        Unidade: { IdUnidade: '110000001', Sigla: 'GAB/SEAD', Descricao: 'Gabinete do Secretário' },
        Usuario: { IdUsuario: 'U002', Sigla: 'maria.souza', Nome: 'Maria Souza' },
      },
      {
        IdAndamento: '1004',
        Tarefa: 'Envio de Processo',
        Descricao: 'Processo enviado da unidade GAB/SEAD para DAF/SEAD',
        DataHora: '2025-01-13T08:15:00',
        Unidade: { IdUnidade: '110000001', Sigla: 'GAB/SEAD', Descricao: 'Gabinete do Secretário' },
        Usuario: { IdUsuario: 'U001', Sigla: 'joao.silva', Nome: 'João Silva' },
      },
      {
        IdAndamento: '1005',
        Tarefa: 'Recebimento de Processo',
        Descricao: 'Processo recebido na unidade DAF/SEAD',
        DataHora: '2025-01-13T09:00:00',
        Unidade: { IdUnidade: '110000002', Sigla: 'DAF/SEAD', Descricao: 'Diretoria de Administração e Finanças' },
        Usuario: { IdUsuario: 'U003', Sigla: 'pedro.lima', Nome: 'Pedro Lima' },
      },
      {
        IdAndamento: '1006',
        Tarefa: 'Geração de Documento',
        Descricao: `Geração do documento ${DOC_DESPACHO} (Despacho)`,
        DataHora: '2025-01-14T11:00:00',
        Unidade: { IdUnidade: '110000002', Sigla: 'DAF/SEAD', Descricao: 'Diretoria de Administração e Finanças' },
        Usuario: { IdUsuario: 'U003', Sigla: 'pedro.lima', Nome: 'Pedro Lima' },
      },
      {
        IdAndamento: '1007',
        Tarefa: 'Geração de Documento',
        Descricao: `Geração do documento ${DOC_NOTA_TECNICA} (Nota Técnica)`,
        DataHora: '2025-01-15T15:30:00',
        Unidade: { IdUnidade: '110000002', Sigla: 'DAF/SEAD', Descricao: 'Diretoria de Administração e Finanças' },
        Usuario: { IdUsuario: 'U004', Sigla: 'ana.costa', Nome: 'Ana Costa' },
      },
      {
        IdAndamento: '1008',
        Tarefa: 'Envio de Processo',
        Descricao: 'Processo enviado da unidade DAF/SEAD para CPAG/SEAD',
        DataHora: '2025-01-16T10:00:00',
        Unidade: { IdUnidade: '110000002', Sigla: 'DAF/SEAD', Descricao: 'Diretoria de Administração e Finanças' },
        Usuario: { IdUsuario: 'U003', Sigla: 'pedro.lima', Nome: 'Pedro Lima' },
      },
      {
        IdAndamento: '1009',
        Tarefa: 'Recebimento de Processo',
        Descricao: 'Processo recebido na unidade CPAG/SEAD',
        DataHora: '2025-01-16T10:30:00',
        Unidade: { IdUnidade: '110000003', Sigla: 'CPAG/SEAD', Descricao: 'Coordenação de Pagamento' },
        Usuario: { IdUsuario: 'U005', Sigla: 'lucas.santos', Nome: 'Lucas Santos' },
      },
      {
        IdAndamento: '1010',
        Tarefa: 'Geração de Documento',
        Descricao: `Geração do documento ${DOC_INFORMACAO} (Informação)`,
        DataHora: '2025-01-17T14:00:00',
        Unidade: { IdUnidade: '110000003', Sigla: 'CPAG/SEAD', Descricao: 'Coordenação de Pagamento' },
        Usuario: { IdUsuario: 'U005', Sigla: 'lucas.santos', Nome: 'Lucas Santos' },
      },
    ],
  };
}

export function mockDocuments(): DocumentosResponse {
  const baseDoc = {
    IdProcedimento: 'PROC001',
    ProcedimentoFormatado: '00000.000001/2025-00',
    LinkAcesso: 'https://sei.pi.gov.br/sei/processo_documento.php',
  };

  return {
    Info: {
      Pagina: 1,
      TotalPaginas: 1,
      QuantidadeItens: 5,
      TotalItens: 5,
    },
    Documentos: [
      {
        ...baseDoc,
        IdDocumento: 'D001',
        DocumentoFormatado: DOC_OFICIO_SIGNED,
        Serie: { IdSerie: '11', Nome: 'Ofício', Aplicabilidade: 'Interno' },
        Numero: '001/2025',
        Descricao: 'Ofício de encaminhamento',
        Data: '2025-01-11',
        UnidadeElaboradora: { IdUnidade: '110000001', Sigla: 'GAB/SEAD', Descricao: 'Gabinete do Secretário' },
        AndamentoGeracao: {
          Descricao: `Geração do documento ${DOC_OFICIO_SIGNED}`,
          DataHora: '2025-01-11T10:30:00',
          Unidade: { IdUnidade: '110000001', Sigla: 'GAB/SEAD', Descricao: 'Gabinete do Secretário' },
          Usuario: { IdUsuario: 'U001', Sigla: 'joao.silva', Nome: 'João Silva' },
        },
        Assinaturas: [
          {
            Nome: 'João Silva',
            CargoFuncao: 'Secretário de Administração',
            DataHora: '2025-01-11T11:00:00',
            IdUsuario: 'U001',
            IdOrigem: 'O001',
            Orgao: 'SEAD-PI',
            Sigla: 'joao.silva',
          },
          {
            Nome: 'Maria Souza',
            CargoFuncao: 'Diretora Adjunta',
            DataHora: '2025-01-11T11:30:00',
            IdUsuario: 'U002',
            IdOrigem: 'O002',
            Orgao: 'SEAD-PI',
            Sigla: 'maria.souza',
          },
        ],
      },
      {
        ...baseDoc,
        IdDocumento: 'D002',
        DocumentoFormatado: DOC_OFICIO_UNSIGNED,
        Serie: { IdSerie: '11', Nome: 'Ofício', Aplicabilidade: 'Interno' },
        Numero: '002/2025',
        Descricao: 'Ofício pendente de assinatura',
        Data: '2025-01-12',
        UnidadeElaboradora: { IdUnidade: '110000001', Sigla: 'GAB/SEAD', Descricao: 'Gabinete do Secretário' },
        AndamentoGeracao: {
          Descricao: `Geração do documento ${DOC_OFICIO_UNSIGNED}`,
          DataHora: '2025-01-12T14:00:00',
          Unidade: { IdUnidade: '110000001', Sigla: 'GAB/SEAD', Descricao: 'Gabinete do Secretário' },
          Usuario: { IdUsuario: 'U002', Sigla: 'maria.souza', Nome: 'Maria Souza' },
        },
        Assinaturas: [],
      },
      {
        ...baseDoc,
        IdDocumento: 'D003',
        DocumentoFormatado: DOC_DESPACHO,
        Serie: { IdSerie: '1', Nome: 'Despacho' },
        Numero: '003/2025',
        Descricao: 'Despacho de análise',
        Data: '2025-01-14',
        UnidadeElaboradora: { IdUnidade: '110000002', Sigla: 'DAF/SEAD', Descricao: 'Diretoria de Administração e Finanças' },
        AndamentoGeracao: {
          Descricao: `Geração do documento ${DOC_DESPACHO}`,
          DataHora: '2025-01-14T11:00:00',
          Unidade: { IdUnidade: '110000002', Sigla: 'DAF/SEAD', Descricao: 'Diretoria de Administração e Finanças' },
          Usuario: { IdUsuario: 'U003', Sigla: 'pedro.lima', Nome: 'Pedro Lima' },
        },
      },
      {
        ...baseDoc,
        IdDocumento: 'D004',
        DocumentoFormatado: DOC_NOTA_TECNICA,
        Serie: { IdSerie: '63', Nome: 'Nota Técnica' },
        Numero: '004/2025',
        Descricao: 'Nota técnica de fundamentação',
        Data: '2025-01-15',
        UnidadeElaboradora: { IdUnidade: '110000002', Sigla: 'DAF/SEAD', Descricao: 'Diretoria de Administração e Finanças' },
        AndamentoGeracao: {
          Descricao: `Geração do documento ${DOC_NOTA_TECNICA}`,
          DataHora: '2025-01-15T15:30:00',
          Unidade: { IdUnidade: '110000002', Sigla: 'DAF/SEAD', Descricao: 'Diretoria de Administração e Finanças' },
          Usuario: { IdUsuario: 'U004', Sigla: 'ana.costa', Nome: 'Ana Costa' },
        },
      },
      {
        ...baseDoc,
        IdDocumento: 'D005',
        DocumentoFormatado: DOC_INFORMACAO,
        Serie: { IdSerie: '44', Nome: 'Informação' },
        Numero: '005/2025',
        Descricao: 'Informação complementar',
        Data: '2025-01-17',
        UnidadeElaboradora: { IdUnidade: '110000003', Sigla: 'CPAG/SEAD', Descricao: 'Coordenação de Pagamento' },
        AndamentoGeracao: {
          Descricao: `Geração do documento ${DOC_INFORMACAO}`,
          DataHora: '2025-01-17T14:00:00',
          Unidade: { IdUnidade: '110000003', Sigla: 'CPAG/SEAD', Descricao: 'Coordenação de Pagamento' },
          Usuario: { IdUsuario: 'U005', Sigla: 'lucas.santos', Nome: 'Lucas Santos' },
        },
      },
    ],
  };
}

export function mockOpenUnits(): { unidades: UnidadeAberta[]; linkAcesso?: string } {
  return {
    linkAcesso: 'https://sei.pi.gov.br/sei/processo.php?acao=acessar',
    unidades: [
      {
        Unidade: { IdUnidade: '110000002', Sigla: 'DAF/SEAD', Descricao: 'Diretoria de Administração e Finanças' },
        UsuarioAtribuicao: { IdUsuario: 'U003', Sigla: 'pedro.lima', Nome: 'Pedro Lima' },
      },
      {
        Unidade: { IdUnidade: '110000003', Sigla: 'CPAG/SEAD', Descricao: 'Coordenação de Pagamento' },
        UsuarioAtribuicao: {},
      },
    ],
  };
}

export function mockProcessSummary(): ProcessSummaryResponse {
  return {
    summary:
      'Este processo trata da solicitação de recursos financeiros para aquisição de equipamentos de TI pela SEAD-PI. ' +
      'O processo foi autuado no Gabinete do Secretário (GAB/SEAD) e encaminhado à Diretoria de Administração e Finanças (DAF/SEAD) ' +
      'para análise técnica e financeira. Atualmente encontra-se na Coordenação de Pagamento (CPAG/SEAD) aguardando empenho. ' +
      'Foram gerados ofícios de encaminhamento, despachos de análise e notas técnicas de fundamentação ao longo da tramitação.',
  };
}

export function mockHealthCheck(): HealthCheckResponse {
  return {
    isOnline: true,
    status: 'online',
    responseTime: 42,
    timestamp: new Date(),
  };
}

export const MOCK_PROCESS_SUMMARY_TEXT =
  'Este processo trata da solicitação de recursos financeiros para aquisição de equipamentos de tecnologia da informação ' +
  'pela Secretaria de Administração do Estado do Piauí (SEAD-PI). O processo foi iniciado no Gabinete do Secretário e ' +
  'seguiu para a Diretoria de Administração e Finanças para análise orçamentária. A nota técnica confirma a disponibilidade ' +
  'de recursos no orçamento vigente. O processo encontra-se atualmente na Coordenação de Pagamento para providências de empenho ' +
  'e liquidação da despesa. Todos os documentos obrigatórios foram juntados, incluindo ofícios assinados e despachos de aprovação.';
