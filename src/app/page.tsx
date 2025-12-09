"use client";

import { Search, LogOut, Activity, Newspaper, Info, Clock, HelpCircle, Home as HomeIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ApiHealthCheck from '@/components/ApiHealthCheck';
import { SearchHistorySidebar } from '@/components/SearchHistorySidebar';
import { IntelligencePanelsSidebar } from '@/components/IntelligencePanelsSidebar';

export default function Home() {
  const { toast } = useToast();
  const router = useRouter();

  // Hook de autenticação persistente
  const {
    isAuthenticated,
    logout: persistLogout,
  } = usePersistedAuth();

  const [processoNumeroInput, setProcessoNumeroInput] = useState<string>("");

  const [isApiStatusModalOpen, setIsApiStatusModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isIntelligencePanelsSidebarOpen, setIsIntelligencePanelsSidebarOpen] = useState(false);

  // Redirect to login page if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('[DEBUG] Usuário não autenticado - redirecionando para login');
      const timer = setTimeout(() => {
        router.push('/login');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, router]);

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

    console.log('[DEBUG] Redirecionando para tela de seleção de unidade, processo:', processoToSearch);

    // Codificar o número do processo para URL segura
    const encodedProcesso = encodeURIComponent(processoToSearch);
    router.push(`/processo/${encodedProcesso}`);
  };

  const handleSidebarSearch = (numeroProcesso: string) => {
    setIsSidebarOpen(false);
    handleSearchClick(numeroProcesso);
  };

  const handleLogout = () => {
    console.log('[DEBUG] Iniciando logout...');
    persistLogout();
    toast({ title: "Logout realizado." });
    router.push('/login');
  };

  const inputRef = React.createRef<HTMLInputElement>();

  return (
    <div className="flex flex-col min-h-screen bg-background w-full">
      {/* Barra de controles no topo */}
      <div className="p-3 border-b border-border shadow-sm sticky top-0 z-30 bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 max-w-full">
          <div className="flex flex-wrap items-center gap-2 flex-grow">
            {isAuthenticated && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsSidebarOpen(true)} title="Histórico de Pesquisas">
                  Histórico de pesquisa
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsIntelligencePanelsSidebarOpen(true)} title="Painéis de Inteligência">
                  Painéis de Inteligência
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isAuthenticated && (
              <Button variant="outline" size="sm" onClick={() => router.push('/')} title="Página Inicial">
                <HomeIcon className="mr-2 h-4 w-4" />
                Início
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setIsInfoModalOpen(true)} title="Informações do Sistema">
              <Newspaper className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsApiStatusModalOpen(true)} title="Status das APIs">
              <Activity className="h-4 w-4" />
            </Button>
            {isAuthenticated && (
              <Button variant="outline" size="sm" onClick={handleLogout}> <LogOut className="mr-2 h-4 w-4" /> Logout </Button>
            )}
          </div>
        </div>
      </div>

      <ApiHealthCheck />

      <main className="flex-1 flex flex-col overflow-y-auto p-4 w-full">
        {/* Logo e título centralizados no meio da tela */}
        <div className="flex flex-col items-center justify-center flex-1 -mt-8">
          <div className="flex flex-col items-center space-y-4">
            <Image src="/logo-sead.png" alt="Logo SEAD Piauí" width={500} height={500} priority data-ai-hint="logo government" />
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold" style={{ color: '#107527' }}>Visualizador de Processos</h1>
              <span className="text-sm font-semibold text-blue-500 bg-blue-100 px-3 py-1 rounded-full">Beta</span>
            </div>
            <p className="text-muted-foreground text-center max-w-md mt-4">
              Para iniciar, insira o número do processo e clique em "Pesquisar".
            </p>

            {/* Campo de busca centralizado */}
            <div className="w-full max-w-2xl mt-8 space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Digite o número do processo..."
                  className="h-14 text-lg w-full pr-16 rounded-full border-2 border-gray-300 focus:border-green-500 shadow-lg"
                  value={processoNumeroInput}
                  onChange={(e) => setProcessoNumeroInput(e.target.value)}
                  disabled={!isAuthenticated}
                  ref={inputRef}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isAuthenticated && processoNumeroInput) {
                      handleSearchClick();
                    }
                  }}
                />
                <Button
                  onClick={() => handleSearchClick()}
                  disabled={!isAuthenticated || !processoNumeroInput}
                  className="absolute right-2 top-2 h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 text-white p-0"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
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

      <SearchHistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSearchSelect={handleSidebarSearch}
      />

      <IntelligencePanelsSidebar
        isOpen={isIntelligencePanelsSidebarOpen}
        onClose={() => setIsIntelligencePanelsSidebarOpen(false)}
      />

    </div>
  );
}
