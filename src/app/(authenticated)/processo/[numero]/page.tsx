"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, AlertTriangle } from 'lucide-react';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { LoadingFeedback } from '@/components/home/LoadingFeedback';
import { useOpenUnits } from '@/lib/react-query/queries/useOpenUnits';
import { useToast } from '@/hooks/use-toast';
import { formatProcessNumber, stripProcessNumber } from '@/lib/utils';
import { saveSearchHistory } from '@/lib/history-api-client';

export default function ProcessoPage() {
  const params = useParams();
  const router = useRouter();
  const numeroProcesso = decodeURIComponent(params.numero as string);
  const { toast } = useToast();

  console.log('[DEBUG] N\u00famero do processo decodificado:', numeroProcesso);

  const { isAuthenticated, sessionToken, idUnidadeAtual, unidadesFiltroList, updateSelectedUnidade, usuario } = usePersistedAuth();

  const [selectedUnidadeAberta, setSelectedUnidadeAberta] = useState<string>('');
  const [selectedMinhaUnidade, setSelectedMinhaUnidade] = useState<string>('');
  const [selectedUnidadeFavorita, setSelectedUnidadeFavorita] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchTermAbertas, setSearchTermAbertas] = useState<string>('');
  const [userClearedSelection, setUserClearedSelection] = useState<boolean>(false);

  const idParaBuscarUnidades = idUnidadeAtual || (Array.isArray(unidadesFiltroList) && unidadesFiltroList.length > 0 ? unidadesFiltroList[0]?.Id : '');

  const {
    data: openUnitsData,
    isLoading: isLoadingUnidadesAbertas,
    isError: hasError,
    error: queryError,
  } = useOpenUnits({
    processo: numeroProcesso,
    unidadeOrigem: idParaBuscarUnidades,
    token: sessionToken || '',
    enabled: isAuthenticated && !!sessionToken && !!idParaBuscarUnidades,
  });

  const unidadesAbertas = openUnitsData?.unidades || null;

  useEffect(() => {
    if (!isAuthenticated || !sessionToken) {
      console.log('[DEBUG] Falha na verifica\u00e7\u00e3o de autentica\u00e7\u00e3o');
      toast({
        title: "Acesso n\u00e3o autorizado",
        description: "Voc\u00ea precisa estar logado para ver as unidades.",
        variant: "destructive"
      });
      router.push('/');
    }
  }, [isAuthenticated, sessionToken, router, toast]);

  const isAccessDenied = hasError && queryError && (
    queryError.message.includes('422') ||
    queryError.message.toLowerCase().includes('acesso')
  );

  useEffect(() => {
    if (hasError && queryError && !isAccessDenied) {
      console.error('[DEBUG] Erro ao buscar unidades abertas:', queryError);

      let errorMessage = queryError.message;
      if (errorMessage.includes('422')) {
        errorMessage = `O processo "${numeroProcesso}" n\u00e3o foi encontrado ou a unidade utilizada n\u00e3o tem acesso a ele. Verifique se o n\u00famero est\u00e1 correto.`;
      }

      toast({
        title: "Erro ao buscar unidades",
        description: errorMessage,
        variant: "destructive",
        duration: 7000
      });
    }
  }, [hasError, queryError, isAccessDenied, numeroProcesso, toast]);

  const filteredUnidades = useMemo(() => {
    if (!searchTerm || !unidadesFiltroList) return unidadesFiltroList || [];
    const term = searchTerm.toLowerCase();
    return unidadesFiltroList.filter(unidade =>
      unidade.Sigla.toLowerCase().includes(term) ||
      unidade.Descricao.toLowerCase().includes(term)
    );
  }, [unidadesFiltroList, searchTerm]);

  const filteredUnidadesAbertas = useMemo(() => {
    if (!searchTermAbertas || !unidadesAbertas) return unidadesAbertas || [];
    const term = searchTermAbertas.toLowerCase();
    return unidadesAbertas.filter(unidadeAberta =>
      unidadeAberta.Unidade.Sigla.toLowerCase().includes(term) ||
      unidadeAberta.Unidade.Descricao.toLowerCase().includes(term) ||
      (unidadeAberta.UsuarioAtribuicao?.Nome && unidadeAberta.UsuarioAtribuicao.Nome.toLowerCase().includes(term))
    );
  }, [unidadesAbertas, searchTermAbertas]);

  const unidadeFavorita = idUnidadeAtual ? unidadesFiltroList?.find(u => u.Id === idUnidadeAtual) : null;

  useEffect(() => {
    if (unidadeFavorita && !selectedUnidadeFavorita && !selectedUnidadeAberta && !selectedMinhaUnidade && !userClearedSelection) {
      console.log('[DEBUG] Pr\u00e9-selecionando unidade favorita:', unidadeFavorita.Id);
      setSelectedUnidadeFavorita(unidadeFavorita.Id);
    }
  }, [unidadeFavorita, selectedUnidadeFavorita, selectedUnidadeAberta, selectedMinhaUnidade, userClearedSelection]);

  if (isLoadingUnidadesAbertas) {
    return (
      <LoadingFeedback
        title="Buscando processo..."
        subtitle="Consultando unidades em aberto no SEI"
        loadingTasks={["Carregando unidades em aberto"]}
      />
    );
  }

  const hasSelection = selectedUnidadeAberta || selectedMinhaUnidade || selectedUnidadeFavorita;

  const handleClearSelection = () => {
    setSelectedUnidadeAberta('');
    setSelectedMinhaUnidade('');
    setSelectedUnidadeFavorita('');
    setUserClearedSelection(true);
  };

  const handleAcessarProcesso = async () => {
    let unidadeIdSelecionada = selectedUnidadeAberta || selectedMinhaUnidade || selectedUnidadeFavorita;

    if (!unidadeIdSelecionada) {
      toast({
        title: "Selecione uma unidade",
        description: "Por favor, selecione uma unidade para acessar o processo.",
        variant: "destructive"
      });
      return;
    }

    console.log('[DEBUG] Acessando processo com unidade:', unidadeIdSelecionada);

    let unidadeSelecionada;
    if (selectedUnidadeAberta) {
      unidadeSelecionada = filteredUnidadesAbertas?.find(u => u.Unidade.IdUnidade === selectedUnidadeAberta)?.Unidade;
    } else if (selectedMinhaUnidade) {
      unidadeSelecionada = filteredUnidades?.find(u => u.Id === selectedMinhaUnidade);
    } else if (selectedUnidadeFavorita) {
      unidadeSelecionada = filteredUnidades?.find(u => u.Id === selectedUnidadeFavorita);
    }

    const unidadeNome = unidadeSelecionada ? `${unidadeSelecionada.Sigla} - ${unidadeSelecionada.Descricao}` : 'Unidade n\u00e3o identificada';

    if (usuario) {
      const numeroProcessoLimpo = stripProcessNumber(numeroProcesso);
      const numeroProcessoFormatado = formatProcessNumber(numeroProcessoLimpo);

      saveSearchHistory({
        numero_processo: numeroProcessoLimpo,
        numero_processo_formatado: numeroProcessoFormatado,
        usuario: usuario,
        id_unidade: unidadeIdSelecionada,
        caixa_contexto: unidadeNome
      }).catch(error => {
        console.error('[DEBUG] Erro ao salvar hist\u00f3rico:', error);
      });
    }

    updateSelectedUnidade(unidadeIdSelecionada);
    router.push(`/processo/${encodeURIComponent(numeroProcesso)}/visualizar`);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-6 overflow-hidden">
      <div className="w-full max-w-5xl max-h-full flex flex-col">
        <Card className="shadow-lg flex flex-col overflow-hidden">
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-3">
              <div className="flex-1">
                <h1 className="text-lg font-semibold text-gray-700 mb-1">
                  Processo
                </h1>
                <p className="text-xl font-bold text-gray-900 mb-1">
                  {formatProcessNumber(numeroProcesso)}
                </p>

                {unidadesAbertas !== null && (
                  <p className="text-sm text-gray-600 mb-1">
                    Consta em aberto em <strong>{unidadesAbertas.length}</strong> {unidadesAbertas.length === 1 ? 'unidade' : 'unidades'}
                  </p>
                )}

                <p className="text-sm text-gray-700 font-medium">
                  {"Selecione o contexto pelo qual deseja acess\u00e1-lo"}
                </p>
              </div>

              <div className="flex flex-col">
                <div className="flex-shrink-0 max-w-full sm:max-w-[260px] rounded-md border border-gray-300 bg-gray-50 p-2.5 text-left mb-2">
                  <p className="text-xs text-gray-600">
                    <strong>{"Aten\u00e7\u00e3o:"}</strong> {"Todo processo precisa ser visualizado sob o contexto de um usu\u00e1rio + unidade."}
                  </p>
                </div>
                {hasSelection && (
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {"Limpar sele\u00e7\u00e3o"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          {isAccessDenied && (
            <div className="mx-4 mb-3 p-3 rounded-md border border-warning/30 bg-warning/10 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning-foreground">
                  A consulta de unidades em aberto falhou para sua unidade padrão.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Selecione manualmente uma de suas unidades abaixo ou continue sem acesso a documentos.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs border-warning/40 text-warning-foreground hover:bg-warning/10"
                  onClick={() => {
                    const unidade = selectedMinhaUnidade || selectedUnidadeFavorita || idUnidadeAtual || '';
                    if (unidade) {
                      updateSelectedUnidade(unidade);
                    }
                    router.push(`/processo/${encodeURIComponent(numeroProcesso)}/visualizar?noDocAccess=1`);
                  }}
                >
                  Continuar sem documentos
                </Button>
              </div>
            </div>
          )}
          <CardContent className="p-4 md:p-5 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="space-y-3 flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0">
                <div className="min-h-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Unidades em aberto
                    {unidadesAbertas && unidadesAbertas.length > 0 && (
                      <span className="ml-2 text-sm font-semibold text-primary">
                        ({unidadesAbertas.length})
                      </span>
                    )}
                  </label>
                  {isAccessDenied ? (
                    <div className="text-center text-sm text-warning-foreground p-3 border rounded-md bg-warning/10 border-warning/30">
                      <AlertTriangle className="h-4 w-4 inline-block mr-1 mb-0.5" />
                      Não foi possível consultar unidades em aberto
                    </div>
                  ) : unidadesAbertas && unidadesAbertas.length > 0 ? (
                    <div className="min-h-0">
                      <div className="relative mb-1.5">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Buscar unidade..."
                          value={searchTermAbertas}
                          onChange={(e) => setSearchTermAbertas(e.target.value)}
                          disabled={!!(selectedMinhaUnidade || selectedUnidadeFavorita)}
                          className="pl-9"
                        />
                      </div>
                      <div className="max-h-[min(18vh,130px)] overflow-y-auto border rounded-md bg-white">
                        {filteredUnidadesAbertas.length > 0 ? (
                          filteredUnidadesAbertas.map((unidadeAberta, index) => (
                            <div
                              key={index}
                              onClick={() => {
                                if (!selectedMinhaUnidade && !selectedUnidadeFavorita) {
                                  setSelectedUnidadeAberta(unidadeAberta.Unidade.IdUnidade);
                                  setUserClearedSelection(false);
                                }
                              }}
                              className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${selectedUnidadeAberta === unidadeAberta.Unidade.IdUnidade ? 'bg-primary-light/20 border-l-4 border-primary' : ''
                                } ${selectedMinhaUnidade || selectedUnidadeFavorita ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className="font-medium text-sm">{unidadeAberta.Unidade.Sigla}</div>
                              <div className="text-xs text-gray-600">{unidadeAberta.Unidade.Descricao}</div>
                              {unidadeAberta.UsuarioAtribuicao?.Nome && (
                                <div className="text-xs text-gray-500 mt-1">({unidadeAberta.UsuarioAtribuicao.Nome})</div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-sm text-muted-foreground p-3">
                            Nenhuma unidade encontrada
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground p-3 border rounded-md bg-gray-50">
                      Nenhuma unidade em aberto encontrada
                    </div>
                  )}
                </div>

                <div className="min-h-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Minhas unidades
                    {unidadesFiltroList && unidadesFiltroList.length > 0 && (
                      <span className="ml-2 text-sm font-semibold text-gray-500">
                        ({unidadesFiltroList.length})
                      </span>
                    )}
                  </label>
                  {unidadesFiltroList && unidadesFiltroList.length > 0 ? (
                    <div className="min-h-0">
                      <div className="relative mb-1.5">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          type="text"
                          placeholder="Buscar unidade..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          disabled={!!(selectedUnidadeAberta || selectedUnidadeFavorita)}
                          className="pl-9"
                        />
                      </div>
                      <div className="max-h-[min(18vh,130px)] overflow-y-auto border rounded-md bg-white">
                        {filteredUnidades.length > 0 ? (
                          filteredUnidades.map((unidade) => (
                            <div
                              key={unidade.Id}
                              onClick={() => {
                                if (!selectedUnidadeAberta && !selectedUnidadeFavorita) {
                                  setSelectedMinhaUnidade(unidade.Id);
                                  setUserClearedSelection(false);
                                }
                              }}
                              className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${selectedMinhaUnidade === unidade.Id ? 'bg-primary-light/20 border-l-4 border-primary' : ''
                                } ${selectedUnidadeAberta || selectedUnidadeFavorita ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <div className="font-medium text-sm">{unidade.Sigla}</div>
                              <div className="text-xs text-gray-600">{unidade.Descricao}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-sm text-muted-foreground p-3">
                            Nenhuma unidade encontrada
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground p-3 border rounded-md bg-gray-50">
                      {"Nenhuma unidade dispon\u00edvel"}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Minha unidade favorita
                </label>
                {unidadeFavorita ? (
                  <div className="max-h-[min(14vh,96px)] overflow-y-auto border rounded-md bg-white">
                    <div
                      onClick={() => {
                        if (!selectedUnidadeAberta && !selectedMinhaUnidade) {
                          setSelectedUnidadeFavorita(unidadeFavorita.Id);
                          setUserClearedSelection(false);
                        }
                      }}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${selectedUnidadeFavorita === unidadeFavorita.Id ? 'bg-primary-light/20 border-l-4 border-primary' : ''
                        } ${selectedUnidadeAberta || selectedMinhaUnidade ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium text-sm">{"\u2B50"} {unidadeFavorita.Sigla}</div>
                      <div className="text-xs text-gray-600">{unidadeFavorita.Descricao}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground p-3 border rounded-md bg-gray-50">
                    Nenhuma unidade favorita definida
                  </div>
                )}
              </div>

            </div>
            <div className="flex-shrink-0 pt-3">
              <Button
                className="w-full bg-primary hover:bg-primary-hover text-white"
                onClick={handleAcessarProcesso}
                disabled={!hasSelection}
              >
                Acessar processo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
