
import type { ProcessoData } from '@/types/process-flow';

export const sampleProcessFlowData: ProcessoData = {
  "Info": {
    "Pagina": 1,
    "TotalPaginas": 1,
    "QuantidadeItens": 54,
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
      },
      "Atributos": []
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
      },
      "Atributos": []
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
      },
      "Atributos": []
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
      },
      "Atributos": [
        {
          "Nome": "BLOCO",
          "Valor": "417794",
          "IdOrigem": "417794"
        }
      ]
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
      },
      "Atributos": []
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
      },
      "Atributos": []
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
      },
      "Atributos": []
    },
    {
      "IdAndamento": "74718438",
      "Tarefa": "PROCESSO-REMETIDO-UNIDADE",
      "Descricao": "Processo remetido pela unidade <a href=\"javascript:void(0);\" alt=\"Diretoria de Unidade de Gestão de Pessoas - SEAD-PI\" title=\"Diretoria de Unidade de Gestão de Pessoas - SEAD-PI\" class=\"ancoraSigla\">SEAD-PI/SGP/DUGP</a>",
      "DataHora": "23/04/2024 19:03:08",
      "Unidade": {
        "IdUnidade": "110008884",
        "Sigla": "SEAD-PI/SGP/DDP",
        "Descricao": "Diretoria de Desenvolvimento de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100029670",
        "Sigla": "daniele.reis@sead.pi.gov.br",
        "Nome": "DANIELE REIS SOUSA SILVA  Matr.401285-2"
      },
      "Atributos": [
        {
          "Nome": "UNIDADE",
          "Valor": "SEAD-PI/SGP/DUGP¥Diretoria de Unidade de Gestão de Pessoas - SEAD-PI",
          "IdOrigem": "110006183"
        }
      ]
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
      },
      "Atributos": []
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
      },
      "Atributos": []
    },
    {
      "IdAndamento": "61399964",
      "Tarefa": "CONCLUSAO-PROCESSO-UNIDADE",
      "Descricao": "Conclusão do processo na unidade",
      "DataHora": "12/11/2023 19:22:44",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100029425",
        "Sigla": "lucas.araujo@sead.pi.gov.br",
        "Nome": "LUCAS LOPES DE ARAUJO  Matr.391814-9"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "61399919",
      "Tarefa": "BLOCO-CONCLUSAO",
      "Descricao": "Conclusão do bloco 211071",
      "DataHora": "12/11/2023 19:16:30",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100029425",
        "Sigla": "lucas.araujo@sead.pi.gov.br",
        "Nome": "LUCAS LOPES DE ARAUJO  Matr.391814-9"
      },
      "Atributos": [
        {
          "Nome": "BLOCO",
          "Valor": "211071",
          "IdOrigem": "211071"
        },
        {
          "Nome": "UNIDADE",
          "Valor": "SEAD-PI/GAB/SGACG¥Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI",
          "IdOrigem": "110006157"
        }
      ]
    },
    {
      "IdAndamento": "61399913",
      "Tarefa": "REABERTURA-PROCESSO-UNIDADE",
      "Descricao": "Reabertura do processo na unidade",
      "DataHora": "12/11/2023 19:16:16",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100029425",
        "Sigla": "lucas.araujo@sead.pi.gov.br",
        "Nome": "LUCAS LOPES DE ARAUJO  Matr.391814-9"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "61399598",
      "Tarefa": "CONCLUSAO-PROCESSO-UNIDADE",
      "Descricao": "Conclusão do processo na unidade",
      "DataHora": "12/11/2023 18:49:17",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100029425",
        "Sigla": "lucas.araujo@sead.pi.gov.br",
        "Nome": "LUCAS LOPES DE ARAUJO  Matr.391814-9"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "61399587",
      "Tarefa": "PROCESSO-INCLUIDO-EM-BLOCO",
      "Descricao": "Processo inserido no bloco 194737",
      "DataHora": "12/11/2023 18:47:52",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100029425",
        "Sigla": "lucas.araujo@sead.pi.gov.br",
        "Nome": "LUCAS LOPES DE ARAUJO  Matr.391814-9"
      },
      "Atributos": [
        {
          "Nome": "BLOCO",
          "Valor": "194737",
          "IdOrigem": "194737"
        }
      ]
    },
    {
      "IdAndamento": "61399586",
      "Tarefa": "REABERTURA-PROCESSO-UNIDADE",
      "Descricao": "Reabertura do processo na unidade",
      "DataHora": "12/11/2023 18:47:42",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100029425",
        "Sigla": "lucas.araujo@sead.pi.gov.br",
        "Nome": "LUCAS LOPES DE ARAUJO  Matr.391814-9"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "56519718",
      "Tarefa": "PROCESSO-RECEBIDO-UNIDADE",
      "Descricao": "Processo recebido na unidade",
      "DataHora": "14/09/2023 11:12:53",
      "Unidade": {
        "IdUnidade": "110006442",
        "Sigla": "SEAD-PI/GAB/SGACG/DLOG",
        "Descricao": "Diretoria de Logística e Abastecimento - DLOG"
      },
      "Usuario": {
        "IdUsuario": "100010663",
        "Sigla": "annderson.bandeira@sead.pi.gov.br",
        "Nome": "ANNDERSON FELIPE BANDEIRA SILVA - Matr.372260-X"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "56516020",
      "Tarefa": "DOCUMENTO-RETIRADO-DO-BLOCO",
      "Descricao": "Documento 9180488 (SEAD DESPACHO 2087) retirado do bloco 182890",
      "DataHora": "14/09/2023 10:57:07",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": [
        {
          "Nome": "BLOCO",
          "Valor": "182890",
          "IdOrigem": "182890"
        },
        {
          "Nome": "DOCUMENTO",
          "Valor": "9180488",
          "IdOrigem": "10326242"
        }
      ]
    },
    {
      "IdAndamento": "56515164",
      "Tarefa": "CONCLUSAO-AUTOMATICA-UNIDADE",
      "Descricao": "Conclusão automática de processo na unidade",
      "DataHora": "14/09/2023 10:53:40",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "56515163",
      "Tarefa": "PROCESSO-REMETIDO-UNIDADE",
      "Descricao": "Processo remetido pela unidade <a href=\"javascript:void(0);\" alt=\"Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI\" title=\"Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI\" class=\"ancoraSigla\">SEAD-PI/GAB/SGACG</a>",
      "DataHora": "14/09/2023 10:53:40",
      "Unidade": {
        "IdUnidade": "110006442",
        "Sigla": "SEAD-PI/GAB/SGACG/DLOG",
        "Descricao": "Diretoria de Logística e Abastecimento - DLOG"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": [
        {
          "Nome": "UNIDADE",
          "Valor": "SEAD-PI/GAB/SGACG¥Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI",
          "IdOrigem": "110006157"
        }
      ]
    },
    {
      "IdAndamento": "56509020",
      "Tarefa": "ASSINATURA-DOCUMENTO",
      "Descricao": "Assinado Documento 9180488 (SEAD DESPACHO 2087) por <a href=\"javascript:void(0);\" alt=\"CAROLINE VIVEIROS MOURA DA CRUZ - Matr.0371165-0\" title=\"CAROLINE VIVEIROS MOURA DA CRUZ - Matr.0371165-0\" class=\"ancoraSigla\">caroline.viveiros@sead.pi.gov.br</a>",
      "DataHora": "14/09/2023 10:30:03",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002138",
        "Sigla": "caroline.viveiros@sead.pi.gov.br",
        "Nome": "CAROLINE VIVEIROS MOURA DA CRUZ - Matr.0371165-0"
      },
      "Atributos": [
        {
          "Nome": "DOCUMENTO",
          "Valor": "9180488",
          "IdOrigem": "10326242"
        },
        {
          "Nome": "USUARIO",
          "Valor": "caroline.viveiros@sead.pi.gov.br¥CAROLINE VIVEIROS MOURA DA CRUZ - Matr.0371165-0",
          "IdOrigem": "100002138"
        }
      ]
    },
    {
      "IdAndamento": "56468107",
      "Tarefa": "DOCUMENTO-INCLUIDO-EM-BLOCO",
      "Descricao": "Documento 9180488 (SEAD DESPACHO 2087) inserido no bloco 182890",
      "DataHora": "14/09/2023 08:35:47",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": [
        {
          "Nome": "BLOCO",
          "Valor": "182890",
          "IdOrigem": "182890"
        },
        {
          "Nome": "DOCUMENTO",
          "Valor": "9180488",
          "IdOrigem": "10326242"
        }
      ]
    },
    {
      "IdAndamento": "56467932",
      "Tarefa": "PROCESSO-INCLUIDO-EM-BLOCO",
      "Descricao": "Processo inserido no bloco 211071",
      "DataHora": "14/09/2023 08:34:49",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": [
        {
          "Nome": "BLOCO",
          "Valor": "211071",
          "IdOrigem": "211071"
        }
      ]
    },
    {
      "IdAndamento": "56465336",
      "Tarefa": "GERACAO-DOCUMENTO",
      "Descricao": "Gerado documento público 9180488 (SEAD DESPACHO 2087)",
      "DataHora": "14/09/2023 08:21:22",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": [
        {
          "Nome": "DOCUMENTO",
          "Valor": "9180488",
          "IdOrigem": "10326242"
        },
        {
          "Nome": "NIVEL_ACESSO",
          "IdOrigem": "0"
        }
      ]
    },
    {
      "IdAndamento": "56465256",
      "Tarefa": "EXCLUSAO-DOCUMENTO",
      "Descricao": "Exclusão do documento <a href=\"javascript:void(0);\" onclick=\"alert('Este documento foi excluído.');\" class=\"ancoraHistoricoProcesso\">9180469</a>",
      "DataHora": "14/09/2023 08:20:46",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": [
        {
          "Nome": "DOCUMENTO",
          "Valor": "9180469",
          "IdOrigem": "10326221"
        }
      ]
    },
    {
      "IdAndamento": "56465246",
      "Tarefa": "GERACAO-DOCUMENTO",
      "Descricao": "Gerado documento público <a href=\"javascript:void(0);\" onclick=\"alert('Este documento foi excluído.');\" class=\"ancoraHistoricoProcesso\">9180469</a>",
      "DataHora": "14/09/2023 08:20:39",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": [
        {
          "Nome": "DOCUMENTO",
          "Valor": "9180469",
          "IdOrigem": "10326221"
        },
        {
          "Nome": "NIVEL_ACESSO",
          "IdOrigem": "0"
        }
      ]
    },
    {
      "IdAndamento": "56462386",
      "Tarefa": "PROCESSO-ATRIBUIDO",
      "Descricao": "Processo atribuído para <a href=\"javascript:void(0);\" alt=\"LEANDRA FERREIRA LUSTOSA MEDINA PRADO\" title=\"LEANDRA FERREIRA LUSTOSA MEDINA PRADO\" class=\"ancoraSigla\">leandra.lustosa@sead.pi.gov.br</a>",
      "DataHora": "14/09/2023 08:09:22",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": [
        {
          "Nome": "USUARIO",
          "Valor": "leandra.lustosa@sead.pi.gov.br¥LEANDRA FERREIRA LUSTOSA MEDINA PRADO",
          "IdOrigem": "100003402"
        }
      ]
    },
    {
      "IdAndamento": "55274999",
      "Tarefa": "PROCESSO-ATRIBUIDO",
      "Descricao": "Processo atribuído para <a href=\"javascript:void(0);\" alt=\"EURIVAN CASTELO BRANCO COUTINHO - Matr.0371541-8\" title=\"EURIVAN CASTELO BRANCO COUTINHO - Matr.0371541-8\" class=\"ancoraSigla\">eurivan.castelo@sead.pi.gov.br</a>",
      "DataHora": "30/08/2023 11:22:14",
      "Unidade": {
        "IdUnidade": "110006178",
        "Sigla": "SEAD-PI/GAB/SGP",
        "Descricao": "Superintendência de Gestão de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100026349",
        "Sigla": "thallya.silva@sead.pi.gov.br",
        "Nome": "THALLYA PEREIRA GOMES DA SILVA - Matr.E.03610730"
      },
      "Atributos": [
        {
          "Nome": "USUARIO",
          "Valor": "eurivan.castelo@sead.pi.gov.br¥EURIVAN CASTELO BRANCO COUTINHO - Matr.0371541-8",
          "IdOrigem": "100029070"
        }
      ]
    },
    {
      "IdAndamento": "54995411",
      "Tarefa": "PROCESSO-RECEBIDO-UNIDADE",
      "Descricao": "Processo recebido na unidade",
      "DataHora": "28/08/2023 11:15:31",
      "Unidade": {
        "IdUnidade": "110006180",
        "Sigla": "SEAD-PI/SGP/CIASPI",
        "Descricao": "Diretoria do Ciaspi - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003483",
        "Sigla": "aline.carla@sead.pi.gov.br",
        "Nome": "ALINE CARLA DE MELO COELHO - Matr.0226622-9"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "54960972",
      "Tarefa": "PROCESSO-RECEBIDO-UNIDADE",
      "Descricao": "Processo recebido na unidade",
      "DataHora": "28/08/2023 09:09:58",
      "Unidade": {
        "IdUnidade": "110006183",
        "Sigla": "SEAD-PI/SGP/DUGP",
        "Descricao": "Diretoria de Unidade de Gestão de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003114",
        "Sigla": "ana.clara@sead.pi.gov.br",
        "Nome": "ANA CLARA GOMES VELOSO"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "54948313",
      "Tarefa": "PROCESSO-ATRIBUIDO",
      "Descricao": "Processo atribuído para <a href=\"javascript:void(0);\" alt=\"GEISA CRONEMBERGER DO RÊGO FERREIRA - Matr.0157016-1\" title=\"GEISA CRONEMBERGER DO RÊGO FERREIRA - Matr.0157016-1\" class=\"ancoraSigla\">geisa@sead.pi.gov.br</a>",
      "DataHora": "28/08/2023 08:08:03",
      "Unidade": {
        "IdUnidade": "110006191",
        "Sigla": "SEAD-PI/SGP/DFPG",
        "Descricao": "Diretoria de Folha de Pagamento - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100000347",
        "Sigla": "marcia.pinheiro@sead.pi.gov.br",
        "Nome": "MÁRCIA VASCONCELOS ALVES DA CRUZ PINHEIRO - Matr.0091423-1"
      },
      "Atributos": [
        {
          "Nome": "USUARIO",
          "Valor": "geisa@sead.pi.gov.br¥GEISA CRONEMBERGER DO RÊGO FERREIRA - Matr.0157016-1",
          "IdOrigem": "100000130"
        }
      ]
    },
    {
      "IdAndamento": "54947870",
      "Tarefa": "PROCESSO-RECEBIDO-UNIDADE",
      "Descricao": "Processo recebido na unidade",
      "DataHora": "28/08/2023 08:04:13",
      "Unidade": {
        "IdUnidade": "110006191",
        "Sigla": "SEAD-PI/SGP/DFPG",
        "Descricao": "Diretoria de Folha de Pagamento - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100000347",
        "Sigla": "marcia.pinheiro@sead.pi.gov.br",
        "Nome": "MÁRCIA VASCONCELOS ALVES DA CRUZ PINHEIRO - Matr.0091423-1"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "54912840",
      "Tarefa": "PROCESSO-REMETIDO-UNIDADE",
      "Descricao": "Processo remetido pela unidade <a href=\"javascript:void(0);\" alt=\"Superintendência de Gestão de Pessoas - SEAD-PI\" title=\"Superintendência de Gestão de Pessoas - SEAD-PI\" class=\"ancoraSigla\">SEAD-PI/GAB/SGP</a>",
      "DataHora": "25/08/2023 13:02:54",
      "Unidade": {
        "IdUnidade": "110006180",
        "Sigla": "SEAD-PI/SGP/CIASPI",
        "Descricao": "Diretoria do Ciaspi - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100010235",
        "Sigla": "garcias.guedes@sead.pi.gov.br",
        "Nome": "GARCIAS GUEDES RODRIGUES JÚNIOR - Matr.0371160-9"
      },
      "Atributos": [
        {
          "Nome": "UNIDADE",
          "Valor": "SEAD-PI/GAB/SGP¥Superintendência de Gestão de Pessoas - SEAD-PI",
          "IdOrigem": "110006178"
        }
      ]
    },
    {
      "IdAndamento": "54912839",
      "Tarefa": "PROCESSO-REMETIDO-UNIDADE",
      "Descricao": "Processo remetido pela unidade <a href=\"javascript:void(0);\" alt=\"Superintendência de Gestão de Pessoas - SEAD-PI\" title=\"Superintendência de Gestão de Pessoas - SEAD-PI\" class=\"ancoraSigla\">SEAD-PI/GAB/SGP</a>",
      "DataHora": "25/08/2023 13:02:54",
      "Unidade": {
        "IdUnidade": "110006191",
        "Sigla": "SEAD-PI/SGP/DFPG",
        "Descricao": "Diretoria de Folha de Pagamento - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100010235",
        "Sigla": "garcias.guedes@sead.pi.gov.br",
        "Nome": "GARCIAS GUEDES RODRIGUES JÚNIOR - Matr.0371160-9"
      },
      "Atributos": [
        {
          "Nome": "UNIDADE",
          "Valor": "SEAD-PI/GAB/SGP¥Superintendência de Gestão de Pessoas - SEAD-PI",
          "IdOrigem": "110006178"
        }
      ]
    },
    {
      "IdAndamento": "54912838",
      "Tarefa": "PROCESSO-REMETIDO-UNIDADE",
      "Descricao": "Processo remetido pela unidade <a href=\"javascript:void(0);\" alt=\"Superintendência de Gestão de Pessoas - SEAD-PI\" title=\"Superintendência de Gestão de Pessoas - SEAD-PI\" class=\"ancoraSigla\">SEAD-PI/GAB/SGP</a>",
      "DataHora": "25/08/2023 13:02:54",
      "Unidade": {
        "IdUnidade": "110006183",
        "Sigla": "SEAD-PI/SGP/DUGP",
        "Descricao": "Diretoria de Unidade de Gestão de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100010235",
        "Sigla": "garcias.guedes@sead.pi.gov.br",
        "Nome": "GARCIAS GUEDES RODRIGUES JÚNIOR - Matr.0371160-9"
      },
      "Atributos": [
        {
          "Nome": "UNIDADE",
          "Valor": "SEAD-PI/GAB/SGP¥Superintendência de Gestão de Pessoas - SEAD-PI",
          "IdOrigem": "110006178"
        }
      ]
    },
    {
      "IdAndamento": "54912707",
      "Tarefa": "ASSINATURA-DOCUMENTO",
      "Descricao": "Assinado Documento 8942564 (Despacho 2882) por <a href=\"javascript:void(0);\" alt=\"GARCIAS GUEDES RODRIGUES JÚNIOR - Matr.0371160-9\" title=\"GARCIAS GUEDES RODRIGUES JÚNIOR - Matr.0371160-9\" class=\"ancoraSigla\">garcias.guedes@sead.pi.gov.br</a>",
      "DataHora": "25/08/2023 13:02:17",
      "Unidade": {
        "IdUnidade": "110006178",
        "Sigla": "SEAD-PI/GAB/SGP",
        "Descricao": "Superintendência de Gestão de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100010235",
        "Sigla": "garcias.guedes@sead.pi.gov.br",
        "Nome": "GARCIAS GUEDES RODRIGUES JÚNIOR - Matr.0371160-9"
      },
      "Atributos": [
        {
          "Nome": "DOCUMENTO",
          "Valor": "8942564",
          "IdOrigem": "10062608"
        },
        {
          "Nome": "USUARIO",
          "Valor": "garcias.guedes@sead.pi.gov.br¥GARCIAS GUEDES RODRIGUES JÚNIOR - Matr.0371160-9",
          "IdOrigem": "100010235"
        }
      ]
    },
    {
      "IdAndamento": "54911868",
      "Tarefa": "GERACAO-DOCUMENTO",
      "Descricao": "Gerado documento público 8942564 (Despacho 2882)",
      "DataHora": "25/08/2023 12:57:23",
      "Unidade": {
        "IdUnidade": "110006178",
        "Sigla": "SEAD-PI/GAB/SGP",
        "Descricao": "Superintendência de Gestão de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100010235",
        "Sigla": "garcias.guedes@sead.pi.gov.br",
        "Nome": "GARCIAS GUEDES RODRIGUES JÚNIOR - Matr.0371160-9"
      },
      "Atributos": [
        {
          "Nome": "DOCUMENTO",
          "Valor": "8942564",
          "IdOrigem": "10062608"
        },
        {
          "Nome": "NIVEL_ACESSO",
          "IdOrigem": "0"
        }
      ]
    },
    {
      "IdAndamento": "54566498",
      "Tarefa": "PROCESSO-ATRIBUIDO",
      "Descricao": "Processo atribuído para <a href=\"javascript:void(0);\" alt=\"THALLYA PEREIRA GOMES DA SILVA - Matr.E.03610730\" title=\"THALLYA PEREIRA GOMES DA SILVA - Matr.E.03610730\" class=\"ancoraSigla\">thallya.silva@sead.pi.gov.br</a>",
      "DataHora": "23/08/2023 08:04:03",
      "Unidade": {
        "IdUnidade": "110006178",
        "Sigla": "SEAD-PI/GAB/SGP",
        "Descricao": "Superintendência de Gestão de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100030668",
        "Sigla": "vanessa.lima@sead.pi.gov.br",
        "Nome": "Vanessa Bento Lima"
      },
      "Atributos": [
        {
          "Nome": "USUARIO",
          "Valor": "thallya.silva@sead.pi.gov.br¥THALLYA PEREIRA GOMES DA SILVA - Matr.E.03610730",
          "IdOrigem": "100026349"
        }
      ]
    },
    {
      "IdAndamento": "54565298",
      "Tarefa": "PROCESSO-RECEBIDO-UNIDADE",
      "Descricao": "Processo recebido na unidade",
      "DataHora": "23/08/2023 08:03:06",
      "Unidade": {
        "IdUnidade": "110006178",
        "Sigla": "SEAD-PI/GAB/SGP",
        "Descricao": "Superintendência de Gestão de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100030668",
        "Sigla": "vanessa.lima@sead.pi.gov.br",
        "Nome": "Vanessa Bento Lima"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "54496903",
      "Tarefa": "PROCESSO-RECEBIDO-UNIDADE",
      "Descricao": "Processo recebido na unidade",
      "DataHora": "22/08/2023 11:52:12",
      "Unidade": {
        "IdUnidade": "110006324",
        "Sigla": "SEAD-PI/GAB/SUPARC",
        "Descricao": "Superintendência de Parcerias Público Privadas e Concessões - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100000238",
        "Sigla": "francisca.siqueira@ppp.pi.gov.br",
        "Nome": "FRANCISCA SIQUEIRA SOARES - Matr.0338558-2"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "54486614",
      "Tarefa": "PROCESSO-ATRIBUIDO",
      "Descricao": "Processo atribuído para <a href=\"javascript:void(0);\" alt=\"LEANDRA FERREIRA LUSTOSA MEDINA PRADO\" title=\"LEANDRA FERREIRA LUSTOSA MEDINA PRADO\" class=\"ancoraSigla\">leandra.lustosa@sead.pi.gov.br</a>",
      "DataHora": "22/08/2023 11:27:45",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": [
        {
          "Nome": "USUARIO",
          "Valor": "leandra.lustosa@sead.pi.gov.br¥LEANDRA FERREIRA LUSTOSA MEDINA PRADO",
          "IdOrigem": "100003402"
        }
      ]
    },
    {
      "IdAndamento": "54485087",
      "Tarefa": "PROCESSO-RECEBIDO-UNIDADE",
      "Descricao": "Processo recebido na unidade",
      "DataHora": "22/08/2023 11:24:00",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100003402",
        "Sigla": "leandra.lustosa@sead.pi.gov.br",
        "Nome": "LEANDRA FERREIRA LUSTOSA MEDINA PRADO"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "54484604",
      "Tarefa": "CONCLUSAO-AUTOMATICA-UNIDADE",
      "Descricao": "Conclusão automática de processo na unidade",
      "DataHora": "22/08/2023 11:22:52",
      "Unidade": {
        "IdUnidade": "110006613",
        "Sigla": "SEAD-PI/GAB/NTGD",
        "Descricao": "Núcleo Estratégico de Tecnologia e Governo Digital - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "54484603",
      "Tarefa": "PROCESSO-REMETIDO-UNIDADE",
      "Descricao": "Processo remetido pela unidade <a href=\"javascript:void(0);\" alt=\"Núcleo Estratégico de Tecnologia e Governo Digital\" title=\"Núcleo Estratégico de Tecnologia e Governo Digital\" class=\"ancoraSigla\">SEAD-PI/GAB/NTGD</a>",
      "DataHora": "22/08/2023 11:22:51",
      "Unidade": {
        "IdUnidade": "110006178",
        "Sigla": "SEAD-PI/GAB/SGP",
        "Descricao": "Superintendência de Gestão de Pessoas - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": [
        {
          "Nome": "UNIDADE",
          "Valor": "SEAD-PI/GAB/NTGD¥Núcleo Estratégico de Tecnologia e Governo Digital",
          "IdOrigem": "110006613"
        }
      ]
    },
    {
      "IdAndamento": "54484602",
      "Tarefa": "CONCLUSAO-AUTOMATICA-UNIDADE",
      "Descricao": "Conclusão automática de processo na unidade",
      "DataHora": "22/08/2023 11:22:51",
      "Unidade": {
        "IdUnidade": "110006613",
        "Sigla": "SEAD-PI/GAB/NTGD",
        "Descricao": "Núcleo Estratégico de Tecnologia e Governo Digital - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "54484601",
      "Tarefa": "PROCESSO-REMETIDO-UNIDADE",
      "Descricao": "Processo remetido pela unidade <a href=\"javascript:void(0);\" alt=\"Núcleo Estratégico de Tecnologia e Governo Digital\" title=\"Núcleo Estratégico de Tecnologia e Governo Digital\" class=\"ancoraSigla\">SEAD-PI/GAB/NTGD</a>",
      "DataHora": "22/08/2023 11:22:51",
      "Unidade": {
        "IdUnidade": "110006157",
        "Sigla": "SEAD-PI/GAB/SGACG",
        "Descricao": "Superintendência de Gestão Administrativa e Controle dos Gastos - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": [
        {
          "Nome": "UNIDADE",
          "Valor": "SEAD-PI/GAB/NTGD¥Núcleo Estratégico de Tecnologia e Governo Digital",
          "IdOrigem": "110006613"
        }
      ]
    },
    {
      "IdAndamento": "54484600",
      "Tarefa": "CONCLUSAO-AUTOMATICA-UNIDADE",
      "Descricao": "Conclusão automática de processo na unidade",
      "DataHora": "22/08/2023 11:22:51",
      "Unidade": {
        "IdUnidade": "110006613",
        "Sigla": "SEAD-PI/GAB/NTGD",
        "Descricao": "Núcleo Estratégico de Tecnologia e Governo Digital - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": []
    },
    {
      "IdAndamento": "54484599",
      "Tarefa": "PROCESSO-REMETIDO-UNIDADE",
      "Descricao": "Processo remetido pela unidade <a href=\"javascript:void(0);\" alt=\"Núcleo Estratégico de Tecnologia e Governo Digital\" title=\"Núcleo Estratégico de Tecnologia e Governo Digital\" class=\"ancoraSigla\">SEAD-PI/GAB/NTGD</a>",
      "DataHora": "22/08/2023 11:22:51",
      "Unidade": {
        "IdUnidade": "110006324",
        "Sigla": "SEAD-PI/GAB/SUPARC",
        "Descricao": "Superintendência de Parcerias Público Privadas e Concessões - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": [
        {
          "Nome": "UNIDADE",
          "Valor": "SEAD-PI/GAB/NTGD¥Núcleo Estratégico de Tecnologia e Governo Digital",
          "IdOrigem": "110006613"
        }
      ]
    },
    {
      "IdAndamento": "54483422",
      "Tarefa": "ASSINATURA-DOCUMENTO",
      "Descricao": "Assinado Documento 8877591 (SEAD_MEMORANDO 6) por <a href=\"javascript:void(0);\" alt=\"UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3\" title=\"UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3\" class=\"ancoraSigla\">ubaldojunior@sead.pi.gov.br</a>",
      "DataHora": "22/08/2023 11:19:36",
      "Unidade": {
        "IdUnidade": "110006613",
        "Sigla": "SEAD-PI/GAB/NTGD",
        "Descricao": "Núcleo Estratégico de Tecnologia e Governo Digital - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": [
        {
          "Nome": "DOCUMENTO",
          "Valor": "8877591",
          "IdOrigem": "9990895"
        },
        {
          "Nome": "USUARIO",
          "Valor": "ubaldojunior@sead.pi.gov.br¥UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3",
          "IdOrigem": "100002540"
        }
      ]
    },
    {
      "IdAndamento": "54483052",
      "Tarefa": "ARQUIVO-ANEXADO",
      "Descricao": "Arquivo modelo.docx anexado no documento 8878806 (Outros Modelo).",
      "DataHora": "22/08/2023 11:18:22",
      "Unidade": {
        "IdUnidade": "110006613",
        "Sigla": "SEAD-PI/GAB/NTGD",
        "Descricao": "Núcleo Estratégico de Tecnologia e Governo Digital - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": [
        {
          "Nome": "ANEXO",
          "Valor": "modelo.docx",
          "IdOrigem": "4363384"
        },
        {
          "Nome": "DOCUMENTO",
          "Valor": "8878806",
          "IdOrigem": "9992250"
        }
      ]
    },
    {
      "IdAndamento": "54483051",
      "Tarefa": "RECEBIMENTO-DOCUMENTO",
      "Descricao": "Registro de documento externo público 8878806 (Outros Modelo)",
      "DataHora": "22/08/2023 11:18:22",
      "Unidade": {
        "IdUnidade": "110006613",
        "Sigla": "SEAD-PI/GAB/NTGD",
        "Descricao": "Núcleo Estratégico de Tecnologia e Governo Digital - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": [
        {
          "Nome": "DOCUMENTO",
          "Valor": "8878806",
          "IdOrigem": "9992250"
        },
        {
          "Nome": "NIVEL_ACESSO",
          "IdOrigem": "0"
        }
      ]
    },
    {
      "IdAndamento": "54475762",
      "Tarefa": "ACESSO-EXTERNO-SISTEMA",
      "Descricao": "Disponibilizado acesso externo para <a href=\"javascript:void(0);\" alt=\"Sistema Eletrônico de Informações\" title=\"Sistema Eletrônico de Informações\" class=\"ancoraSigla\">SEI</a>",
      "DataHora": "22/08/2023 10:56:57",
      "Unidade": {
        "IdUnidade": "110006613",
        "Sigla": "SEAD-PI/GAB/NTGD",
        "Descricao": "Núcleo Estratégico de Tecnologia e Governo Digital - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": [
        {
          "Nome": "INTERESSADO",
          "Valor": "SEI¥Sistema Eletrônico de Informações",
          "IdOrigem": "11759389"
        }
      ]
    },
    {
      "IdAndamento": "54475758",
      "Tarefa": "GERACAO-DOCUMENTO",
      "Descricao": "Gerado documento público 8877591 (SEAD_MEMORANDO 6)",
      "DataHora": "22/08/2023 10:56:57",
      "Unidade": {
        "IdUnidade": "110006613",
        "Sigla": "SEAD-PI/GAB/NTGD",
        "Descricao": "Núcleo Estratégico de Tecnologia e Governo Digital - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": [
        {
          "Nome": "DOCUMENTO",
          "Valor": "8877591",
          "IdOrigem": "9990895"
        },
        {
          "Nome": "NIVEL_ACESSO",
          "IdOrigem": "0"
        }
      ]
    },
    {
      "IdAndamento": "54475611",
      "Tarefa": "GERACAO-PROCEDIMENTO",
      "Descricao": "Processo público gerado",
      "DataHora": "22/08/2023 10:56:37",
      "Unidade": {
        "IdUnidade": "110006613",
        "Sigla": "SEAD-PI/GAB/NTGD",
        "Descricao": "Núcleo Estratégico de Tecnologia e Governo Digital - SEAD-PI"
      },
      "Usuario": {
        "IdUsuario": "100002540",
        "Sigla": "ubaldojunior@sead.pi.gov.br",
        "Nome": "UBALDO DE SÁ NEVES JÚNIOR - Matr.372815-3"
      },
      "Atributos": [
        {
          "Nome": "NIVEL_ACESSO",
          "IdOrigem": "0"
        }
      ]
    }
  ]
};

    