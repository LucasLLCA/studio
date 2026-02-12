"use client";

import React, { useState } from 'react';
import { LogOut, Activity, Newspaper, Info, HelpCircle, Home as HomeIcon, Clock } from 'lucide-react';
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
              <Button variant="ghost" className="inline-flex items-center px-3 py-1 text-xl font-bold text-[#4885ed] mr-1 hover:bg-transparent hover:text-[#3a6fd4]" onClick={() => router.push('/')}>
                Visualizador de Processos
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={() => router.push('/')} title={"P\u00e1gina Inicial"}>
              <HomeIcon className="mr-2 h-4 w-4" />
              {"In\u00edcio"}
            </Button>
            <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={() => setIsInfoModalOpen(true)} title={"Informa\u00e7\u00f5es do Sistema"}>
              <Newspaper className="h-4 w-4" />
              {"Not\u00edcias"}
            </Button>
            <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={() => setIsApiStatusModalOpen(true)} title="Status das APIs">
              <Activity className="h-4 w-4" />
              {"Sa\u00fade das APIs"}
            </Button>
            {mounted && isAuthenticated && (
              <Button className="bg-transparent border-0" variant="outline" size="sm" onClick={handleLogout}> <LogOut className="mr-2 h-4 w-4" /> Sair </Button>
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
            <DialogTitle className="flex items-center text-blue-600">
              <Newspaper className="mr-2 h-5 w-5" />
              {"Informa\u00e7\u00f5es do Sistema"}
            </DialogTitle>
            <DialogDescription>
              {"Informa\u00e7\u00f5es importantes sobre funcionalidades e limita\u00e7\u00f5es atuais"}
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
                    {"Documentos PDFs ainda n\u00e3o s\u00e3o processados e est\u00e1 no cronograma de desenvolvimento."}
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
                    {"Alguns processos com grande volume de andamentos (>500) podem apresentar lentid\u00e3o na renderiza\u00e7\u00e3o do gr\u00e1fico. Recomenda-se usar a op\u00e7\u00e3o \"Resumido\" para melhor desempenho."}
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
    </>
  );
}
