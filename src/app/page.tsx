"use client";

import { Search, LogOut, Activity, Newspaper, Info, Clock, HelpCircle, Home as HomeIcon, Brain, Share2, FileSignature, Loader2, ExternalLink, Lock, GanttChartSquare } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import ApiHealthCheck from '@/components/ApiHealthCheck';
import { getSearchHistory, type HistoryItem } from '@/lib/history-api-client';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

function FeatureCard({ icon, title, subtitle }: FeatureCardProps) {
  return (
    <div className="bg-white rounded-lg p-5 min-h-36 flex flex-col gap-3 border border-emerald-200 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
      <div className="text-emerald-700">{icon}</div>
      <div className="space-y-1">
        <p className="text-emerald-700 font-semibold leading-tight">{title}</p>
        <p className="text-sm text-gray-600 leading-snug">{subtitle}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    isAuthenticated,
    logout: persistLogout,
    nomeUsuario,
    usuario,
  } = usePersistedAuth();

  const [processoNumeroInput, setProcessoNumeroInput] = useState<string>("");
  const [isApiStatusModalOpen, setIsApiStatusModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const formatHistoryProcessNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 16) return value;
    const masked = `${digits.slice(0, 5)}.${digits.slice(5, 10)}/${digits.slice(10, 14)}-${digits.slice(14, 16)}`;
    return masked;
  };

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
              title: "Erro ao carregar histórico",
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
      toast({ title: "Acesso não autorizado", description: "Você precisa estar logado para pesquisar processos. Faça login e tente novamente.", variant: "destructive" });
      return;
    }
    if (!processoToSearch) {
      toast({ title: "Número do processo obrigatório", description: "Digite o número do processo que deseja consultar (ex: 12345678901234567890).", variant: "destructive" });
      return;
    }

    const encodedProcesso = encodeURIComponent(processoToSearch);
    router.push(`/processo/${encodedProcesso}`);
  };

  const handleLogout = () => {
    persistLogout();
    toast({ title: "Logout realizado." });
    router.push('/login');
  };

  const inputRef = React.createRef<HTMLInputElement>();

  const intelligencePanels = [
    {
      id: 'autorizacao',
      titulo: 'Acompanhamento de processos com SEAD_AUTORIZAÇÃO',
      subtitulo: 'Painel para monitoramento de fluxos de autorização',
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
    <div className="flex flex-col min-h-screen bg-gray-100 w-full">
      <div className="p-3 border-b border-border shadow-sm sticky top-0 z-30 bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 max-w-full">
          <div className="flex flex-wrap items-center gap-2 flex-grow">
            {mounted && isAuthenticated && (
              <>
                <span className="inline-flex items-center px-3 py-1 text-xl font-bold text-emerald-600 mr-1">
                  Visualizador de Processos
                </span>
                <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={() => router.push('/')} title="Página Inicial">
                  <HomeIcon className="mr-2 h-4 w-4" />
                  Início
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={() => setIsInfoModalOpen(true)} title="Informações do Sistema">
              <Newspaper className="h-4 w-4" />
            </Button>
            <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={() => setIsApiStatusModalOpen(true)} title="Status das APIs">
              <Activity className="h-4 w-4" />
            </Button>
            {mounted && isAuthenticated && (
              <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={handleLogout}> <LogOut className="mr-2 h-4 w-4" /> Sair </Button>
            )}
          </div>
        </div>
      </div>

      <ApiHealthCheck />

      <main className="flex-1 flex flex-col justify-between w-full bg-gray-100">
        <div className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-1">
              <p className="text-gray-700">Olá,
                <span className="font-semibold">{mounted ? (nomeUsuario || 'Usuário') : 'Usuário'}</span>
              </p>
            </div>

            <h1 className="text-3xl font-bold text-emerald-600">
              O que analisaremos juntos ?
            </h1>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 items-start mt-4 xl:mt-8">
              <section className="">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <FeatureCard
                    icon={<GanttChartSquare className="w-8 h-8" />}
                    title="Análise de processos"
                    subtitle="Analise objetivamente com a linha do tempo"
                  />
                  <FeatureCard
                    icon={<Brain className="w-8 h-8" />}
                    title="Entendimentos"
                    subtitle="Entendimento automatizado com SoberanIA"
                  />
                  <FeatureCard
                    icon={<Share2 className="w-8 h-8" />}
                    title="Compartilhe"
                    subtitle="Compartilhe processos e entendimentos com outros gestores"
                  />
                  <FeatureCard
                    icon={<FileSignature className="w-8 h-8" />}
                    title="Assinaturas"
                    subtitle="Tome ações rapidas, assine oficios"
                  />
                </div>

                <div className="w-full">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Digite o número do processo..."
                      className="h-14 text-lg w-full pr-16 rounded-full border-2 border-gray-300 focus:border-emerald-500 shadow-lg"
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
                      className="absolute right-2 top-2 h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white p-0"
                    >
                      <Search className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </section>

              <section>
                <Tabs defaultValue="historico" className="w-full">
                  <div className="mb-3">
                    <TabsList className="w-full grid grid-cols-4 h-auto gap-1 bg-gray-100">
                      <TabsTrigger value="historico" className="text-xs px-2 py-2 whitespace-normal leading-tight">Últimas pesquisas</TabsTrigger>
                      <TabsTrigger value="espaco" disabled className="text-xs px-2 py-2 whitespace-normal leading-tight">
                        <Lock className="h-3.5 w-3.5 mr-1" /> Meu Espaço
                      </TabsTrigger>
                      <TabsTrigger value="compartilhados" disabled className="text-xs px-2 py-2 whitespace-normal leading-tight">
                        <Lock className="h-3.5 w-3.5 mr-1" /> Compartilhados comigo
                      </TabsTrigger>
                      <TabsTrigger value="paineis" className="text-xs px-2 py-2 whitespace-normal leading-tight">Painéis de Inteligência</TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="bg-white border border-gray-300 rounded-lg p-4 min-h-[360px]">
                    <TabsContent value="historico" className="mt-0">
                      <ScrollArea className="h-[330px] pr-2">
                        {isHistoryLoading ? (
                          <div className="h-full flex items-center justify-center text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        ) : history.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-sm text-gray-500">
                            Nenhuma pesquisa encontrada no histórico.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {history.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => handleSearchClick(item.numero_processo)}
                                className="w-full text-left p-3 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
                              >
                                <p className="font-medium text-gray-800">{formatHistoryProcessNumber(item.numero_processo)}</p>
                                {item.caixa_contexto && (
                                  <p className="text-xs text-gray-600 mt-1 whitespace-nowrap overflow-hidden text-ellipsis" title={item.caixa_contexto}>
                                    {item.caixa_contexto}
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
                        Listagem do Meu Espaço em breve.
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

        <footer className="bg-gray-100 py-8 px-8">
          <div className="flex flex-col items-center gap-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <img
                src="/logo-soberania.svg"
                alt="Logo SoberanIA"
                className="h-10 w-auto object-contain"
              />
              <img
                src="/logo-governo-piaui.svg"
                alt="Logo Governo do Piauí"
                className="h-14 w-auto object-contain"
              />
            </div>
            <div className="text-center text-xs text-gray-600 max-w-2xl">
              <p className="font-semibold mb-1">Desenvolvido pelo Núcleo Estratégico de Tecnologia e Governo Digital</p>
              <p className="mb-1">SEAD/NTGD • Secretaria de Administração do Piauí</p>
              <p>© 2026 Governo do Estado do Piauí</p>
            </div>
          </div>
        </footer>
      </main>

      <Dialog open={isApiStatusModalOpen} onOpenChange={setIsApiStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <ApiHealthCheck showDetails={true} className="border-0 shadow-none p-0 bg-transparent" />
        </DialogContent>
      </Dialog>

      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-blue-600">
              <Newspaper className="mr-2 h-5 w-5" />
              Informações do Sistema
            </DialogTitle>
            <DialogDescription>
              Informações importantes sobre funcionalidades e limitações atuais
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 mb-1">Arquivos Suportados</h4>
                  <p className="text-sm text-blue-700">
                    Nesta fase atual o sistema consegue ler e processar apenas arquivos gerados internamente pelo SEI.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-900 mb-1">Documentos PDF</h4>
                  <p className="text-sm text-yellow-700">
                    Documentos PDFs ainda não são processados e está no cronograma de desenvolvimento.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <HelpCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-orange-900 mb-1">Problema Conhecido</h4>
                  <p className="text-sm text-orange-700">
                    Alguns processos com grande volume de andamentos {'>'}500 podem apresentar lentidão na renderização do gráfico. Recomenda-se usar a opção "Resumido" para melhor desempenho.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsInfoModalOpen(false)} variant="outline">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
