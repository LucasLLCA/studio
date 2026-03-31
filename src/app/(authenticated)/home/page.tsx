"use client";

import {
  Search,
  Brain,
  Share2,
  FileSignature,
  GanttChartSquare,
} from "lucide-react";
import React, { Suspense, useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usePersistedAuth } from "@/hooks/use-persisted-auth";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { HistoryItem } from "@/lib/history-api-client";
import { useSearchHistory } from "@/lib/react-query/queries/useSearchHistory";
import { stripProcessNumber, applyProcessoMask } from "@/lib/utils";
import { SaveProcessoModal } from "@/components/process-flow/SaveProcessoModal";
import { MeuEspacoContent } from "@/components/home/MeuEspacoContent";
import { CompartilhadosContent } from "@/components/home/CompartilhadosContent";
import { HistoricoContent } from "@/components/home/HistoricoContent";
import { ShareDialog } from "@/components/home/ShareDialog";
import { HomeMobileDrawer } from "@/components/home/HomeMobileDrawer";
import {
  appTabsListClass,
  appTabsTriggerClass,
  appTabsPanelClass,
} from "@/components/ui/app-tabs";

export const appCardClass =
  "rounded-2xl border border-border bg-card text-card-foreground shadow-sm";

export const appInputClass =
  "border border-input bg-background text-foreground placeholder:text-muted-foreground";

export const appTabActiveClass =
  "text-primary border-b-2 border-primary";

export const appTabInactiveClass =
  "text-muted-foreground hover:text-foreground";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}
