"use client";

import React from "react";
import { ChevronRight, FolderOpen } from "lucide-react";
import {
  appTabsListClass,
  appTabsTriggerClass,
  appTabsPanelClass,
} from "@/components/ui/app-tabs";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  
} from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { HistoryItem } from "@/lib/history-api-client";
import { MeuEspacoContent } from "@/components/home/MeuEspacoContent";
import { CompartilhadosContent } from "@/components/home/CompartilhadosContent";
import { HistoricoContent } from "@/components/home/HistoricoContent";

interface HomeMobileDrawerProps {
  history: HistoryItem[];
  isHistoryLoading: boolean;
  contextoMap: Record<string, string>;
  usuario?: string | null;
  onItemClick: (item: HistoryItem) => void;
  onSave: (item: HistoryItem) => void;
  onShare: (item: HistoryItem) => void;
  onDelete: (item: HistoryItem) => Promise<void> | void;
  onShareTag: (tagId: string) => void;
}

export function HomeMobileDrawer({
  history,
  isHistoryLoading,
  contextoMap,
  usuario,
  onItemClick,
  onSave,
  onShare,
  onDelete,
  onShareTag,
}: HomeMobileDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="
            flex w-full items-center justify-between
            rounded-xl border border-slate-200 bg-white
            px-4 py-4 text-left
            shadow-sm
            transition-all duration-150
            hover:bg-slate-50
            active:scale-[0.98]
            ">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderOpen className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Acesso rápido
              </p>
              <p className="text-sm text-slate-500">
                Histórico, meu espaço e compartilhados
              </p>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      </DrawerTrigger>

      <DrawerContent className="max-h-[85vh] rounded-t-2xl">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-left text-base font-semibold">
            Meus acessos
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-6">
          <Tabs defaultValue="historico" className="w-full">
            <div className="mb-4">
              <TabsList className={`${appTabsListClass} grid-cols-3`}>
                <TabsTrigger
                  value="historico"
                  className={appTabsTriggerClass}
                >
                  Últimas pesquisas
                </TabsTrigger>

                <TabsTrigger
                  value="espaco"
                  className={appTabsTriggerClass}
                >
                  Meu Espaço
                </TabsTrigger>

                <TabsTrigger
                  value="compartilhados"
                  className={appTabsTriggerClass}
                >
                  Compartilhados
                </TabsTrigger>
              </TabsList>
            </div>

            <div className={appTabsPanelClass}>
              <TabsContent value="historico" className="mt-0">
                <HistoricoContent
                  history={history}
                  isLoading={isHistoryLoading}
                  contextoMap={contextoMap}
                  onItemClick={onItemClick}
                  onSave={onSave}
                  onShare={onShare}
                  onDelete={onDelete}
                />
              </TabsContent>

              <TabsContent value="espaco" className="mt-0">
                {usuario ? (
                  <MeuEspacoContent
                    usuario={usuario}
                    onShareTag={onShareTag}
                    contextoMap={contextoMap}
                  />
                ) : (
                  <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
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
                  <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                    Carregando...
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}