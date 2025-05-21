import { ProcessFlowClient } from '@/components/process-flow/ProcessFlowClient';
import type { ProcessoData } from '@/types/process-flow';
import { BarChart3, GitFork, Zap } from 'lucide-react';

// Hardcoded data as per user request
const sampleProcessData: ProcessoData = {
  "Info": {
    "Pagina": 1,
    "TotalPaginas": 6,
    "QuantidadeItens": 10,
    "TotalItens": 54
  },
  "Andamentos": [
    {
      "IdAndamento": "103752670",
      "Tarefa": "CONCLUSAO-PROCESSO-UNIDADE",
      "Descricao": "Conclusão do processo na unidade",
      "DataHora": "21/02/2025 08:48:48",
      "Unidade": {
        "IdUnidade": "110006180",
        "Sigla": "SEAD-PI/SGP/CIASPI",
        "Descricao": "Diretoria do Ciaspi - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100027418",
        "Sigla": "thais.veloso@sead.pi.gov.br",
        "Nome": "Thaís Bemvindo Veloso"
      }
    },
    {
      "IdAndamento": "103324224",
      "Tarefa": "CONCLUSAO-PROCESSO-UNIDADE",
      "Descricao": "Conclusão do processo na unidade",
      "DataHora": "18/02/2025 11:22:23",
      "Unidade": {
        "IdUnidade": "110006442",
        "Sigla": "SEAD-PI/GAB/SGACG/DLOG",
        "Descricao": "Diretoria de Logística e Abastecimento - DLOG"
      },
      "Usuario": {
        "IdUsuario": "100033540",
        "Sigla": "francisco.souza@sead.pi.gov.br",
        "Nome": "FRANCISCO DANIEL BATISTA E SOUZA"
      }
    },
    {
      "IdAndamento": "103320074",
      "Tarefa": "PROCESSO-CIENCIA",
      "Descricao": "Ciência no processo",
      "DataHora": "18/02/2025 11:14:54",
      "Unidade": {
        "IdUnidade": "110006442",
        "Sigla": "SEAD-PI/GAB/SGACG/DLOG",
        "Descricao": "Diretoria de Logística e Abastecimento - DLOG"
      },
      "Usuario": {
        "IdUsuario": "100033540",
        "Sigla": "francisco.souza@sead.pi.gov.br",
        "Nome": "FRANCISCO DANIEL BATISTA E SOUZA"
      }
    },
    {
      "IdAndamento": "103316075",
      "Tarefa": "PROCESSO-INCLUIDO-EM-BLOCO",
      "Descricao": "Processo inserido no bloco 417794",
      "DataHora": "18/02/2025 11:06:12",
      "Unidade": {
        "IdUnidade": "110006442",
        "Sigla": "SEAD-PI/GAB/SGACG/DLOG",
        "Descricao": "Diretoria de Logística e Abastecimento - DLOG"
      },
      "Usuario": {
        "IdUsuario": "100033540",
        "Sigla": "francisco.souza@sead.pi.gov.br",
        "Nome": "FRANCISCO DANIEL BATISTA E SOUZA"
      }
    },
    {
      "IdAndamento": "100017189",
      "Tarefa": "PROCESSO-RECEBIDO-UNIDADE",
      "Descricao": "Processo recebido na unidade",
      "DataHora": "15/01/2025 15:49:07",
      "Unidade": {
        "IdUnidade": "110008884",
        "Sigla": "SEAD-PI/SGP/DDP",
        "Descricao": "Diretoria de Desenvolvimento de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100034350",
        "Sigla": "francisco.luan@sead.pi.gov.br",
        "Nome": "FRANCISCO LUAN GOMES DE OLIVEIRA"
      }
    },
    {
      "IdAndamento": "75168931",
      "Tarefa": "CONCLUSAO-PROCESSO-UNIDADE",
      "Descricao": "Conclusão do processo na unidade",
      "DataHora": "29/04/2024 09:32:08",
      "Unidade": {
        "IdUnidade": "110006178",
        "Sigla": "SEAD-PI/GAB/SGP",
        "Descricao": "Superintendência de Gestão de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100010235",
        "Sigla": "garcias.guedes@sead.pi.gov.br",
        "Nome": "GARCIAS GUEDES RODRIGUES JÚNIOR - Matr.0371160-9"
      }
    },
    {
      "IdAndamento": "74718439",
      "Tarefa": "CONCLUSAO-AUTOMATICA-UNIDADE",
      "Descricao": "Conclusão automática de processo na unidade",
      "DataHora": "23/04/2024 19:03:08",
      "Unidade": {
        "IdUnidade": "110006183",
        "Sigla": "SEAD-PI/SGP/DUGP",
        "Descricao": "Diretoria de Unidade de Gestão de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100029670",
        "Sigla": "daniele.reis@sead.pi.gov.br",
        "Nome": "DANIELE REIS SOUSA SILVA  Matr.401285-2"
      }
    },
    {
      "IdAndamento": "74718438",
      "Tarefa": "PROCESSO-REMETIDO-UNIDADE",
      "Descricao": "Processo remetido pela unidade <a href=\"javascript:void(0);\" alt=\"Diretoria de Unidade de Gestão de Pessoas - SEAD-PI\" title=\"Diretoria de Unidade de Gestão de Pessoas - SEAD-PI\" class=\"ancoraSigla\">SEAD-PI/SGP/DUGP</a> para SEAD-PI/SGP/DDP",
      "DataHora": "23/04/2024 19:03:08",
      "Unidade": { // Assuming this is the target unit after remittance.
        "IdUnidade": "110008884", // SEAD-PI/SGP/DDP
        "Sigla": "SEAD-PI/SGP/DDP", 
        "Descricao": "Diretoria de Desenvolvimento de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100029670",
        "Sigla": "daniele.reis@sead.pi.gov.br",
        "Nome": "DANIELE REIS SOUSA SILVA  Matr.401285-2"
      }
    },
    {
      "IdAndamento": "67690772",
      "Tarefa": "CONCLUSAO-PROCESSO-UNIDADE",
      "Descricao": "Conclusão do processo na unidade",
      "DataHora": "04/02/2024 16:43:10",
      "Unidade": {
        "IdUnidade": "110006191",
        "Sigla": "SEAD-PI/SGP/DFPG",
        "Descricao": "Diretoria de Folha de Pagamento - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100000130",
        "Sigla": "geisa@sead.pi.gov.br",
        "Nome": "GEISA CRONEMBERGER DO RÊGO FERREIRA - Matr.0157016-1"
      }
    },
    {
      "IdAndamento": "67690771",
      "Tarefa": "PROCESSO-CIENCIA",
      "Descricao": "Ciência no processo",
      "DataHora": "04/02/2024 16:43:02",
      "Unidade": {
        "IdUnidade": "110006191",
        "Sigla": "SEAD-PI/SGP/DFPG",
        "Descricao": "Diretoria de Folha de Pagamento - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100000130",
        "Sigla": "geisa@sead.pi.gov.br",
        "Nome": "GEISA CRONEMBERGER DO RÊGO FERREIRA - Matr.0157016-1"
      }
    }
  ]
};


export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      <header className="p-6 border-b border-border shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GitFork className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-semibold text-foreground">
              Process Flow Tracker
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-accent" />
            <span>AI-Powered Insights</span>
          </div>
        </div>
      </header>
      <div className="flex-grow container mx-auto max-w-full">
        <ProcessFlowClient initialData={sampleProcessData} />
      </div>
      <footer className="p-4 border-t border-border text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Process Flow Tracker. Todos os direitos reservados.
      </footer>
    </main>
  );
}