function FeatureCard({ icon, title, subtitle }: FeatureCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-card p-5 min-h-36 flex flex-col gap-6 shadow-sm">
      
      {/* linha de cima neutra */}
      <div className="absolute top-0 left-0 h-1 w-full + border-t-border" />

      {/* ícone */}
      <div className="text-primary">{icon}</div>

      <div className="space-y-2">
        {/* título mais forte */}
        <p className="text-primary font-semibold leading-tight">{title}</p>

        {/* descrição continua suave */}
        <p className="text-sm leading-snug text-muted-foreground">{subtitle}</p>
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

  const {
    isAuthenticated,
    nomeUsuario,
    usuario,
    updateSelectedUnidade,
  } = usePersistedAuth();

  const [processoNumeroInput, setProcessoNumeroInput] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [shareTagId, setShareTagId] = useState<string | null>(null);
  const [saveProcessoNumero, setSaveProcessoNumero] = useState<string | null>(
    null
  );

  const {
    data: history = [],
    isLoading: isHistoryLoading,
    deleteItem: deleteHistoryItem,
  } = useSearchHistory({
    usuario: usuario || "",
    enabled: mounted && isAuthenticated && !!usuario,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      const timer = setTimeout(() => {
        router.push("/");
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [mounted, isAuthenticated, router]);

  const processoDigits = stripProcessNumber(processoNumeroInput);
  const isProcessoValid = processoDigits.length === 17;

  const handleProcessoInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setProcessoNumeroInput(applyProcessoMask(e.target.value));
  };

  const handleSearchClick = async (numeroProcesso?: string) => {
    const processoToSearch = numeroProcesso || processoNumeroInput;

    if (!isAuthenticated) {
      toast({
        title: "Acesso não autorizado",
        description:
          "Você precisa estar logado para pesquisar processos. Faça login e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    const digits = stripProcessNumber(processoToSearch);

    if (digits.length !== 17) {
      toast({
        title: "Número inválido",
        description:
          "O número do processo deve conter exatamente 17 dígitos (ex: 00000.000000/0000-00).",
        variant: "destructive",
      });
      return;
    }

    router.push(`/processo/${encodeURIComponent(digits)}/visualizar`);
  };

  const contextoMap = useMemo(
    () =>
      history.reduce((acc, h) => {
        if (h.caixa_contexto && !acc[h.numero_processo]) {
          acc[h.numero_processo] = h.caixa_contexto;
        }
        return acc;
      }, {} as Record<string, string>),
    [history]
  );

  const handleHistoryItemClick = (item: HistoryItem) => {
    if (item.id_unidade) {
      updateSelectedUnidade(item.id_unidade);
    }

    router.push(
      `/processo/${encodeURIComponent(item.numero_processo)}/visualizar`
    );
  };

  const handleHistorySave = (item: HistoryItem) => {
    setSaveProcessoNumero(item.numero_processo);
  };

  const handleHistoryShare = (item: HistoryItem) => {
    setSaveProcessoNumero(item.numero_processo);
  };

  const handleHistoryDelete = async (item: HistoryItem) => {
    try {
      await deleteHistoryItem(item.id);
      toast({ title: "Pesquisa removida do histórico" });
    } catch (err) {
      toast({
        title: "Erro ao excluir",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-1 justify-center px-4 py-6 sm:px-8 sm:py-8">
      <div className="w-full max-w-6xl mx-auto">
        {/* SAUDAÇÃO */}
        <div className="space-y-2 sm:space-y-3">
          <p className="text-base text-foreground">
            Olá,{" "}
            <span className="font-semibold">
              {mounted ? nomeUsuario || "Usuário" : "Usuário"}
            </span>
          </p>

          <h1 className="max-w-[14ch] text-4xl font-bold leading-tight text-primary sm:max-w-none sm:text-3xl">
            Digite o número do processo
          </h1>
        </div>

        {/* BUSCA */}
        <section className="mt-8 sm:mt-8">
          <div className="w-full max-w-[560px]">
          <div className="relative">
            <Input
              type="text"
              placeholder="00000.000000/0000-00"
              className="h-14 w-full rounded-md border border-slate-200 bg-white pl-5 pr-16 text-lg shadow-sm"
              value={processoNumeroInput}
              onChange={handleProcessoInputChange}
              disabled={!mounted || !isAuthenticated}
              maxLength={20}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isAuthenticated && isProcessoValid) {
                  handleSearchClick();
                        }
                      }}
                    />

                    <Button
              onClick={() => handleSearchClick()}
              disabled={!mounted || !isAuthenticated || !isProcessoValid}
              className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-md bg-primary p-0 text-white hover:bg-primary-hover"
                      >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

       {/* MOBILE: cards em carrossel */}
<section className="mt-8 md:hidden">
  <div className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 pl-1 pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
    <div className="min-w-[240px] max-w-[240px] snap-start">
      <FeatureCard
        icon={<GanttChartSquare className="h-7 w-7" />}
        title="Seja Ágil"
        subtitle="Analise objetivamente com a linha do tempo"
      />
    </div>

    <div className="min-w-[240px] max-w-[240px] snap-start">
      <FeatureCard
        icon={<Brain className="h-7 w-7" />}
        title="Use IA a seu favor"
        subtitle="Entendimento automatizado de processos e documentos"
      />
    </div>

    <div className="min-w-[240px] max-w-[240px] snap-start">
      <FeatureCard
        icon={<Share2 className="h-7 w-7" />}
        title="Salve e acompanhe"
        subtitle="Crie grupos, favorite e compartilhe processos"
      />
    </div>

    <div className="min-w-[240px] max-w-[240px] snap-start">
      <FeatureCard
        icon={<FileSignature className="h-7 w-7" />}
        title="Tome ações rápidas"
        subtitle="Assine ofícios e compartilhe entendimentos"
      />
    </div>
  </div>
</section>

{/* MOBILE: home simplificada */}
<section className="mt-6 space-y-4 md:hidden">
  <HomeMobileDrawer
    history={history}
    isHistoryLoading={isHistoryLoading}
    contextoMap={contextoMap}
    usuario={usuario}
    onItemClick={handleHistoryItemClick}
    onSave={handleHistorySave}
    onShare={handleHistoryShare}
    onDelete={handleHistoryDelete}
    onShareTag={(tagId) => setShareTagId(tagId)}
  />
</section>

{/* DESKTOP / TABLET */}
<div className="mt-8 hidden grid-cols-1 gap-8 lg:grid lg:grid-cols-2">
  {/* LADO ESQUERDO */}
  <section className="self-start">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <FeatureCard
        icon={<GanttChartSquare className="h-8 w-8" />}
        title="Seja Ágil"
        subtitle="Analise objetivamente com a linha do tempo"
      />

      <FeatureCard
        icon={<Brain className="h-8 w-8" />}
        title="Use IA a seu favor"
        subtitle="Entendimento automatizado de processos e documentos"
      />

      <FeatureCard
        icon={<Share2 className="h-8 w-8" />}
        title="Salve e acompanhe"
        subtitle="Crie grupos, favorite e compartilhe processos com outros gestores"
      />

      <FeatureCard
        icon={<FileSignature className="h-8 w-8" />}
        title="Tome ações rápidas"
        subtitle="(Em breve) Assine ofícios, compartilhe entendimentos e situações"
      />
    </div>
  </section>


  {/* LADO DIREITO */}
  <section className="self-start -mt-16">
    <Tabs defaultValue="historico" className="self-start -mt-3">
      <div className=" mb-8">
        <TabsList className={`${appTabsListClass} grid-cols-3`}>
          <TabsTrigger value="historico" className={appTabsTriggerClass}>
            Últimas pesquisas
          </TabsTrigger>

          <TabsTrigger value="espaco" className={appTabsTriggerClass}>
            Meu Espaço
          </TabsTrigger>

          <TabsTrigger value="compartilhados" className={appTabsTriggerClass}>
            Compartilhados comigo
          </TabsTrigger>
        </TabsList>
      </div>

      <div className={`${appTabsPanelClass} min-h-[100px]`}>
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
            <div className="flex h-[330px] items-center justify-center text-sm text-muted-foreground">
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
            <div className="flex h-[330px] items-center justify-center text-sm text-muted-foreground">
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
          onOpenChange={(open) => {
            if (!open) setShareTagId(null);
          }}
        />
      )}

      {saveProcessoNumero && (
        <SaveProcessoModal
          open={!!saveProcessoNumero}
          onOpenChange={(open) => {
            if (!open) setSaveProcessoNumero(null);
          }}
          numeroProcesso={saveProcessoNumero}
        />
      )}
    </div>
  );
}