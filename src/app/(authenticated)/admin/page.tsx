"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useUsuarios, useConfiguracaoHoras, useOrgaos } from '@/lib/react-query/queries/useAdminQueries';
import { updateUsuarioPapel, saveConfiguracaoHoras } from '@/lib/api/admin-api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/keys';
import { TASK_GROUPS } from '@/lib/task-groups';
import { useToast } from '@/hooks/use-toast';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Shield, Clock, Save, RefreshCw, BarChart3, CheckCircle2, XCircle, Clock4, Play, Cog } from 'lucide-react';
import { useBiTasks } from '@/lib/react-query/queries/useBiQueries';
import { refreshEstoque } from '@/lib/api/bi-api-client';
import { Badge } from '@/components/ui/badge';

const ALL_GROUPS = [
  ...TASK_GROUPS,
  { key: 'outros', label: 'Outros', tasks: [] as string[] },
];

export default function AdminPage() {
  const router = useRouter();
  const { papelGlobal, idPessoa, orgao: userOrgao } = usePersistedAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Guard: redirect non-admin users
  useEffect(() => {
    if (mounted && papelGlobal !== 'admin') {
      router.push('/home');
    }
  }, [mounted, papelGlobal, router]);

  if (!mounted || papelGlobal !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-8 py-6 w-full max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6" /> Administração
      </h1>
      <Tabs defaultValue="usuarios" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="usuarios">Usuários e Papéis</TabsTrigger>
          <TabsTrigger value="horas">Horas por Andamento</TabsTrigger>
          <TabsTrigger value="rotinas">Rotinas</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios">
          <UsuariosTab idPessoa={idPessoa} />
        </TabsContent>
        <TabsContent value="horas">
          <HorasTab idPessoa={idPessoa} defaultOrgao={userOrgao} />
        </TabsContent>
        <TabsContent value="rotinas">
          <RotinasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --------------- Usuários Tab ---------------

function UsuariosTab({ idPessoa }: { idPessoa: number | null }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: usuarios, isLoading } = useUsuarios(idPessoa, debouncedSearch);

  const handleRoleChange = async (targetIdPessoa: number, newRole: string) => {
    if (!idPessoa) return;
    const res = await updateUsuarioPapel(idPessoa, targetIdPessoa, newRole);
    if ('error' in res) {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: 'Papel atualizado' });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.usuarios() });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários e Papéis</CardTitle>
        <CardDescription>Gerencie os papéis globais dos usuários do sistema</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por login ou órgão..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold">Usuário</th>
                  <th className="px-4 py-3 text-left font-semibold">Órgão</th>
                  <th className="px-4 py-3 text-left font-semibold">Papel</th>
                </tr>
              </thead>
              <tbody>
                {(!usuarios || usuarios.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
                {usuarios?.map((u) => (
                  <tr key={u.id_pessoa} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.usuario_sei}</div>
                      <div className="text-xs text-muted-foreground">ID: {u.id_pessoa}</div>
                    </td>
                    <td className="px-4 py-3">{u.orgao}</td>
                    <td className="px-4 py-3 w-40">
                      <Select
                        value={u.papel_global}
                        onValueChange={(v) => handleRoleChange(u.id_pessoa, v)}
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="beta">Beta</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --------------- Horas Tab ---------------

function HorasTab({ idPessoa, defaultOrgao }: { idPessoa: number | null; defaultOrgao: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orgaos, isLoading: orgaosLoading } = useOrgaos(idPessoa);
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
    idPessoa,
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
    if (!idPessoa || !selectedOrgao) return;
    setIsSaving(true);
    const items = ALL_GROUPS.map(g => ({
      grupo_key: g.key,
      horas: localHoras[g.key] ?? 0,
    }));
    const res = await saveConfiguracaoHoras(idPessoa, selectedOrgao, items);
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

// --------------- Rotinas Tab ---------------

interface RotinaDefinition {
  key: string;
  name: string;
  description: string;
  schedule: string;
  category: 'BI' | 'Sistema';
  taskName: string; // matches task_name in bi_task_history
  onTrigger: () => Promise<{ task_id: string } | { error: string }>;
}

const ROTINAS: RotinaDefinition[] = [
  {
    key: 'estoque-processos',
    name: 'Estoque de Processos',
    description: 'Calcula o estoque de processos abertos por unidade a partir dos andamentos no banco D-1.',
    schedule: 'A cada 6 horas',
    category: 'BI',
    taskName: 'compute_estoque',
    onTrigger: refreshEstoque,
  },
];

function RotinasTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useBiTasks();
  const [triggeringKey, setTriggeringKey] = useState<string | null>(null);

  const handleTrigger = async (rotina: RotinaDefinition) => {
    setTriggeringKey(rotina.key);
    const result = await rotina.onTrigger();
    if ('error' in result) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: `${rotina.name} iniciada` });
      queryClient.invalidateQueries({ queryKey: queryKeys.bi.tasks });
    }
    setTriggeringKey(null);
  };

  // Derive per-rotina status from task history
  const rotinaStatus = (rotina: RotinaDefinition) => {
    if (!tasks) return { lastRun: null, isRunning: false, lastStatus: null as string | null, lastDuration: null as number | null, lastResult: null as { total_processos: number; total_abertos: number } | null, lastError: null as string | null };
    const matching = tasks.filter(t => t.task_name === rotina.taskName);
    const running = matching.find(t => t.status === 'STARTED');
    const lastFinished = matching.find(t => t.status === 'SUCCESS' || t.status === 'FAILURE');
    const last = running ?? lastFinished ?? matching[0];
    return {
      lastRun: last?.started_at ? new Date(last.started_at) : null,
      isRunning: !!running,
      lastStatus: lastFinished?.status ?? null,
      lastDuration: lastFinished?.duration_s ?? null,
      lastResult: lastFinished?.result_summary ?? null,
      lastError: lastFinished?.error_message ?? null,
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="h-5 w-5" /> Rotinas
        </CardTitle>
        <CardDescription>
          Rotinas agendadas de pré-computação e manutenção do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {ROTINAS.map(rotina => {
              const status = rotinaStatus(rotina);
              const isTriggering = triggeringKey === rotina.key;

              return (
                <div key={rotina.key} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{rotina.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {rotina.category}
                        </Badge>
                        {status.isRunning && (
                          <Badge variant="secondary" className="gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Executando
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rotina.description}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock4 className="h-3 w-3" />
                          {rotina.schedule}
                        </span>
                        {status.lastRun && (
                          <span className="flex items-center gap-1">
                            {status.lastStatus === 'SUCCESS' ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : status.lastStatus === 'FAILURE' ? (
                              <XCircle className="h-3 w-3 text-red-500" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            Última: {status.lastRun.toLocaleString('pt-BR')}
                            {status.lastDuration != null && (
                              <span>({status.lastDuration.toFixed(1)}s)</span>
                            )}
                          </span>
                        )}
                        {status.lastResult && (
                          <span>
                            {status.lastResult.total_processos} processos, {status.lastResult.total_abertos} abertos
                          </span>
                        )}
                        {status.lastError && (
                          <span className="text-red-500 truncate max-w-[300px]" title={status.lastError}>
                            Erro: {status.lastError}
                          </span>
                        )}
                        {!status.lastRun && (
                          <span className="italic">Nunca executada</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTrigger(rotina)}
                      disabled={isTriggering || status.isRunning}
                      className="shrink-0"
                    >
                      {isTriggering ? (
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-1.5" />
                      )}
                      Executar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
