"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Shield } from 'lucide-react';

import { UsuariosTab } from '@/components/admin/UsuariosTab';
import { PapeisTab } from '@/components/admin/PapeisTab';
import { HorasTab } from '@/components/admin/HorasTab';
import { RotinasTab } from '@/components/admin/RotinasTab';
import { UsoTab } from '@/components/admin/UsoTab';

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
    <div className="flex-1 flex flex-col overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 w-full max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6" /> Administração
      </h1>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários e Papéis</TabsTrigger>
          <TabsTrigger value="papeis">Papéis e Módulos</TabsTrigger>
          <TabsTrigger value="horas">Horas por Andamento</TabsTrigger>
          <TabsTrigger value="rotinas">Rotinas</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <UsoTab usuario={usuario} />
        </TabsContent>
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
