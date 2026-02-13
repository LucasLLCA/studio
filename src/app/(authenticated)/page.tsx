"use client";

import { Search, Brain, Share2, FileSignature, Loader2, ExternalLink, Lock, GanttChartSquare } from 'lucide-react';
import React, { Suspense, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getSearchHistory, type HistoryItem } from '@/lib/history-api-client';
import { formatProcessNumber } from '@/lib/utils';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

function FeatureCard({ icon, title, subtitle }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-lg p-5 min-h-36 flex flex-col gap-3 border border-primary-light relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
      <div className="text-primary">{icon}</div>
      <div className="space-y-1">
        <p className="text-primary font-semibold leading-tight">{title}</p>
        <p className="text-sm text-gray-600 leading-snug">{subtitle}</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    isAuthenticated,
    nomeUsuario,
    usuario,
    updateSelectedUnidade,
  } = usePersistedAuth();

  const [processoNumeroInput, setProcessoNumeroInput] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      const timer = setTimeout(() => {
        // Preserve token query param so /login can auto-login with it
        const token = searchParams.get('token');
        router.push(token ? `/login?token=${encodeURIComponent(token)}` : '/login');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mounted, isAuthenticated, router, searchParams]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!mounted || !isAuthenticated || !usuario) return;
      setIsHistoryLoading(true);
      try {
        const data = await getSearchHistory(usuario, 20);
        if ('error' in data) {
          if (data.status === 404 || data.status === 500) {
            setHistory([]);
          } else {
            toast({
              title: "Erro ao carregar hist\u00f3rico",
              description: data.error,
              variant: "destructive",
            });
          }
        } else {
          setHistory(data);
        }
      } catch {
        setHistory([]);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    loadHistory();
  }, [mounted, isAuthenticated, usuario, toast]);

  const handleSearchClick = async (numeroProcesso?: string) => {
    const processoToSearch = numeroProcesso || processoNumeroInput;

    if (!isAuthenticated) {
      toast({ title: "Acesso n\u00e3o autorizado", description: "Voc\u00ea precisa estar logado para pesquisar processos. Fa\u00e7a login e tente novamente.", variant: "destructive" });
      return;
    }
    if (!processoToSearch) {
      toast({ title: "N\u00famero do processo obrigat\u00f3rio", description: "Digite o n\u00famero do processo que deseja consultar (ex: 12345678901234567890).", variant: "destructive" });
      return;
    }

    const encodedProcesso = encodeURIComponent(processoToSearch);
    router.push(`/processo/${encodedProcesso}`);
  };

  const inputRef = React.createRef<HTMLInputElement>();

  const intelligencePanels = [
    {
      id: 'autorizacao',
      titulo: 'Acompanhamento de processos com SEAD_AUTORIZA\u00c7\u00c3O',
      subtitulo: 'Painel para monitoramento de fluxos de autoriza\u00e7\u00e3o',
      url: 'https://catalogodedados.inteligencia.sead.pi.gov.br/public/dashboard/66a52d9f-27db-4558-b779-111d53a4c861',
    },
    {
      id: 'produtividade',
      titulo: 'Acompanhamento de estoque de processos e produtividade',
      subtitulo: 'Painel consolidado de estoque e produtividade',
      url: 'https://painel.sead.pi.gov.br',
    },
  ];

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-1">
          <p className="text-gray-700">{"Ol\u00e1, "}<span className="font-semibold">{mounted ? (nomeUsuario || 'Usu\u00e1rio') : 'Usu\u00e1rio'}</span>
          </p>
        </div>

        <h1 className="text-3xl font-bold text-primary">
          O que analisaremos juntos ?
        </h1>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-center mt-4 xl:mt-8">
          <section className="justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FeatureCard
                icon={<GanttChartSquare className="w-8 h-8" />}
                title="Seja Agil"
                subtitle="Analise objetivamente com a linha do tempo"
              />
              <FeatureCard
                icon={<Brain className="w-8 h-8" />}
                title="Use IA a seu favor"
                subtitle="Entendimento automatizado de processos e documentos"
              />
              <FeatureCard
                icon={<Share2 className="w-8 h-8" />}
                title="Salve e acompanhe"
                subtitle="(Em breve) Crie grupos, favorite e compartilhe processos com outros gestores"
              />
              <FeatureCard
                icon={<FileSignature className="w-8 h-8" />}
                title={"Tome a\u00e7\u00f5es rapidas"}
                subtitle={"(Em breve) Assine oficios, compartilhe entendimentos e situa\u00e7\u00f5es"}
              />
            </div>

            <div className="w-full">
              <div className="relative b-0">
                <Input
                  type="text"
                  placeholder={"Digite o n\u00famero do processo..."}
                  className="h-14 text-lg w-full pr-16 rounded-full border-2 bg-white shadow-lg"
                  value={processoNumeroInput}
                  onChange={(e) => setProcessoNumeroInput(e.target.value)}
                  disabled={!mounted || !isAuthenticated}
                  ref={inputRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isAuthenticated && processoNumeroInput) {
                      handleSearchClick();
                    }
                  }}
                />
                <Button
                  onClick={() => handleSearchClick()}
                  disabled={!mounted || !isAuthenticated || !processoNumeroInput}
                  className="absolute right-2 top-2 h-10 w-10 rounded-full bg-primary hover:bg-primary-hover text-white p-0"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </section>

          <section>
            <Tabs defaultValue="historico" className="w-full">
              <div className="mb-3">
                <TabsList className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary w-full grid grid-cols-4 h-auto gap-1 bg-transparent">
                  <TabsTrigger value="historico" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs px-2 py-2 whitespace-normal leading-tight">{"\u00daltimas pesquisas"}</TabsTrigger>
                  <TabsTrigger value="espaco" disabled className="text-xs px-2 py-2 whitespace-normal leading-tight">
                    <Lock className="h-3.5 w-3.5 mr-1" /> {"Meu Espa\u00e7o"}
                  </TabsTrigger>
                  <TabsTrigger value="compartilhados" disabled className="text-xs px-2 py-2 whitespace-normal leading-tight">
                    <Lock className="h-3.5 w-3.5 mr-1" /> Compartilhados comigo
                  </TabsTrigger>
                  <TabsTrigger value="paineis" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs px-2 py-2 whitespace-normal leading-tight">{"Pain\u00e9is de Intelig\u00eancia"}</TabsTrigger>
                </TabsList>
              </div>
              <div className="bg-white border border-gray-300 rounded-lg p-4 min-h-[360px]">
                <TabsContent value="historico" className="mt-0">
                  <ScrollArea className="h-[330px] pr-2">
                    {isHistoryLoading ? (
                      <div className="h-[330px] flex items-center justify-center text-gray-500">
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </div>
                    ) : history.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-gray-500">
                        {"Nenhuma pesquisa encontrada no hist\u00f3rico."}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {history.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.id_unidade) {
                                updateSelectedUnidade(item.id_unidade);
                                router.push(`/processo/${encodeURIComponent(item.numero_processo)}/visualizar`);
                              } else {
                                handleSearchClick(item.numero_processo);
                              }
                            }}
                            className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <div className='justify-between flex flex-row'>
                              <p className="font-medium text-gray-800">{formatProcessNumber(item.numero_processo)}</p>
                              <ExternalLink className="h-4 w-4 text-gray-500 mt-0.5" />
                            </div>
                            {item.caixa_contexto && (
                              <p className="text-xs text-gray-600 mt-1 whitespace-nowrap overflow-hidden text-ellipsis" title={item.caixa_contexto}>
                                {item.caixa_contexto.split(" - ")[0]}
                                <br />
                                {item.caixa_contexto.split(" - ")[1]}
                              </p>
                            )}

                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="espaco" className="mt-0">
                  <div className="h-[330px] flex items-center justify-center text-sm text-gray-500 border border-dashed rounded-md">
                    {"Listagem do Meu Espa\u00e7o em breve."}
                  </div>
                </TabsContent>

                <TabsContent value="compartilhados" className="mt-0">
                  <div className="h-[330px] flex items-center justify-center text-sm text-gray-500 border border-dashed rounded-md">
                    Listagem de compartilhados em breve.
                  </div>
                </TabsContent>

                <TabsContent value="paineis" className="mt-0">
                  <div className="h-[330px] overflow-y-auto space-y-2 pr-2">
                    {intelligencePanels.map((panel) => (
                      <button
                        key={panel.id}
                        onClick={() => window.open(panel.url, '_blank', 'noopener,noreferrer')}
                        className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-gray-800">{panel.titulo}</p>
                            <p className="text-xs text-gray-600 mt-1">{panel.subtitulo}</p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-gray-500 mt-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </section>
        </div>
      </div>
    </div>
  );
}
