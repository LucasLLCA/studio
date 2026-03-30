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
  ChevronUp,
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
import { hasAuthTokenCookie, clearAuthTokenCookie } from "@/app/sei-actions";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { FeedPanel } from "@/components/bi/FeedPanel";
import { useFeedBadge } from "@/lib/react-query/queries/useBiQueries";

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { isAuthenticated, usuario, logout: persistLogout } = usePersistedAuth();
  const { hasModulo, papelNome } = usePermissions();
  const { lastViewedProcess, clearLastViewedProcess, recentProcesses, removeRecentProcess, isSubheaderCollapsed, toggleSubheaderCollapsed } = useLastViewedProcess();

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
    `rounded-lg ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`;

  const showSubheader = mounted && isAuthenticated && recentProcesses.length > 0;

  // Active process comparison uses normalized numbers
  const normalizeNum = (n: string) => n.replace(/\D/g, '');
  const currentProcessoNorm = currentProcesso ? normalizeNum(currentProcesso) : null;

  return (
    <>
      {/* ── Main header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-md bg-card/80">
        <div className="container mx-auto flex max-w-full items-center justify-between gap-2 px-4 sm:px-6 py-3.5">

          {/* LEFT: Mobile hamburger + Title */}
          <div className="flex min-w-0 items-center">
            {/* Mobile hamburger — left of title */}
            {mounted && isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Abrir menu"
                className="md:hidden mr-1 text-muted-foreground"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            {mounted && isAuthenticated && (
              <Button
                variant="ghost"
                className="mr-1 inline-flex h-auto items-center px-2 py-1 text-left text-sm font-bold text-primary hover:bg-transparent hover:text-primary-hover sm:px-3 sm:text-xl"
                onClick={goToHome}
              >
                <span className="truncate max-w-[180px] sm:max-w-none">
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
                variant="ghost"
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
                    variant="ghost"
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
                  <DropdownMenuItem onClick={() => router.push('/pessoal')}>
                    <User className="h-4 w-4 mr-2" />
                    Pessoal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Fluxos — admin/beta only */}
              {mounted && hasModulo('fluxos') && (
                <Button
                  className={tabClass(isOnFluxos)}
                  variant="ghost"
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
                variant="ghost"
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
                    className="text-muted-foreground hover:text-foreground"
                    variant="ghost"
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
                  className="relative text-muted-foreground hover:text-foreground"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsFeedOpen(true)}
                  title="Movimentacoes"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-bold text-destructive-foreground">
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
                    variant="ghost"
                    size="icon"
                    title="Configurações"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {mounted && papelNome && (
                    <>
                      <div className="px-2 py-1.5 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Papel:</span>
                        <Badge variant="secondary" className="text-2xs px-1.5 py-0 font-medium">
                          {papelNome}
                        </Badge>
                      </div>
                      <DropdownMenuSeparator />
                    </>
                  )}
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

            {/* Mobile: recent processes + notifications (right side) */}
            <div className="md:hidden flex items-center gap-1">
              {showSubheader && (
                <Drawer>
                  <DrawerTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Processos recentes" className="relative">
                      <FileText className="h-5 w-5" />
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs font-bold text-primary-foreground">
                        {recentProcesses.length}
                      </span>
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent className="rounded-t-3xl">
                    <div className="mx-auto w-full max-w-md">
                      <DrawerHeader className="text-center pb-2">
                        <DrawerTitle>Processos Recentes</DrawerTitle>
                      </DrawerHeader>
                      <div className="px-4 pb-4 space-y-1.5 max-h-[60vh] overflow-y-auto">
                        {recentProcesses.map(numero => {
                          const isActive = currentProcessoNorm === normalizeNum(numero);
                          return (
                            <div
                              key={normalizeNum(numero)}
                              className={cn(
                                'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors cursor-pointer',
                                isActive
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-foreground hover:bg-muted',
                              )}
                              onClick={() => goToProcess(numero)}
                            >
                              <span className="flex items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0" />
                                {formatProcessNumber(numero)}
                              </span>
                              <button
                                className="rounded-md p-1 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={(e) => { e.stopPropagation(); removeRecentProcess(numero); }}
                                title="Remover"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        {recentProcesses.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhum processo recente.</p>
                        )}
                      </div>
                      <div className="p-4 pt-2">
                        <DrawerClose asChild>
                          <Button variant="outline" className="w-full rounded-xl h-11">Fechar</Button>
                        </DrawerClose>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
              )}

              {mounted && isAuthenticated && usuario && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative text-muted-foreground"
                  onClick={() => setIsFeedOpen(true)}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-2xs font-bold text-destructive-foreground">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              )}
            </div>

            {/* Mobile menu drawer (triggered by hamburger on left) */}
            <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <DrawerContent className="rounded-t-3xl">
                <div className="mx-auto w-full max-w-md">
                  <DrawerHeader className="text-center pb-2">
                    <DrawerTitle>Menu</DrawerTitle>
                    {mounted && papelNome && (
                      <div className="flex items-center justify-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-2xs px-2 py-0.5 font-medium">
                          {papelNome}
                        </Badge>
                      </div>
                    )}
                  </DrawerHeader>

                  <div className="px-4 pb-2 max-h-[65vh] overflow-y-auto">
                    {/* Navigation modules as cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors",
                          isOnHome ? "bg-primary/10 text-primary" : "bg-muted/50 text-foreground hover:bg-muted"
                        )}
                        onClick={goToHome}
                      >
                        <Home className="h-5 w-5" />
                        Início
                      </button>

                      <button
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors",
                          isOnEquipes ? "bg-primary/10 text-primary" : "bg-muted/50 text-foreground hover:bg-muted"
                        )}
                        onClick={goToEquipes}
                      >
                        <Users className="h-5 w-5" />
                        Equipes
                      </button>

                      <button
                        className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium bg-muted/50 text-foreground hover:bg-muted transition-colors"
                        onClick={() => { router.push('/pessoal'); setIsMobileMenuOpen(false); }}
                      >
                        <User className="h-5 w-5" />
                        Pessoal
                      </button>

                      {mounted && hasModulo('fluxos') && (
                        <button
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors",
                            isOnFluxos ? "bg-primary/10 text-primary" : "bg-muted/50 text-foreground hover:bg-muted"
                          )}
                          onClick={() => { router.push('/fluxos'); setIsMobileMenuOpen(false); }}
                        >
                          <GitBranch className="h-5 w-5" />
                          Fluxos
                        </button>
                      )}

                      <button
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium transition-colors",
                          pathname.startsWith("/bi") ? "bg-primary/10 text-primary" : "bg-muted/50 text-foreground hover:bg-muted"
                        )}
                        onClick={() => { router.push("/bi"); setIsMobileMenuOpen(false); }}
                      >
                        <BarChart3 className="h-5 w-5" />
                        BI&apos;s
                      </button>

                      <button
                        className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-medium bg-muted/50 text-muted-foreground opacity-50"
                        disabled
                      >
                        <Compass className="h-5 w-5" />
                        Explorador
                      </button>
                    </div>

                    {/* Settings section */}
                    <div className="mt-4 space-y-1">
                      <p className="text-2xs font-medium uppercase tracking-wide text-muted-foreground px-1 mb-2">Configurações</p>

                      {mounted && hasModulo('admin') && (
                        <button
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                          onClick={() => { router.push('/admin'); setIsMobileMenuOpen(false); }}
                        >
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          Administração
                        </button>
                      )}

                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                        onClick={() => { setIsInfoModalOpen(true); setIsMobileMenuOpen(false); }}
                      >
                        <Newspaper className="h-4 w-4 text-muted-foreground" />
                        Atualizações
                      </button>

                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                        onClick={() => { /* help */ setIsMobileMenuOpen(false); }}
                      >
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        Ajuda
                      </button>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="px-4 pb-4 pt-2 space-y-2">
                    {mounted && isAuthenticated && !isEmbedMode && (
                      <Button
                        variant="outline"
                        className="w-full rounded-xl h-11 text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={handleLogout}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                      </Button>
                    )}
                    <DrawerClose asChild>
                      <Button variant="ghost" className="w-full rounded-xl h-11 text-muted-foreground">Fechar</Button>
                    </DrawerClose>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </div>

        {/* ── Subheader: Recent process tabs (desktop only, mobile uses drawer) ── */}
        {showSubheader && (
          <div className="hidden md:block border-t border-border/50 bg-muted/30">
            <div className="container mx-auto max-w-full px-4 sm:px-8">
              {isSubheaderCollapsed ? (
                <div className="flex items-center justify-end py-0.5">
                  <button
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-0.5 rounded transition-colors"
                    onClick={toggleSubheaderCollapsed}
                    title="Expandir processos recentes"
                  >
                    <FileText className="h-3 w-3" />
                    <span>{recentProcesses.length} processo{recentProcesses.length > 1 ? 's' : ''}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <ScrollArea className="w-full">
                  <div className="flex items-center gap-0.5 py-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0 mr-1" />
                    {recentProcesses.map(numero => {
                      const isActive = currentProcessoNorm === normalizeNum(numero);
                      return (
                        <div
                          key={normalizeNum(numero)}
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
                    <button
                      className="rounded-sm p-1 text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-auto"
                      onClick={toggleSubheaderCollapsed}
                      title="Recolher processos recentes"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </div>
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
