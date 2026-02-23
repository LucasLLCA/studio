"use client";

import React, { useState } from 'react';
import { LogOut, Activity, Newspaper, Info, HelpCircle, Search, Clock, Users } from 'lucide-react';
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
  React.useEffect(() => { setMounted(true); }, []);

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
            {mounted && isAuthenticated && (
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
              <Newspaper className="mr-2 h-5 w-5" />
              {"Informa\u00e7\u00f5es do Sistema"}
            </DialogTitle>
            <DialogDescription>
              {"Informa\u00e7\u00f5es importantes sobre funcionalidades e limita\u00e7\u00f5es atuais"}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <AlertBox variant="info" icon={<Info />} title="Arquivos Suportados" className="p-4 rounded-lg">
              Nesta fase atual o sistema consegue ler e processar apenas arquivos gerados internamente pelo SEI.
            </AlertBox>

            <AlertBox variant="warning" icon={<Clock />} title="Documentos PDF" className="p-4 rounded-lg">
              {"Documentos PDFs ainda n\u00e3o s\u00e3o processados e est\u00e1 no cronograma de desenvolvimento."}
            </AlertBox>

            <AlertBox variant="warning" icon={<HelpCircle />} title="Problema Conhecido" className="p-4 rounded-lg">
              {"Alguns processos com grande volume de andamentos (>500) podem apresentar lentid\u00e3o na renderiza\u00e7\u00e3o do gr\u00e1fico. Recomenda-se usar a op\u00e7\u00e3o \"Resumido\" para melhor desempenho."}
            </AlertBox>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsInfoModalOpen(false)} variant="outline">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
