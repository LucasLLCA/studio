"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/keys';
import { useToast } from '@/hooks/use-toast';
import { useOrgaos, useConfiguracaoHoras } from '@/lib/react-query/queries/useAdminQueries';
import { saveConfiguracaoHoras } from '@/lib/api/admin-api-client';
import { TASK_GROUPS } from '@/lib/task-groups';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, Save } from 'lucide-react';

const ALL_GROUPS = [
  ...TASK_GROUPS,
  { key: 'outros', label: 'Outros', tasks: [] as string[] },
];

export function HorasTab({ usuario, defaultOrgao }: { usuario: string | null; defaultOrgao: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orgaos, isLoading: orgaosLoading } = useOrgaos(usuario);
  const [selectedOrgao, setSelectedOrgao] = useState<string>('');

  // Set default orgao
  useEffect(() => {
    if (!selectedOrgao && defaultOrgao) {
      setSelectedOrgao(defaultOrgao);
    } else if (!selectedOrgao && orgaos?.length) {
      setSelectedOrgao(orgaos[0]);
    }
  }, [orgaos, defaultOrgao, selectedOrgao]);

  const { data: horasData, isLoading: horasLoading } = useConfiguracaoHoras(
    usuario,
    selectedOrgao,
  );

  // Local state for editable hours
  const [localHoras, setLocalHoras] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync from server data
  useEffect(() => {
    const map: Record<string, number> = {};
    ALL_GROUPS.forEach(g => { map[g.key] = 0; });
    horasData?.forEach(h => { map[h.grupo_key] = h.horas; });
    setLocalHoras(map);
  }, [horasData]);

  const hasChanges = useMemo(() => {
    if (!horasData) return Object.values(localHoras).some(v => v !== 0);
    const serverMap: Record<string, number> = {};
    horasData.forEach(h => { serverMap[h.grupo_key] = h.horas; });
    return ALL_GROUPS.some(g => (localHoras[g.key] ?? 0) !== (serverMap[g.key] ?? 0));
  }, [localHoras, horasData]);

  const handleSave = async () => {
    if (!usuario || !selectedOrgao) return;
    setIsSaving(true);
    const items = ALL_GROUPS.map(g => ({
      grupo_key: g.key,
      horas: localHoras[g.key] ?? 0,
    }));
    const res = await saveConfiguracaoHoras(usuario, selectedOrgao, items);
    setIsSaving(false);
    if ('error' in res) {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: 'Configuração salva' });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.configuracaoHoras(selectedOrgao) });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.configuracaoHorasPublic(selectedOrgao) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" /> Horas por Andamento
        </CardTitle>
        <CardDescription>
          Configure o coeficiente de horas para cada tipo de andamento por órgão
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Orgao selector */}
        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm font-medium">Órgão:</label>
          {orgaosLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Select value={selectedOrgao} onValueChange={setSelectedOrgao}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecione um órgão" />
              </SelectTrigger>
              <SelectContent>
                {orgaos?.map(o => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {horasLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-semibold">Grupo</th>
                    <th className="px-4 py-3 text-left font-semibold">Tarefas Incluídas</th>
                    <th className="px-4 py-3 text-right font-semibold w-40">Horas por Tarefa</th>
                  </tr>
                </thead>
                <tbody>
                  {ALL_GROUPS.map((group, idx) => (
                    <tr
                      key={group.key}
                      className={`border-b last:border-b-0 ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                    >
                      <td className="px-4 py-3 font-medium">{group.label}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-muted-foreground max-w-md truncate" title={group.tasks.join(', ')}>
                          {group.tasks.length > 0 ? group.tasks.join(', ') : 'Tarefas não classificadas'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={localHoras[group.key] ?? 0}
                          onChange={e => setLocalHoras(prev => ({
                            ...prev,
                            [group.key]: parseFloat(e.target.value) || 0,
                          }))}
                          className="w-24 text-right ml-auto h-8"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
