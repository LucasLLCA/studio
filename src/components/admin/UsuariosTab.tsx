"use client";

import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/keys';
import { useToast } from '@/hooks/use-toast';
import { useUsuarios, usePapeis } from '@/lib/react-query/queries/useAdminQueries';
import { assignUsuarioPapel } from '@/lib/api/admin-api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function UsuariosTab({ usuario }: { usuario: string | null }) {
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
