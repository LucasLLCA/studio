"use client";

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useMemo } from 'react';
import type { UnidadeFiltro } from '@/types/process-flow';

interface HomeContentProps {
  processoNumeroInput: string;
  onProcessoNumeroChange: (value: string) => void;
  selectedUnidadeFiltro: string | undefined;
  onUnidadeFiltroChange: (value: string) => void;
  unidadesFiltroList: UnidadeFiltro[];
  unidadeSearchTerm: string;
  onUnidadeSearchTermChange: (value: string) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  onSearchClick: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function HomeContent({
  processoNumeroInput,
  onProcessoNumeroChange,
  selectedUnidadeFiltro,
  onUnidadeFiltroChange,
  unidadesFiltroList,
  unidadeSearchTerm,
  onUnidadeSearchTermChange,
  isLoading,
  isAuthenticated,
  onSearchClick,
  inputRef,
}: HomeContentProps) {
  // Filtrar unidades baseado no termo de busca
  const filteredUnidades = useMemo(() => {
    if (!unidadeSearchTerm) return unidadesFiltroList;
    return unidadesFiltroList.filter(
      (unidade) =>
        unidade.Sigla.toLowerCase().includes(unidadeSearchTerm.toLowerCase()) ||
        unidade.Descricao.toLowerCase().includes(unidadeSearchTerm.toLowerCase())
    );
  }, [unidadesFiltroList, unidadeSearchTerm]);

  const canSearch = isAuthenticated && !isLoading && processoNumeroInput && selectedUnidadeFiltro;

  return (
    <div className="flex flex-col items-center justify-center flex-1 -mt-8">
      <div className="flex flex-col items-center space-y-4">
        <Image
          src="/logo-sead.png"
          alt="Logo SEAD Piauí"
          width={500}
          height={500}
          priority
          data-ai-hint="logo government"
        />
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold" style={{ color: '#107527' }}>
            Visualizador de Processos
          </h1>
          <span className="text-sm font-semibold text-blue-500 bg-blue-100 px-3 py-1 rounded-full">
            Beta
          </span>
        </div>
        <p className="text-muted-foreground text-center max-w-md mt-4">
          Para iniciar, selecione a unidade, insira o número do processo e clique em "Pesquisar".
        </p>

        {/* Campo de busca centralizado */}
        <div className="w-full max-w-2xl mt-8 space-y-4">
          <div className="relative">
            <Input
              type="text"
              placeholder="Digite o número do processo..."
              className="h-14 text-lg w-full pr-16 rounded-full border-2 border-gray-300 focus:border-green-500 shadow-lg"
              value={processoNumeroInput}
              onChange={(e) => onProcessoNumeroChange(e.target.value)}
              disabled={isLoading || !isAuthenticated}
              ref={inputRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSearch) {
                  onSearchClick();
                }
              }}
            />
            <Button
              onClick={onSearchClick}
              disabled={!canSearch}
              className="absolute right-2 top-2 h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 text-white p-0"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Seletor de unidade */}
          <div className="w-full">
            <Select
              value={selectedUnidadeFiltro || ''}
              onValueChange={onUnidadeFiltroChange}
              disabled={isLoading || !isAuthenticated || unidadesFiltroList.length === 0}
            >
              <SelectTrigger className="h-12 text-lg w-full rounded-full border-2 border-gray-300 focus:border-green-500 shadow-lg">
                <SelectValue
                  placeholder={
                    isAuthenticated
                      ? unidadesFiltroList.length > 0
                        ? 'Selecione uma unidade...'
                        : 'Nenhuma unidade'
                      : 'Login para unidades'
                  }
                />
              </SelectTrigger>
              <SelectContent
                side="bottom"
                align="start"
                sideOffset={4}
                className="max-h-60"
                position="popper"
              >
                <div className="px-2 py-2 border-b">
                  <Input
                    placeholder="Buscar por sigla..."
                    className="h-8 text-sm"
                    value={unidadeSearchTerm}
                    onChange={(e) => onUnidadeSearchTermChange(e.target.value)}
                  />
                </div>
                {filteredUnidades.length === 0 ? (
                  <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                    Nenhuma unidade encontrada
                  </div>
                ) : (
                  filteredUnidades.map((unidade) => (
                    <SelectItem key={unidade.Id} value={unidade.Id}>
                      {unidade.Sigla} - {unidade.Descricao}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
