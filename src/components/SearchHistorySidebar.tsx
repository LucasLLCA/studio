"use client";

import React, { useState, useEffect } from 'react';
import { History, X, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getSearchHistory, deleteSearchHistory } from '@/lib/history-api-client';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { formatProcessNumber } from '@/lib/utils';

interface SearchHistoryItem {
  id: string;
  numero_processo: string;
  numero_processo_formatado: string;
  usuario: string;
  caixa_contexto?: string;
  criado_em: string;
  atualizado_em: string;
  deletado_em?: string | null;
}

interface SearchHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchSelect: (numeroProcesso: string) => void;
}

export function SearchHistorySidebar({ isOpen, onClose, onSearchSelect }: SearchHistorySidebarProps) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { usuario } = usePersistedAuth();

  const loadHistory = async () => {
    if (!usuario) {
      console.log('[DEBUG] Não há usuário para carregar histórico');
      return;
    }

    console.log('[DEBUG] Carregando histórico para usuário:', usuario);
    setIsLoading(true);
    try {
      const data = await getSearchHistory(usuario, 20);
      console.log('[DEBUG] Dados retornados do histórico:', data);

      if ('error' in data) {
        // Se o erro for 404 ou 500, provavelmente o usuário não tem histórico ainda
        if (data.status === 404 || data.status === 500) {
          console.log('[DEBUG] Usuário sem histórico ainda (status:', data.status, ')');
          setHistory([]);
        } else {
          console.error('[DEBUG] Erro ao carregar histórico:', data.error, 'status:', data.status);
          toast({
            title: "Erro ao carregar histórico",
            description: data.error,
            variant: "destructive"
          });
        }
      } else {
        console.log('[DEBUG] Histórico carregado com sucesso:', data.length, 'itens');
        setHistory(data);
      }
    } catch (error) {
      console.error('[DEBUG] Exceção ao carregar histórico:', error);
      setHistory([]); // Define como vazio em caso de erro
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar histórico ao abrir a sidebar
  useEffect(() => {
    if (isOpen && usuario) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, usuario]);

  const handleHistoryItemClick = (item: SearchHistoryItem) => {
    onSearchSelect(item.numero_processo);
  };

  const handleDeleteClick = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); // Previne que o clique no botão delete dispare o click do item

    try {
      const result = await deleteSearchHistory(itemId);

      if ('error' in result) {
        toast({
          title: "Erro ao excluir",
          description: result.error,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sucesso",
          description: "Processo removido do histórico",
        });
        // Recarrega o histórico
        loadHistory();
      }
    } catch (error) {
      console.error('[DEBUG] Exceção ao deletar histórico:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o processo do histórico",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
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
      <div className={`fixed left-0 top-0 h-full w-80 bg-card border-r border-border shadow-lg z-50 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
      }`}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Pesquisas
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center py-8 px-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhuma pesquisa no histórico
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="px-3 py-2 space-y-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="relative group/item"
                  >
                    <button
                      onClick={() => handleHistoryItemClick(item)}
                      className="w-full text-left px-3 py-2.5 pr-10 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="font-medium text-sm text-blue-600 dark:text-blue-400 group-hover/item:text-blue-700 dark:group-hover/item:text-blue-300">
                        {item.numero_processo_formatado || formatProcessNumber(item.numero_processo)}
                      </div>
                      {item.caixa_contexto && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                          {item.caixa_contexto}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatDate(item.criado_em)}
                      </div>
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(e, item.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </>
  );
}
