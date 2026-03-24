"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { useUsuarios, useConfiguracaoHoras, useOrgaos, usePapeis, useModulosList } from '@/lib/react-query/queries/useAdminQueries';
import {
  saveConfiguracaoHoras,
  assignUsuarioPapel,
  createPapel,
  updatePapel,
  deletePapel,
  type PapelAdmin,
} from '@/lib/api/admin-api-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/keys';
import { TASK_GROUPS } from '@/lib/task-groups';
import { useToast } from '@/hooks/use-toast';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Shield, Clock, Save, RefreshCw, BarChart3, CheckCircle2, XCircle, Clock4, Play, Cog, Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import { useBiTasks, useRotinas } from '@/lib/react-query/queries/useBiQueries';
import { triggerRotina } from '@/lib/api/bi-api-client';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const ALL_GROUPS = [
  ...TASK_GROUPS,
  { key: 'outros', label: 'Outros', tasks: [] as string[] },
];

export default function AdminPage() {
  const router = useRouter();
  const { usuario, orgao: userOrgao } = usePersistedAuth();
  const { hasModulo, isLoading: permissionsLoading } = usePermissions();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Guard: redirect non-admin users
  useEffect(() => {
    if (mounted && !permissionsLoading && !hasModulo('admin')) {
      router.push('/home');
    }
  }, [mounted, permissionsLoading, hasModulo, router]);

  if (!mounted || permissionsLoading || !hasModulo('admin')) {
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
          <TabsTrigger value="papeis">Papéis e Módulos</TabsTrigger>
          <TabsTrigger value="horas">Horas por Andamento</TabsTrigger>
          <TabsTrigger value="rotinas">Rotinas</TabsTrigger>
        </TabsList>
        <TabsContent value="usuarios">
          <UsuariosTab usuario={usuario} />
        </TabsContent>
        <TabsContent value="papeis">
          <PapeisTab usuario={usuario} />
        </TabsContent>
        <TabsContent value="horas">
          <HorasTab usuario={usuario} defaultOrgao={userOrgao} />
        </TabsContent>
        <TabsContent value="rotinas">
          <RotinasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --------------- Usuários Tab (RBAC-based) ---------------

function UsuariosTab({ usuario }: { usuario: string | null }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useUsuarios(usuario, debouncedSearch, page, pageSize);
  const { data: papeis } = usePapeis(usuario);

  const usuarios = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleRoleChange = async (usuarioSei: string, papelId: string) => {
    if (!usuario) return;
    const res = await assignUsuarioPapel(usuario, { usuario_sei: usuarioSei, papel_id: papelId });
    if ('error' in res) {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: 'Papel atualizado' });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.usuarios() });
      queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuários e Papéis</CardTitle>
        <CardDescription>Atribua papéis aos usuários do sistema. O papel é compartilhado por email SEI.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou órgão..."
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
          <>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-semibold">Email SEI</th>
                    <th className="px-4 py-3 text-left font-semibold">Órgão</th>
                    <th className="px-4 py-3 text-left font-semibold">Papel</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                        Nenhum usuário encontrado.
                      </td>
                    </tr>
                  )}
                  {usuarios.map((u) => (
                    <tr key={u.usuario_sei} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">{u.usuario_sei}</td>
                      <td className="px-4 py-3">{u.orgao}</td>
                      <td className="px-4 py-3 w-48">
                        {papeis && papeis.length > 0 ? (
                          <Select
                            value={u.papel_id ?? ''}
                            onValueChange={(v) => handleRoleChange(u.usuario_sei, v)}
                          >
                            <SelectTrigger className="h-8 w-40">
                              <SelectValue placeholder={u.papel_nome || 'Sem papel'} />
                            </SelectTrigger>
                            <SelectContent>
                              {papeis.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">{u.papel_nome || 'Sem papel'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-muted-foreground">
                  {total} usuário{total !== 1 ? 's' : ''} — página {page} de {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// --------------- Papéis Tab ---------------

function PapeisTab({ usuario }: { usuario: string | null }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: papeis, isLoading } = usePapeis(usuario);
  const { data: modulosList } = useModulosList(usuario);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPapel, setEditingPapel] = useState<PapelAdmin | null>(null);
  const [formNome, setFormNome] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formModulos, setFormModulos] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const openCreate = () => {
    setEditingPapel(null);
    setFormNome('');
    setFormSlug('');
    setFormDescricao('');
    setFormModulos([]);
    setDialogOpen(true);
  };

  const openEdit = (papel: PapelAdmin) => {
    setEditingPapel(papel);
    setFormNome(papel.nome);
    setFormSlug(papel.slug);
    setFormDescricao(papel.descricao || '');
    setFormModulos([...papel.modulos]);
    setDialogOpen(true);
  };

  const toggleModulo = (key: string) => {
    setFormModulos(prev =>
      prev.includes(key) ? prev.filter(m => m !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (!usuario) return;
    setIsSaving(true);

    if (editingPapel) {
      const res = await updatePapel(usuario, editingPapel.id, {
        nome: formNome,
        descricao: formDescricao,
        modulos: formModulos,
      });
      if ('error' in res) {
        toast({ title: 'Erro', description: res.error, variant: 'destructive' });
      } else {
        toast({ title: 'Papel atualizado' });
        setDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.papeis });
        queryClient.invalidateQueries({ queryKey: queryKeys.permissions.all });
      }
    } else {
      if (!formSlug.trim()) {
        toast({ title: 'Erro', description: 'Slug é obrigatório', variant: 'destructive' });
        setIsSaving(false);
        return;
      }
      const res = await createPapel(usuario, {
        nome: formNome,
        slug: formSlug,
        descricao: formDescricao || undefined,
        modulos: formModulos,
      });
      if ('error' in res) {
        toast({ title: 'Erro', description: res.error, variant: 'destructive' });
      } else {
        toast({ title: 'Papel criado' });
        setDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.papeis });
      }
    }
    setIsSaving(false);
  };

  const handleDelete = async (papel: PapelAdmin) => {
    if (!usuario) return;
    const res = await deletePapel(usuario, papel.id);
    if ('error' in res) {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' });
    } else {
      toast({ title: 'Papel removido' });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.papeis });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Papéis e Módulos
            </CardTitle>
            <CardDescription>
              Crie e gerencie papéis com permissões de acesso aos módulos do sistema
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Papel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-semibold">Nome</th>
                  <th className="px-4 py-3 text-left font-semibold">Slug</th>
                  <th className="px-4 py-3 text-left font-semibold">Módulos</th>
                  <th className="px-4 py-3 text-left font-semibold w-20">Padrão</th>
                  <th className="px-4 py-3 text-right font-semibold w-24">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(!papeis || papeis.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      Nenhum papel cadastrado.
                    </td>
                  </tr>
                )}
                {papeis?.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.nome}</div>
                      {p.descricao && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.descricao}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{p.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.modulos.map(m => (
                          <Badge key={m} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {modulosList?.[m] || m}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.is_default && <Badge variant="outline" className="text-[10px]">Padrão</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)} title="Editar">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {!p.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p)}
                            title="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPapel ? 'Editar Papel' : 'Novo Papel'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="papel-nome">Nome</Label>
              <Input
                id="papel-nome"
                value={formNome}
                onChange={e => setFormNome(e.target.value)}
                placeholder="Ex: Gestor"
              />
            </div>
            {!editingPapel && (
              <div className="space-y-2">
                <Label htmlFor="papel-slug">Slug (identificador único)</Label>
                <Input
                  id="papel-slug"
                  value={formSlug}
                  onChange={e => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="Ex: gestor"
                  className="font-mono"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="papel-descricao">Descrição</Label>
              <Textarea
                id="papel-descricao"
                value={formDescricao}
                onChange={e => setFormDescricao(e.target.value)}
                placeholder="Descrição opcional do papel"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Módulos Permitidos</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-lg p-3">
                {modulosList && Object.entries(modulosList).map(([key, label]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`modulo-${key}`}
                      checked={formModulos.includes(key)}
                      onCheckedChange={() => toggleModulo(key)}
                    />
                    <label
                      htmlFor={`modulo-${key}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving || !formNome.trim()}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPapel ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// --------------- Horas Tab ---------------

function HorasTab({ usuario, defaultOrgao }: { usuario: string | null; defaultOrgao: string | null }) {
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

// --------------- Rotinas Tab (auto-discovery from backend) ---------------

function RotinasTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: rotinas, isLoading: rotinasLoading } = useRotinas();
  const { data: tasks, isLoading: tasksLoading } = useBiTasks();
  const [triggeringKey, setTriggeringKey] = useState<string | null>(null);

  const isLoading = rotinasLoading || tasksLoading;

  const handleTrigger = async (rotina: { key: string; name: string; refresh_endpoint: string }) => {
    setTriggeringKey(rotina.key);
    const result = await triggerRotina(rotina.refresh_endpoint);
    if ('error' in result) {
      toast({ title: 'Erro', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: `${rotina.name} iniciada` });
      queryClient.invalidateQueries({ queryKey: queryKeys.bi.tasks });
    }
    setTriggeringKey(null);
  };

  const rotinaStatus = (taskName: string) => {
    if (!tasks) return { lastRun: null, isRunning: false, lastStatus: null as string | null, lastDuration: null as number | null, lastResult: null as Record<string, unknown> | null, lastError: null as string | null };
    const matching = tasks.filter(t => t.task_name === taskName);
    const running = matching.find(t => t.status === 'STARTED');
    const lastFinished = matching.find(t => t.status === 'SUCCESS' || t.status === 'FAILURE');
    const last = running ?? lastFinished ?? matching[0];
    return {
      lastRun: last?.started_at ? new Date(last.started_at) : null,
      isRunning: !!running,
      lastStatus: lastFinished?.status ?? null,
      lastDuration: lastFinished?.duration_s ?? null,
      lastResult: (lastFinished?.result_summary as Record<string, unknown>) ?? null,
      lastError: lastFinished?.error_message ?? null,
    };
  };

  const formatResultSummary = (result: Record<string, unknown> | null) => {
    if (!result) return null;
    return Object.entries(result)
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
      .join(', ');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="h-5 w-5" /> Rotinas
        </CardTitle>
        <CardDescription>
          Rotinas agendadas de pré-computação e manutenção do sistema (descoberta automática)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !rotinas?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma rotina registrada no backend.
          </p>
        ) : (
          <div className="space-y-3">
            {rotinas.map(rotina => {
              const status = rotinaStatus(rotina.task_name);
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
                          <span>{formatResultSummary(status.lastResult)}</span>
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
