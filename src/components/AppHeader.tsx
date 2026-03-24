"use client";

import React, { useState } from "react";
import {
  LogOut,
  Newspaper,
  HelpCircle,
  Home,
  Users,
  Sparkles,
  CheckCircle2,
  FileText,
  Shield,
  BarChart3,
  GitBranch,
  Menu,
  Settings,
  ChevronDown,
  User,
  FlaskConical,
  Compass,
  X,
  Bell,
} from "lucide-react";
import { AlertBox } from "@/components/ui/alert-box";
import { Button } from "@/components/ui/button";
import { usePersistedAuth } from "@/hooks/use-persisted-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useLastViewedProcess } from "@/contexts/last-viewed-process-context";
import { formatProcessNumber, cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { hasAuthTokenCookie, clearAuthTokenCookie } from "@/app/sei-actions";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { FeedPanel } from "@/components/bi/FeedPanel";
import { useFeedBadge } from "@/lib/react-query/queries/useBiQueries";

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { isAuthenticated, usuario, logout: persistLogout } = usePersistedAuth();
  const { hasModulo } = usePermissions();
  const { lastViewedProcess, clearLastViewedProcess, recentProcesses, removeRecentProcess } = useLastViewedProcess();

  const [isFeedOpen, setIsFeedOpen] = useState(false);
  const { data: badgeData } = useFeedBadge(usuario ?? undefined);
  const unreadCount = badgeData?.unread_count ?? 0;

  const isOnHome = pathname === "/home";
  const isOnEquipes = pathname.startsWith("/equipes");
  const isOnAdmin = pathname.startsWith("/admin");
  const isOnFluxos = pathname.startsWith("/fluxos");

  // Extract current processo number from URL if on a visualizar page
  const processoMatch = pathname.match(/\/processo\/([^/]+)\/visualizar/);
  const currentProcesso = processoMatch ? decodeURIComponent(processoMatch[1]) : null;

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

  const goToHome = () => {
    router.push("/home");
    setIsMobileMenuOpen(false);
  };

  const goToEquipes = () => {
    router.push("/equipes");
    setIsMobileMenuOpen(false);
  };

  const goToProcess = (numero: string) => {
    router.push(`/processo/${encodeURIComponent(numero)}/visualizar`);
    setIsMobileMenuOpen(false);
  };

  const tabClass = (active: boolean) =>
    `bg-transparent border-0 rounded-b-none ${active ? "border-b-2 border-primary text-primary" : ""}`;

  const showSubheader = mounted && isAuthenticated && recentProcesses.length > 0;

  return (
    <>
      {/* ── Main header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
        <div className="container mx-auto flex max-w-full items-center justify-between gap-2 p-3">

          {/* LEFT: Title */}
          <div className="flex min-w-0 items-center">
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

          {/* RIGHT: Nav items */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">

              {/* Início */}
              <Button
                className={tabClass(isOnHome)}
                variant="outline"
                size="sm"
                onClick={goToHome}
                title="Página Inicial"
              >
                <Home className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Início</span>
              </Button>

              {/* Espaços dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className={tabClass(isOnEquipes)}
                    variant="outline"
                    size="sm"
                  >
                    <Users className="h-4 w-4 lg:mr-1.5" />
                    <span className="hidden lg:inline">Espaços</span>
                    <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={goToEquipes}>
                    <Users className="h-4 w-4 mr-2" />
                    Equipes
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <User className="h-4 w-4 mr-2" />
                    Pessoal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Fluxos — admin/beta only */}
              {mounted && hasModulo('fluxos') && (
                <Button
                  className={tabClass(isOnFluxos)}
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/fluxos')}
                  title="Fluxos de Processos"
                >
                  <GitBranch className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">Fluxos</span>
                </Button>
              )}

              {/* BI's */}
              <Button
                className={tabClass(pathname.startsWith("/bi"))}
                variant="outline"
                size="sm"
                onClick={() => router.push("/bi")}
                title="Business Intelligence"
              >
                <BarChart3 className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">BI&apos;s</span>
              </Button>

              {/* Experimental dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="bg-transparent border-0"
                    variant="outline"
                    size="sm"
                  >
                    <FlaskConical className="h-4 w-4 lg:mr-1.5" />
                    <span className="hidden lg:inline">Experimental</span>
                    <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <Compass className="h-4 w-4 mr-2" />
                    Explorador
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notificações (bell icon) */}
              {mounted && isAuthenticated && usuario && (
                <Button
                  className="bg-transparent border-0 relative"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFeedOpen(true)}
                  title="Movimentacoes"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              )}

              {/* Configurações dropdown (icon only) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className={tabClass(isOnAdmin)}
                    variant="outline"
                    size="icon"
                    title="Configurações"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {mounted && hasModulo('admin') && (
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <Shield className="h-4 w-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setIsInfoModalOpen(true)}>
                    <Newspaper className="h-4 w-4 mr-2" />
                    Atualizações
                  </DropdownMenuItem>
                  {mounted && hasModulo('admin') && <DropdownMenuSeparator />}
                  {mounted && isAuthenticated && !isEmbedMode && (
                    <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile menu */}
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
                    <div className="flex flex-col gap-2">
                      <Button variant="ghost" className="justify-start" onClick={goToHome}>
                        <Home className="mr-2 h-4 w-4" />
                        Início
                      </Button>

                      <div className="pl-1 pt-2 pb-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Espaços</span>
                      </div>

                      <Button variant="ghost" className="justify-start" onClick={goToEquipes}>
                        <Users className="mr-2 h-4 w-4" />
                        Equipes
                      </Button>

                      <Button variant="ghost" className="justify-start" disabled>
                        <User className="mr-2 h-4 w-4" />
                        Pessoal
                      </Button>

                      {mounted && hasModulo('fluxos') && (
                        <Button variant="ghost" className="justify-start" onClick={() => { router.push('/fluxos'); setIsMobileMenuOpen(false); }}>
                          <GitBranch className="mr-2 h-4 w-4" />
                          Fluxos
                        </Button>
                      )}

                      <Button variant="ghost" className="justify-start" onClick={() => { router.push("/bi"); setIsMobileMenuOpen(false); }}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        BI&apos;s
                      </Button>

                      <div className="pl-1 pt-2 pb-1">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Experimental</span>
                      </div>

                      <Button variant="ghost" className="justify-start" disabled>
                        <Compass className="mr-2 h-4 w-4" />
                        Explorador
                      </Button>

                      <div className="border-t my-2" />

                      {mounted && hasModulo('admin') && (
                        <Button variant="ghost" className="justify-start" onClick={() => { router.push('/admin'); setIsMobileMenuOpen(false); }}>
                          <Shield className="mr-2 h-4 w-4" />
                          Admin
                        </Button>
                      )}

                      <Button variant="ghost" className="justify-start" onClick={() => { setIsInfoModalOpen(true); setIsMobileMenuOpen(false); }}>
                        <Newspaper className="mr-2 h-4 w-4" />
                        Atualizações
                      </Button>

                      {mounted && isAuthenticated && usuario && (
                        <Button
                          variant="ghost"
                          className="justify-start relative"
                          onClick={() => { setIsFeedOpen(true); setIsMobileMenuOpen(false); }}
                        >
                          <Bell className="mr-2 h-4 w-4" />
                          Movimentacoes
                          {unreadCount > 0 && (
                            <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </Button>
                      )}
                    </div>

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

        {/* ── Subheader: Recent process tabs ───────────────────── */}
        {showSubheader && (
          <div className="border-t border-border/50 bg-muted/30 px-3">
            <ScrollArea className="w-full">
              <div className="flex items-center gap-0.5 py-1">
                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1" />
                {recentProcesses.map(numero => {
                  const isActive = currentProcesso === numero;
                  return (
                    <div
                      key={numero}
                      className={cn(
                        'group flex items-center gap-1 px-2.5 py-1 rounded-t text-xs transition-colors shrink-0 cursor-pointer border-b-2',
                        isActive
                          ? 'bg-card text-primary border-primary font-medium shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-card/50 border-transparent',
                      )}
                      onClick={() => goToProcess(numero)}
                      title={formatProcessNumber(numero)}
                    >
                      <span className="max-w-[160px] truncate">{formatProcessNumber(numero)}</span>
                      <button
                        className={cn(
                          'rounded-sm p-0.5 transition-opacity',
                          isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100',
                        )}
                        onClick={(e) => { e.stopPropagation(); removeRecentProcess(numero); }}
                        title="Fechar aba"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}
      </div>

      {mounted && isAuthenticated && usuario && (
        <FeedPanel
          open={isFeedOpen}
          onOpenChange={setIsFeedOpen}
          usuario={usuario}
        />
      )}

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
