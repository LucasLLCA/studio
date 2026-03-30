"use client";

import React, { useState } from "react";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { EstoqueUnidadesOptions } from "@/types/bi";

export interface EstoqueFilterValues {
  unidade_origem?: string;
  unidade_passagem?: string;
  unidade_aberta?: string;
  orgao_origem?: string;
  orgao_passagem?: string;
  orgao_aberta?: string;
}

interface EstoqueFiltersProps {
  filters: EstoqueFilterValues;
  onChange: (filters: EstoqueFilterValues) => void;
  unidadesOptions?: EstoqueUnidadesOptions;
  isLoading?: boolean;
}

const PLACEHOLDER_ALL = "__all__";

export function EstoqueFilters({
  filters,
  onChange,
  unidadesOptions,
  isLoading,
}: EstoqueFiltersProps) {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const hasFilters =
    filters.unidade_origem ||
    filters.unidade_passagem ||
    filters.unidade_aberta ||
    filters.orgao_origem ||
    filters.orgao_passagem ||
    filters.orgao_aberta;

  const activeFilterCount = [
    filters.unidade_origem,
    filters.unidade_passagem,
    filters.unidade_aberta,
    filters.orgao_origem,
    filters.orgao_passagem,
    filters.orgao_aberta,
  ].filter(Boolean).length;

  const handleChange = (key: keyof EstoqueFilterValues, value: string) => {
    const next = { ...filters, [key]: value === PLACEHOLDER_ALL ? undefined : value };

    // When orgao is selected, clear the corresponding unidade (they're mutually exclusive)
    if (key === "orgao_origem") next.unidade_origem = undefined;
    if (key === "orgao_passagem") next.unidade_passagem = undefined;
    // When unidade is selected, clear the corresponding orgao
    if (key === "unidade_origem") next.orgao_origem = undefined;
    if (key === "unidade_passagem") next.orgao_passagem = undefined;
    if (key === "orgao_aberta") next.unidade_aberta = undefined;
    if (key === "unidade_aberta") next.orgao_aberta = undefined;

    onChange(next);
  };

  const clearFilters = () => {
    onChange({});
  };

  // Filter unidade lists by selected orgao
  const filteredUnidadesOrigem = filters.orgao_origem
    ? unidadesOptions?.unidades_origem?.filter(
        (u) => u.startsWith(filters.orgao_origem + "-") || u === filters.orgao_origem
      )
    : unidadesOptions?.unidades_origem;

  const filteredUnidadesPassagem = filters.orgao_passagem
    ? unidadesOptions?.unidades_passagem?.filter(
        (u) => u.startsWith(filters.orgao_passagem + "-") || u === filters.orgao_passagem
      )
    : unidadesOptions?.unidades_passagem;

  const filteredUnidadesAbertas = filters.orgao_aberta
    ? unidadesOptions?.unidades_abertas?.filter(
        (u) => u.startsWith(filters.orgao_aberta + "-") || u === filters.orgao_aberta
      )
    : unidadesOptions?.unidades_abertas;

  // Top 5 orgaos for quick filter chips
  const topOrgaos = (unidadesOptions?.orgaos_abertas ?? []).slice(0, 5);

  const chipRow = topOrgaos.length > 0 && (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 min-w-0">
      <span className="text-xs text-muted-foreground font-medium shrink-0">Orgaos:</span>
      {topOrgaos.map((orgao) => {
        const isActive = filters.orgao_aberta === orgao;
        return (
          <Badge
            key={orgao}
            variant={isActive ? "default" : "outline"}
            className={`cursor-pointer text-xs transition-colors shrink-0 ${
              isActive ? "" : "hover:bg-secondary"
            }`}
            onClick={() => {
              if (isActive) {
                onChange({ ...filters, orgao_aberta: undefined });
              } else {
                onChange({ ...filters, orgao_aberta: orgao, unidade_aberta: undefined });
              }
            }}
          >
            {orgao}
          </Badge>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* ===================== DESKTOP ===================== */}
      <div className="hidden lg:block space-y-3">
        {chipRow}

        {/* Filter selects */}
        <div className="flex flex-wrap items-end gap-3 min-w-0">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
            <Filter className="h-4 w-4" />
            <span className="font-medium">Origem:</span>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-xs text-muted-foreground">Orgao</label>
            <Select
              value={filters.orgao_origem || PLACEHOLDER_ALL}
              onValueChange={(v) => handleChange("orgao_origem", v)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[140px] sm:w-[160px] h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLACEHOLDER_ALL}>Todos</SelectItem>
                {unidadesOptions?.orgaos_origem?.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-xs text-muted-foreground">Unidade</label>
            <Select
              value={filters.unidade_origem || PLACEHOLDER_ALL}
              onValueChange={(v) => handleChange("unidade_origem", v)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[160px] sm:w-[200px] h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLACEHOLDER_ALL}>Todas</SelectItem>
                {filteredUnidadesOrigem?.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
            <span className="font-medium">Passagem:</span>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-xs text-muted-foreground">Orgao</label>
            <Select
              value={filters.orgao_passagem || PLACEHOLDER_ALL}
              onValueChange={(v) => handleChange("orgao_passagem", v)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[140px] sm:w-[160px] h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLACEHOLDER_ALL}>Todos</SelectItem>
                {unidadesOptions?.orgaos_passagem?.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-xs text-muted-foreground">Unidade</label>
            <Select
              value={filters.unidade_passagem || PLACEHOLDER_ALL}
              onValueChange={(v) => handleChange("unidade_passagem", v)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[160px] sm:w-[200px] h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLACEHOLDER_ALL}>Todas</SelectItem>
                {filteredUnidadesPassagem?.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-px h-6 bg-border mx-1" />

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
            <span className="font-medium">Em Aberto:</span>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-xs text-muted-foreground">Orgao</label>
            <Select
              value={filters.orgao_aberta || PLACEHOLDER_ALL}
              onValueChange={(v) => handleChange("orgao_aberta", v)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[140px] sm:w-[160px] h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLACEHOLDER_ALL}>Todos</SelectItem>
                {unidadesOptions?.orgaos_abertas?.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-xs text-muted-foreground">Unidade</label>
            <Select
              value={filters.unidade_aberta || PLACEHOLDER_ALL}
              onValueChange={(v) => handleChange("unidade_aberta", v)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[160px] sm:w-[200px] h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLACEHOLDER_ALL}>Todas</SelectItem>
                {filteredUnidadesAbertas?.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs text-muted-foreground shrink-0"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* ===================== MOBILE ===================== */}
      <div className="flex lg:hidden items-center gap-2">
        {/* Quick chips - scrollable */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 min-w-0 flex-1">
          {topOrgaos.map((orgao) => {
            const isActive = filters.orgao_aberta === orgao;
            return (
              <Badge
                key={orgao}
                variant={isActive ? "default" : "outline"}
                className={`cursor-pointer text-xs transition-colors shrink-0 ${
                  isActive ? "" : "hover:bg-secondary"
                }`}
                onClick={() => {
                  if (isActive) {
                    onChange({ ...filters, orgao_aberta: undefined });
                  } else {
                    onChange({ ...filters, orgao_aberta: orgao, unidade_aberta: undefined });
                  }
                }}
              >
                {orgao}
              </Badge>
            );
          })}
        </div>

        {/* Filter drawer trigger */}
        <Drawer open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 rounded-xl shrink-0">
              <Filter className="h-4 w-4" />
              <span className="ml-1.5 text-sm">Filtros</span>
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-2xs rounded-full">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DrawerTrigger>

          <DrawerContent className="rounded-t-3xl">
            <div className="mx-auto w-full max-w-md">
              <DrawerHeader className="text-center pb-2">
                <DrawerTitle className="text-lg font-semibold">
                  Filtros de Estoque
                </DrawerTitle>
              </DrawerHeader>

              <div className="px-4 pb-4 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Origem */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary">Origem</p>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground">Orgao</label>
                    <Select
                      value={filters.orgao_origem || PLACEHOLDER_ALL}
                      onValueChange={(v) => handleChange("orgao_origem", v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full h-12 rounded-xl text-sm">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PLACEHOLDER_ALL}>Todos</SelectItem>
                        {unidadesOptions?.orgaos_origem?.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground">Unidade</label>
                    <Select
                      value={filters.unidade_origem || PLACEHOLDER_ALL}
                      onValueChange={(v) => handleChange("unidade_origem", v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full h-12 rounded-xl text-sm">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PLACEHOLDER_ALL}>Todas</SelectItem>
                        {filteredUnidadesOrigem?.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Passagem */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary">Passagem</p>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground">Orgao</label>
                    <Select
                      value={filters.orgao_passagem || PLACEHOLDER_ALL}
                      onValueChange={(v) => handleChange("orgao_passagem", v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full h-12 rounded-xl text-sm">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PLACEHOLDER_ALL}>Todos</SelectItem>
                        {unidadesOptions?.orgaos_passagem?.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground">Unidade</label>
                    <Select
                      value={filters.unidade_passagem || PLACEHOLDER_ALL}
                      onValueChange={(v) => handleChange("unidade_passagem", v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full h-12 rounded-xl text-sm">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PLACEHOLDER_ALL}>Todas</SelectItem>
                        {filteredUnidadesPassagem?.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Em Aberto */}
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-primary">Em Aberto</p>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground">Orgao</label>
                    <Select
                      value={filters.orgao_aberta || PLACEHOLDER_ALL}
                      onValueChange={(v) => handleChange("orgao_aberta", v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full h-12 rounded-xl text-sm">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PLACEHOLDER_ALL}>Todos</SelectItem>
                        {unidadesOptions?.orgaos_abertas?.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs text-muted-foreground">Unidade</label>
                    <Select
                      value={filters.unidade_aberta || PLACEHOLDER_ALL}
                      onValueChange={(v) => handleChange("unidade_aberta", v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-full h-12 rounded-xl text-sm">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PLACEHOLDER_ALL}>Todas</SelectItem>
                        {filteredUnidadesAbertas?.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Limpar Filtros */}
                {hasFilters && (
                  <Button
                    variant="ghost"
                    className="w-full justify-center rounded-xl h-12 text-muted-foreground"
                    onClick={() => { clearFilters(); setIsMobileFilterOpen(false); }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar Filtros
                  </Button>
                )}
              </div>

              <div className="p-4">
                <DrawerClose asChild>
                  <Button variant="outline" className="w-full rounded-xl h-11">
                    Fechar
                  </Button>
                </DrawerClose>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
