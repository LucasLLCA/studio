"use client";

import React from 'react';
import { LayoutDashboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface IntelligencePanelsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntelligencePanelsSidebar({ isOpen, onClose }: IntelligencePanelsSidebarProps) {
  const handleAuthorizationClick = () => {
    window.open('https://catalogodedados.inteligencia.sead.pi.gov.br/public/dashboard/66a52d9f-27db-4558-b779-111d53a4c861', '_blank', 'noopener,noreferrer');
  };

  const handleProductivityClick = () => {
    window.open('https://painel.sead.pi.gov.br', '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-96 bg-card border-r border-border shadow-lg z-50 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Painéis de Inteligência
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Panels List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            <Card
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={handleAuthorizationClick}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Acompanhamento de processos com SEAD_AUTORIZAÇÃO</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Clique para acessar o painel
                </CardDescription>
              </CardHeader>
            </Card>

            <Card
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={handleProductivityClick}
            >
              <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium">Acompanhamento de estoque de processos e produtividade</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Clique para acessar o painel
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
