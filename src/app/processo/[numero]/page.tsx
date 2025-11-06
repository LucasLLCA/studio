"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, Search } from 'lucide-react';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { fetchOpenUnitsForProcessWithToken } from '@/app/sei-actions';
import type { UnidadeAberta } from '@/types/process-flow';
import { useToast } from '@/hooks/use-toast';

export default function ProcessoPage() {
  const params = useParams();
  const router = useRouter();
  // Decodificar o número do processo da URL
  const numeroProcesso = decodeURIComponent(params.numero as string);
  const { toast } = useToast();

  console.log('[DEBUG] Número do processo decodificado:', numeroProcesso);

  const { isAuthenticated, sessionToken, idUnidadeAtual, unidadesFiltroList, updateSelectedUnidade } = usePersistedAuth();
  
  const [unidadesAbertas, setUnidadesAbertas] = useState<UnidadeAberta[] | null>(null);
  const [isLoadingUnidadesAbertas, setIsLoadingUnidadesAbertas] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Estados para as seleções
  const [selectedUnidadeAberta, setSelectedUnidadeAberta] = useState<string>('');
  const [selectedMinhaUnidade, setSelectedMinhaUnidade] = useState<string>('');
  const [selectedUnidadeFavorita, setSelectedUnidadeFavorita] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [userClearedSelection, setUserClearedSelection] = useState<boolean>(false);

  const handleGoBack = () => {
    router.push('/');
  };

  // Buscar unidades em aberto quando a página carregar
  useEffect(() => {
    const fetchUnidadesAbertas = async () => {
      // Aguardar um pouco para garantir que o estado foi carregado do localStorage
      if (typeof window === 'undefined') return;
      
      console.log('[DEBUG] Verificando autenticação na página de seleção:', {
        isAuthenticated,
        hasSessionToken: !!sessionToken,
        hasIdUnidadeAtual: !!idUnidadeAtual,
        sessionTokenLength: sessionToken?.length,
        idUnidadeAtual,
        numeroProcesso,
        unidadesFiltroListLength: unidadesFiltroList?.length
      });

      // Verificar localStorage diretamente
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sei_auth_data');
        console.log('[DEBUG] localStorage sei_auth_data:', stored ? 'exists' : 'not found');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            console.log('[DEBUG] localStorage parsed:', {
              isAuthenticated: parsed.isAuthenticated,
              hasToken: !!parsed.sessionToken,
              hasIdUnidadeAtual: !!parsed.idUnidadeAtual,
              idUnidadeAtual: parsed.idUnidadeAtual
            });
          } catch (e) {
            console.log('[DEBUG] Erro ao parsear localStorage:', e);
          }
        }
      }

      console.log('[DEBUG] Verificando requisitos para buscar unidades:', {
        isAuthenticated,
        hasSessionToken: !!sessionToken,
        idUnidadeAtual: idUnidadeAtual,
        unidadesDisponiveis: unidadesFiltroList?.length || 0
      });

      if (!isAuthenticated || !sessionToken) {
        console.log('[DEBUG] Falha na verificação de autenticação');
        toast({
          title: "Acesso não autorizado",
          description: "Você precisa estar logado para ver as unidades.",
          variant: "destructive"
        });
        router.push('/');
        return;
      }

      // Usar idUnidadeAtual se disponível, caso contrário usar a primeira unidade da lista
      const idParaBuscarUnidades = idUnidadeAtual || (Array.isArray(unidadesFiltroList) && unidadesFiltroList.length > 0 ? unidadesFiltroList[0]?.Id : null);

      if (!idParaBuscarUnidades) {
        console.log('[DEBUG] Nenhuma unidade disponível para fazer a requisição');
        toast({
          title: "Unidade não encontrada",
          description: "Não foi possível determinar uma unidade para buscar as informações do processo.",
          variant: "destructive"
        });
        setIsLoadingUnidadesAbertas(false);
        setIsInitializing(false);
        return;
      }

      setIsLoadingUnidadesAbertas(true);

      try {
        console.log('[DEBUG] Buscando unidades abertas com:', {
          numeroProcesso,
          idParaBuscarUnidades,
          sessionTokenLength: sessionToken.length
        });

        const result = await fetchOpenUnitsForProcessWithToken(sessionToken, numeroProcesso, idParaBuscarUnidades);
        
        console.log('[DEBUG] Resultado da requisição de unidades abertas:', result);
        
        if ('error' in result) {
          console.error('[DEBUG] Erro ao buscar unidades abertas:', result.error);

          // Melhorar mensagem para erro 422
          let errorMessage = result.error;
          if (result.error.includes('422')) {
            errorMessage = `O processo "${numeroProcesso}" não foi encontrado ou a unidade utilizada não tem acesso a ele. Verifique se o número está correto.`;
          }

          toast({
            title: "Erro ao buscar unidades",
            description: errorMessage,
            variant: "destructive",
            duration: 7000
          });
          setUnidadesAbertas([]);
        } else {
          // O resultado tem a estrutura {unidades: UnidadeAberta[], linkAcesso?: string}
          const unidades = result.unidades || [];
          console.log('[DEBUG] Unidades abertas encontradas:', unidades.length);
          setUnidadesAbertas(unidades);
        }
      } catch (error) {
        console.error('[DEBUG] Erro inesperado ao buscar unidades abertas:', error);
        toast({ 
          title: "Erro inesperado", 
          description: "Falha ao carregar unidades abertas.", 
          variant: "destructive" 
        });
        setUnidadesAbertas([]);
      } finally {
        setIsLoadingUnidadesAbertas(false);
      }
    };

    // Aguardar um pouco antes de fazer as verificações para garantir que o localStorage foi carregado
    const timer = setTimeout(() => {
      setIsInitializing(false);
      fetchUnidadesAbertas();
    }, 500);
    return () => clearTimeout(timer);
  }, [isAuthenticated, sessionToken, idUnidadeAtual, numeroProcesso, router, toast]);

  // Filtrar unidades baseado no termo de busca
  const filteredUnidades = useMemo(() => {
    if (!searchTerm || !unidadesFiltroList) return unidadesFiltroList || [];
    const term = searchTerm.toLowerCase();
    return unidadesFiltroList.filter(unidade =>
      unidade.Sigla.toLowerCase().includes(term) ||
      unidade.Descricao.toLowerCase().includes(term)
    );
  }, [unidadesFiltroList, searchTerm]);

  // Determinar unidade favorita - deve ser a unidade com o mesmo ID de idUnidadeAtual
  const unidadeFavorita = idUnidadeAtual ? unidadesFiltroList?.find(u => u.Id === idUnidadeAtual) : null;

  // Pré-selecionar unidade favorita quando a página carregar
  useEffect(() => {
    if (unidadeFavorita && !isInitializing && !selectedUnidadeFavorita && !selectedUnidadeAberta && !selectedMinhaUnidade && !userClearedSelection) {
      console.log('[DEBUG] Pré-selecionando unidade favorita:', unidadeFavorita.Id);
      setSelectedUnidadeFavorita(unidadeFavorita.Id);
    }
  }, [unidadeFavorita, isInitializing, selectedUnidadeFavorita, selectedUnidadeAberta, selectedMinhaUnidade, userClearedSelection]);

  // Mostrar loading durante inicialização
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Carregando dados de autenticação...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verificar qual seleção está ativa
  const hasSelection = selectedUnidadeAberta || selectedMinhaUnidade || selectedUnidadeFavorita;

  const handleClearSelection = () => {
    setSelectedUnidadeAberta('');
    setSelectedMinhaUnidade('');
    setSelectedUnidadeFavorita('');
    setUserClearedSelection(true);
  };

  const handleAcessarProcesso = () => {
    // Determinar qual unidade foi selecionada
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

    // Atualizar a unidade selecionada no estado persistente
    updateSelectedUnidade(unidadeIdSelecionada);

    // Navegar para a página de visualização do processo
    router.push(`/processo/${encodeURIComponent(numeroProcesso)}/visualizar`);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Button onClick={handleGoBack} variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Card className="shadow-lg">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h1 className="text-lg font-semibold text-gray-700 mb-2">
                Processo
              </h1>
              <p className="text-xl font-bold text-gray-900 mb-4">
                {numeroProcesso}
              </p>

              {unidadesAbertas !== null && (
                <p className="text-sm text-gray-600 mb-2">
                  Consta em aberto em <strong>{unidadesAbertas.length}</strong> {unidadesAbertas.length === 1 ? 'unidade' : 'unidades'}
                </p>
              )}

              <p className="text-sm text-gray-700 font-medium mb-4">
                Selecione o contexto pelo qual deseja acessá-lo
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-left">
                <p className="text-xs text-blue-800">
                  <strong>Atenção!</strong> Pelas regras de permissionamento do SEI, todo processo precisa ser visualizado sob o contexto de um usuário + unidade.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Botão para limpar seleção */}
              {hasSelection && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Limpar seleção
                  </Button>
                </div>
              )}

              {/* Unidades em aberto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidades em aberto
                  {unidadesAbertas && unidadesAbertas.length > 0 && (
                    <span className="ml-2 text-sm font-semibold text-green-700">
                      ({unidadesAbertas.length})
                    </span>
                  )}
                </label>
                {isLoadingUnidadesAbertas ? (
                  <div className="flex items-center justify-center p-4 border rounded-md bg-gray-50">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">Carregando unidades...</span>
                  </div>
                ) : unidadesAbertas && unidadesAbertas.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
                    {unidadesAbertas.map((unidadeAberta, index) => (
                      <div
                        key={index}
                        onClick={() => {
                          if (!selectedMinhaUnidade && !selectedUnidadeFavorita) {
                            setSelectedUnidadeAberta(unidadeAberta.Unidade.IdUnidade);
                            setUserClearedSelection(false);
                          }
                        }}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                          selectedUnidadeAberta === unidadeAberta.Unidade.IdUnidade ? 'bg-green-50 border-l-4 border-green-500' : ''
                        } ${selectedMinhaUnidade || selectedUnidadeFavorita ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium text-sm">{unidadeAberta.Unidade.Sigla}</div>
                        <div className="text-xs text-gray-600">{unidadeAberta.Unidade.Descricao}</div>
                        {unidadeAberta.UsuarioAtribuicao?.Nome && (
                          <div className="text-xs text-gray-500 mt-1">({unidadeAberta.UsuarioAtribuicao.Nome})</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground p-3 border rounded-md bg-gray-50">
                    Nenhuma unidade em aberto encontrada
                  </div>
                )}
              </div>

              {/* Minhas unidades */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minhas unidades
                  {unidadesFiltroList && unidadesFiltroList.length > 0 && (
                    <span className="ml-2 text-sm font-semibold text-blue-700">
                      ({unidadesFiltroList.length})
                    </span>
                  )}
                </label>
                {unidadesFiltroList && unidadesFiltroList.length > 0 ? (
                  <div>
                    <div className="relative mb-2">
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
                    <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
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
                            className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                              selectedMinhaUnidade === unidade.Id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
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
                    Nenhuma unidade disponível
                  </div>
                )}
              </div>

              {/* Minha unidade favorita */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minha unidade favorita
                </label>
                {unidadeFavorita ? (
                  <div className="max-h-48 overflow-y-auto border rounded-md bg-white">
                    <div
                      onClick={() => {
                        if (!selectedUnidadeAberta && !selectedMinhaUnidade) {
                          setSelectedUnidadeFavorita(unidadeFavorita.Id);
                          setUserClearedSelection(false);
                        }
                      }}
                      className={`p-3 cursor-pointer hover:bg-gray-50 border-b last:border-b-0 ${
                        selectedUnidadeFavorita === unidadeFavorita.Id ? 'bg-yellow-50 border-l-4 border-yellow-500' : ''
                      } ${selectedUnidadeAberta || selectedMinhaUnidade ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="font-medium text-sm">⭐ {unidadeFavorita.Sigla}</div>
                      <div className="text-xs text-gray-600">{unidadeFavorita.Descricao}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground p-3 border rounded-md bg-gray-50">
                    Nenhuma unidade favorita definida
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white mt-6"
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