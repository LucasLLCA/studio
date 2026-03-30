"use client";

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/keys';
import { useToast } from '@/hooks/use-toast';
import { usePapeis, useModulosList } from '@/lib/react-query/queries/useAdminQueries';
import {
  createPapel,
  updatePapel,
  deletePapel,
  type PapelAdmin,
} from '@/lib/api/admin-api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
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

export function PapeisTab({ usuario }: { usuario: string | null }) {
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
                          <Badge key={m} variant="secondary" className="text-2xs px-1.5 py-0">
                            {modulosList?.[m] || m}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {p.is_default && <Badge variant="outline" className="text-2xs">Padrão</Badge>}
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
