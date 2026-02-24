"use client";

import { Search, Brain, Share2, FileSignature, GanttChartSquare } from 'lucide-react';
import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSearchHistory, deleteSearchHistory, type HistoryItem } from '@/lib/history-api-client';
import { stripProcessNumber } from '@/lib/utils';
import { SaveProcessoModal } from '@/components/process-flow/SaveProcessoModal';
import { MeuEspacoContent } from '@/components/home/MeuEspacoContent';
import { CompartilhadosContent } from '@/components/home/CompartilhadosContent';
import { HistoricoContent } from '@/components/home/HistoricoContent';
import { ShareDialog } from '@/components/home/ShareDialog';

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
  const [shareTagId, setShareTagId] = useState<string | null>(null);
  const [saveProcessoNumero, setSaveProcessoNumero] = useState<string | null>(null);

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

  const applyProcessoMask = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 17);
    let masked = '';
    for (let i = 0; i < digits.length; i++) {
      if (i === 5) masked += '.';
      if (i === 11) masked += '/';
      if (i === 15) masked += '-';
      masked += digits[i];
    }
    return masked;
  };

  const processoDigits = stripProcessNumber(processoNumeroInput);
  const isProcessoValid = processoDigits.length === 17;

  const handleProcessoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProcessoNumeroInput(applyProcessoMask(e.target.value));
  };

  const handleSearchClick = async (numeroProcesso?: string) => {
    const processoToSearch = numeroProcesso || processoNumeroInput;

    if (!isAuthenticated) {
      toast({ title: "Acesso n\u00e3o autorizado", description: "Voc\u00ea precisa estar logado para pesquisar processos. Fa\u00e7a login e tente novamente.", variant: "destructive" });
      return;
    }
    const digits = stripProcessNumber(processoToSearch);
    if (digits.length !== 17) {
      toast({ title: "N\u00famero inv\u00e1lido", description: "O n\u00famero do processo deve conter exatamente 17 d\u00edgitos (ex: 00000.000000/0000-00).", variant: "destructive" });
      return;
    }

    router.push(`/processo/${encodeURIComponent(digits)}`);
  };

  const inputRef = React.createRef<HTMLInputElement>();

  const contextoMap = useMemo(() =>
    history.reduce((acc, h) => {
      if (h.caixa_contexto && !acc[h.numero_processo]) acc[h.numero_processo] = h.caixa_contexto;
      return acc;
    }, {} as Record<string, string>),
    [history]
  );

  const handleHistoryItemClick = (item: HistoryItem) => {
    if (item.id_unidade) {
      updateSelectedUnidade(item.id_unidade);
      router.push(`/processo/${encodeURIComponent(item.numero_processo)}/visualizar`);
    } else {
      handleSearchClick(item.numero_processo);
    }
  };

  const handleHistorySave = (item: HistoryItem) => {
    setSaveProcessoNumero(item.numero_processo);
  };

  const handleHistoryShare = (item: HistoryItem) => {
    // Open save modal — user can save to a group and share from there
    setSaveProcessoNumero(item.numero_processo);
  };

  const handleHistoryDelete = async (item: HistoryItem) => {
    const result = await deleteSearchHistory(item.id);
    if ('error' in result) {
      toast({ title: "Erro ao excluir", description: result.error, variant: "destructive" });
    } else {
      setHistory(prev => prev.filter(h => h.id !== item.id));
      toast({ title: "Pesquisa removida do historico" });
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-1">
          <p className="text-gray-700">{"Ol\u00e1, "}<span className="font-semibold">{mounted ? (nomeUsuario || 'Usu\u00e1rio') : 'Usu\u00e1rio'}</span>
          </p>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-primary">
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
                subtitle="Crie grupos, favorite e compartilhe processos com outros gestores"
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
                  placeholder="00000.000000/0000-00"
                  className="h-14 text-lg w-full pl-6 pr-16 rounded-full border-2 bg-white shadow-lg"
                  value={processoNumeroInput}
                  onChange={handleProcessoInputChange}
                  disabled={!mounted || !isAuthenticated}
                  ref={inputRef}
                  maxLength={20}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isAuthenticated && isProcessoValid) {
                      handleSearchClick();
                    }
                  }}
                />
                <Button
                  onClick={() => handleSearchClick()}
                  disabled={!mounted || !isAuthenticated || !isProcessoValid}
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
                <TabsList className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary w-full grid grid-cols-3 h-auto gap-1 bg-transparent">
                  <TabsTrigger value="historico" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs px-2 py-2 whitespace-normal leading-tight">{"\u00daltimas pesquisas"}</TabsTrigger>
                  <TabsTrigger value="espaco" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs px-2 py-2 whitespace-normal leading-tight">
                    {"Meu Espa\u00e7o"}
                  </TabsTrigger>
                  <TabsTrigger value="compartilhados" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary text-xs px-2 py-2 whitespace-normal leading-tight">
                    Compartilhados comigo
                  </TabsTrigger>
                </TabsList>
              </div>
              <div className="bg-white border border-gray-300 rounded-lg p-3 sm:p-4 min-h-[280px] sm:min-h-[360px]">
                <TabsContent value="historico" className="mt-0">
                  <HistoricoContent
                    history={history}
                    isLoading={isHistoryLoading}
                    contextoMap={contextoMap}
                    onItemClick={handleHistoryItemClick}
                    onSave={handleHistorySave}
                    onShare={handleHistoryShare}
                    onDelete={handleHistoryDelete}
                  />
                </TabsContent>

                <TabsContent value="espaco" className="mt-0">
                  {usuario ? (
                    <MeuEspacoContent
                      usuario={usuario}
                      onShareTag={(tagId) => setShareTagId(tagId)}
                      contextoMap={contextoMap}
                    />
                  ) : (
                    <div className="h-[330px] flex items-center justify-center text-sm text-gray-500">
                      Carregando...
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="compartilhados" className="mt-0">
                  {usuario ? (
                    <CompartilhadosContent
                      usuario={usuario}
                      contextoMap={contextoMap}
                    />
                  ) : (
                    <div className="h-[330px] flex items-center justify-center text-sm text-gray-500">
                      Carregando...
                    </div>
                  )}
                </TabsContent>

              </div>
            </Tabs>
          </section>
        </div>
      </div>

      {shareTagId && usuario && (
        <ShareDialog
          tagId={shareTagId}
          usuario={usuario}
          open={!!shareTagId}
          onOpenChange={(open) => { if (!open) setShareTagId(null); }}
        />
      )}

      {saveProcessoNumero && (
        <SaveProcessoModal
          open={!!saveProcessoNumero}
          onOpenChange={(open) => { if (!open) setSaveProcessoNumero(null); }}
          numeroProcesso={saveProcessoNumero}
        />
      )}
    </div>
  );
}
