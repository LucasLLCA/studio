"use client";

import React, { useState } from 'react';
import { LogOut, Activity, Newspaper, Info, HelpCircle, Search, Clock, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { AlertBox } from '@/components/ui/alert-box';
import { Button } from '@/components/ui/button';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ApiHealthCheck from '@/components/ApiHealthCheck';

export default function AppHeader() {
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated, logout: persistLogout } = usePersistedAuth();

  const [isApiStatusModalOpen, setIsApiStatusModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [isEmbedMode, setIsEmbedMode] = useState(false);
  React.useEffect(() => {
    setMounted(true);
    setIsEmbedMode(document.cookie.split(';').some(c => c.trim().startsWith('auth_token=')));
  }, []);

  const handleLogout = () => {
    persistLogout();
    toast({ title: "Logout realizado." });
    router.push('/login');
  };

  return (
    <>
      <div className="p-3 border-b border-border shadow-sm sticky top-0 z-40 bg-card">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 max-w-full">
          <div className="flex flex-wrap items-center gap-2 flex-grow">
            {mounted && isAuthenticated && (
              <Button variant="ghost" className="inline-flex items-center px-3 py-1 text-base sm:text-xl font-bold text-primary mr-1 hover:bg-transparent hover:text-primary-hover" onClick={() => router.push('/')}>
                Visualizador de Processos
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={() => router.push('/')} title={"P\u00e1gina Inicial"}>
              <Search className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Procurar Novo Processo</span>
            </Button>
            <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={() => router.push('/equipes')} title="Equipes">
              <Users className="sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Equipes</span>
            </Button>
            <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={() => setIsInfoModalOpen(true)} title={"Informa\u00e7\u00f5es do Sistema"}>
              <Newspaper className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">{"Atualizações"}</span>
            </Button>
            {mounted && isAuthenticated && !isEmbedMode && (
              <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={handleLogout}> <LogOut className="sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Sair</span> </Button>
            )}
          </div>
        </div>
      </div>

      <ApiHealthCheck />

      <Dialog open={isApiStatusModalOpen} onOpenChange={setIsApiStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Status da API</DialogTitle>
          </DialogHeader>
          <ApiHealthCheck showDetails={true} className="border-0 shadow-none p-0 bg-transparent" />
        </DialogContent>
      </Dialog>

      <Dialog open={isInfoModalOpen} onOpenChange={setIsInfoModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary">
              <Sparkles className="mr-2 h-5 w-5" />
              Novidades e Atualizações
            </DialogTitle>
            <DialogDescription>
              Confira as últimas funcionalidades adicionadas ao sistema
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <AlertBox variant="info" icon={<CheckCircle2 />} title="Leitura de PDFs" className="p-4 rounded-lg">
              O sistema agora consegue ler e processar documentos PDF anexados aos processos, além dos documentos gerados internamente pelo SEI.
            </AlertBox>

            <AlertBox variant="info" icon={<CheckCircle2 />} title="Situação Atual com IA" className="p-4 rounded-lg">
              Novo resumo gerado por IA que analisa os últimos andamentos e documentos para descrever a situação corrente do processo.
            </AlertBox>

            <AlertBox variant="info" icon={<Users />} title="Equipes, Salvar e Compartilhar" className="p-4 rounded-lg">
              Crie equipes, salve processos com tags e compartilhe com colegas. Também é possível compartilhar o link do processo via WhatsApp.
            </AlertBox>

            <AlertBox variant="info" icon={<CheckCircle2 />} title="Observações" className="p-4 rounded-lg">
              Adicione observações e comentários diretamente nos processos para colaborar com sua equipe.
            </AlertBox>

            <AlertBox variant="info" icon={<CheckCircle2 />} title="Carregamento Otimizado" className="p-4 rounded-lg">
              A visão inicial do processo agora carrega muito mais rápido, exibindo os primeiros e últimos andamentos enquanto o restante é carregado em segundo plano.
            </AlertBox>

            <AlertBox variant="warning" icon={<HelpCircle />} title="Problema Conhecido" className="p-4 rounded-lg">
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
