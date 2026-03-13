"use client";

import React, { useState } from "react";
import {
  LogOut,
  Newspaper,
  HelpCircle,
  Search,
  Users,
  Sparkles,
  CheckCircle2,
  FileText,
  Menu,
} from "lucide-react";
import { AlertBox } from "@/components/ui/alert-box";
import { Button } from "@/components/ui/button";
import { usePersistedAuth } from "@/hooks/use-persisted-auth";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLastViewedProcess } from "@/contexts/last-viewed-process-context";
import { formatProcessNumber } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import ApiHealthCheck from "@/components/ApiHealthCheck";
import { hasAuthTokenCookie, clearAuthTokenCookie } from "@/app/sei-actions";

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { isAuthenticated, logout: persistLogout } = usePersistedAuth();
  const { lastViewedProcess, clearLastViewedProcess } = useLastViewedProcess();

  const isOnHome = pathname === "/home";
  const isOnProcesso = pathname.includes("/visualizar");
  const isOnEquipes = pathname.startsWith("/equipes");

  const [isApiStatusModalOpen, setIsApiStatusModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [isEmbedMode, setIsEmbedMode] = useState(false);

  React.useEffect(() => {
    setMounted(true);
    hasAuthTokenCookie().then(setIsEmbedMode);
  }, []);

  const handleLogout = () => {
    persistLogout();
    clearLastViewedProcess();
    clearAuthTokenCookie();
    toast({ title: "Logout realizado." });
    router.push("/");
    setIsMobileMenuOpen(false);
  };

  const goToLastProcess = () => {
    if (lastViewedProcess) {
      router.push(`/processo/${encodeURIComponent(lastViewedProcess)}/visualizar`);
      setIsMobileMenuOpen(false);
    }
  };

  const goToHome = () => {
    router.push("/home");
    setIsMobileMenuOpen(false);
  };

  const goToEquipes = () => {
    router.push("/equipes");
    setIsMobileMenuOpen(false);
  };

  const openUpdatesModal = () => {
    setIsInfoModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-border bg-card p-3 shadow-sm">
        <div className="container mx-auto flex max-w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center">
            {mounted && isAuthenticated && (
              <Button
                variant="ghost"
                className="mr-1 inline-flex h-auto items-center px-2 py-1 text-left text-sm font-bold text-primary hover:bg-transparent hover:text-primary-hover sm:px-3 sm:text-xl"
                onClick={goToHome}
              >
                <span className="truncate max-w-[220px] sm:max-w-none">
                  Visualizador de Processos
                </span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Menu desktop */}
            <div className="hidden md:flex items-center gap-2">
              <Button
                className={`bg-transparent border-0 rounded-b-none ${
                  isOnHome ? "border-b-2 border-primary text-primary" : ""
                }`}
                variant="outline"
                size="sm"
                onClick={goToHome}
                title="Página Inicial"
              >
                <Search className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Procurar Novo Processo</span>
              </Button>

              <Button
                className={`bg-transparent border-0 rounded-b-none ${
                  isOnProcesso ? "border-b-2 border-primary text-primary" : ""
                }`}
                variant="outline"
                size="sm"
                disabled={!lastViewedProcess}
                onClick={goToLastProcess}
                title={
                  lastViewedProcess
                    ? `Processo ${formatProcessNumber(lastViewedProcess)}`
                    : "Nenhum processo visualizado"
                }
              >
                <FileText className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">
                  {lastViewedProcess
                    ? formatProcessNumber(lastViewedProcess)
                    : "Processo"}
                </span>
              </Button>

              <Button
                className={`bg-transparent border-0 rounded-b-none ${
                  isOnEquipes ? "border-b-2 border-primary text-primary" : ""
                }`}
                variant="outline"
                size="sm"
                onClick={goToEquipes}
                title="Equipes"
              >
                <Users className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Equipes</span>
              </Button>

              <Button
                className="bg-transparent border-0"
                variant="outline"
                size="sm"
                onClick={() => setIsInfoModalOpen(true)}
                title="Informações do Sistema"
              >
                <Newspaper className="h-4 w-4" />
                <span className="ml-2 hidden lg:inline">Atualizações</span>
              </Button>

              {mounted && isAuthenticated && !isEmbedMode && (
                <Button
                  className="bg-transparent border-0"
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">Sair</span>
                </Button>
              )}
            </div>

            {/* Menu mobile */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Abrir menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>

               <SheetContent side="right" className="w-[280px] sm:w-[320px]">
  <SheetHeader>
    <SheetTitle>Menu</SheetTitle>
  </SheetHeader>

  <div className="mt-6 flex flex-col justify-between h-[calc(100vh-120px)]">

    {/* MENU SUPERIOR */}
    <div className="flex flex-col gap-2">

      <Button variant="ghost" className="justify-start" onClick={goToHome}>
        <Search className="mr-2 h-4 w-4" />
        Procurar Novo Processo
      </Button>

      <Button
        variant="ghost"
        className="justify-start"
        disabled={!lastViewedProcess}
        onClick={goToLastProcess}
      >
        <FileText className="mr-2 h-4 w-4" />
        {lastViewedProcess
          ? formatProcessNumber(lastViewedProcess)
          : "Processo"}
      </Button>

      <Button variant="ghost" className="justify-start" onClick={goToEquipes}>
        <Users className="mr-2 h-4 w-4" />
        Equipes
      </Button>

      <Button variant="ghost" className="justify-start" onClick={openUpdatesModal}>
        <Newspaper className="mr-2 h-4 w-4" />
        Atualizações
      </Button>

    </div>

    {/* BOTÃO SAIR NO RODAPÉ */}
    {mounted && isAuthenticated && !isEmbedMode && (
      <div className="border-t pt-4 mt-4">
        <Button
          variant="ghost"
          className="justify-start text-red-600 hover:text-red-700 w-full"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    )}

  </div>
</SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      <ApiHealthCheck />

      <Dialog open={isApiStatusModalOpen} onOpenChange={setIsApiStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Status da API</DialogTitle>
          </DialogHeader>
          <ApiHealthCheck showDetails={true} className="border-0 bg-transparent p-0 shadow-none" />
        </DialogContent>
      </Dialog>

      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary">
              <Sparkles className="mr-2 h-5 w-5" />
              Novidades e Atualizações
            </DialogTitle>
            <DialogDescription>
              Confira as últimas funcionalidades adicionadas ao sistema
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-3 pr-2">
            <AlertBox variant="info" icon={<CheckCircle2 />} title="Leitura de PDFs" className="rounded-lg p-4">
              O sistema agora consegue ler e processar documentos PDF anexados aos processos, além dos documentos gerados internamente pelo SEI.
            </AlertBox>

            <AlertBox variant="info" icon={<CheckCircle2 />} title="Situação Atual com IA" className="rounded-lg p-4">
              Novo resumo gerado por IA que analisa os últimos andamentos e documentos para descrever a situação corrente do processo.
            </AlertBox>

            <AlertBox variant="info" icon={<Users />} title="Equipes, Salvar e Compartilhar" className="rounded-lg p-4">
              Crie equipes, salve processos com tags e compartilhe com colegas. Também é possível compartilhar o link do processo via WhatsApp.
            </AlertBox>

            <AlertBox variant="info" icon={<CheckCircle2 />} title="Observações" className="rounded-lg p-4">
              Adicione observações e comentários diretamente nos processos para colaborar com sua equipe.
            </AlertBox>

            <AlertBox variant="info" icon={<CheckCircle2 />} title="Carregamento Otimizado" className="rounded-lg p-4">
              A visão inicial do processo agora carrega muito mais rápido, exibindo os primeiros e últimos andamentos enquanto o restante é carregado em segundo plano.
            </AlertBox>

            <AlertBox variant="warning" icon={<HelpCircle />} title="Problema Conhecido" className="rounded-lg p-4">
              Alguns processos com grande volume de andamentos (&gt;500) podem apresentar lentidão na renderização do gráfico. Recomenda-se usar a opção &quot;Resumido&quot; para melhor desempenho.
            </AlertBox>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsInfoModalOpen(false)} className="w-full">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}