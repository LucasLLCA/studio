"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { fetchOpenUnitsForProcessWithToken } from '@/app/sei-actions';
import type { UnidadeAberta } from '@/types/process-flow';
import { useToast } from '@/hooks/use-toast';

export default function ProcessoPage() {
  const params = useParams();
  const router = useRouter();
  const numeroProcesso = decodeURIComponent(params.numero as string);
  const { toast } = useToast();

  const { isAuthenticated, sessionToken, idUnidadeAtual, unidadesFiltroList, updateSelectedUnidade } = usePersistedAuth();
  
  const [unidadesAbertas, setUnidadesAbertas] = useState<UnidadeAberta[] | null>(null);
  const [isLoadingUnidadesAbertas, setIsLoadingUnidadesAbertas] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Estados para as seleções
  const [selectedUnidadeAberta, setSelectedUnidadeAberta] = useState<string>('');
  const [selectedMinhaUnidade, setSelectedMinhaUnidade] = useState<string>('');
  const [selectedUnidadeFavorita, setSelectedUnidadeFavorita] = useState<string>('');

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

      // Usar fallback se idUnidadeAtual estiver null mas temos unidades
      const idUnidadeParaUsar = idUnidadeAtual || (unidadesFiltroList && unidadesFiltroList.length > 0 ? unidadesFiltroList[0].Id : null);
      
      console.log('[DEBUG] IdUnidade determinado para uso:', {
        original: idUnidadeAtual,
        fallback: unidadesFiltroList && unidadesFiltroList.length > 0 ? unidadesFiltroList[0].Id : null,
        final: idUnidadeParaUsar
      });

      if (!isAuthenticated || !sessionToken || !idUnidadeParaUsar) {
        console.log('[DEBUG] Falha na verificação de autenticação:', {
          isAuthenticated,
          sessionToken: sessionToken ? 'exists' : 'missing',
          idUnidadeParaUsar: idUnidadeParaUsar ? 'exists' : 'missing'
        });
        toast({ 
          title: "Acesso não autorizado", 
          description: "Você precisa estar logado para ver as unidades.", 
          variant: "destructive" 
        });
        router.push('/');
        return;
      }

      setIsLoadingUnidadesAbertas(true);
      
      try {
        console.log('[DEBUG] Buscando unidades abertas com:', {
          numeroProcesso,
          idUnidadeParaUsar,
          sessionTokenLength: sessionToken.length
        });
        
        const result = await fetchOpenUnitsForProcessWithToken(sessionToken, numeroProcesso, idUnidadeParaUsar);
        
        console.log('[DEBUG] Resultado da requisição de unidades abertas:', result);
        
        if ('error' in result) {
          console.error('[DEBUG] Erro ao buscar unidades abertas:', result.error);
          toast({ 
            title: "Erro ao buscar unidades", 
            description: result.error, 
            variant: "destructive" 
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

  // Determinar unidade favorita
  const idParaUsar = idUnidadeAtual || (unidadesFiltroList && unidadesFiltroList.length > 0 ? unidadesFiltroList[0].Id : null);
  const unidadeFavorita = unidadesFiltroList?.find(u => u.Id === idParaUsar);

  // Verificar qual seleção está ativa
  const hasSelection = selectedUnidadeAberta || selectedMinhaUnidade || selectedUnidadeFavorita;

  const handleClearSelection = () => {
    setSelectedUnidadeAberta('');
    setSelectedMinhaUnidade('');
    setSelectedUnidadeFavorita('');
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

    // Navegar de volta para a home com o número do processo
    router.push(`/?processo=${encodeURIComponent(numeroProcesso)}`);
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
                    <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                      {unidadesAbertas.length}
                    </span>
                  )}
                </label>
                {isLoadingUnidadesAbertas ? (
                  <div className="flex items-center justify-center p-4 border rounded-md bg-gray-50">
                    <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">Carregando unidades...</span>
                  </div>
                ) : unidadesAbertas && unidadesAbertas.length > 0 ? (
                  <Select
                    value={selectedUnidadeAberta}
                    onValueChange={setSelectedUnidadeAberta}
                    disabled={!!(selectedMinhaUnidade || selectedUnidadeFavorita)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma unidade em aberto" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesAbertas.map((unidadeAberta, index) => (
                        <SelectItem
                          key={index}
                          value={unidadeAberta.Unidade.IdUnidade}
                        >
                          {unidadeAberta.Unidade.Sigla} - {unidadeAberta.Unidade.Descricao}
                          {unidadeAberta.UsuarioAtribuicao?.Nome && ` (${unidadeAberta.UsuarioAtribuicao.Nome})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {unidadesFiltroList.length}
                    </span>
                  )}
                </label>
                {unidadesFiltroList && unidadesFiltroList.length > 0 ? (
                  <Select
                    value={selectedMinhaUnidade}
                    onValueChange={setSelectedMinhaUnidade}
                    disabled={!!(selectedUnidadeAberta || selectedUnidadeFavorita)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione uma de suas unidades" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidadesFiltroList.map((unidade) => (
                        <SelectItem key={unidade.Id} value={unidade.Id}>
                          {unidade.Sigla} - {unidade.Descricao}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select
                    value={selectedUnidadeFavorita}
                    onValueChange={setSelectedUnidadeFavorita}
                    disabled={!!(selectedUnidadeAberta || selectedMinhaUnidade)}
                  >
                    <SelectTrigger className="w-full border-green-300 bg-green-50">
                      <SelectValue placeholder="Selecionar unidade favorita" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={unidadeFavorita.Id}>
                        ⭐ {unidadeFavorita.Sigla} - {unidadeFavorita.Descricao}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-center text-sm text-muted-foreground p-3 border rounded-md bg-gray-50">
                    Nenhuma unidade favorita definida
                  </div>
                )}
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white mt-6"
                onClick={handleAcessarProcesso}
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