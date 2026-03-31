"use client";

import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Users,
  LogIn,
  Eye,
  Activity,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import {
  useResumoAnalitico,
  useLoginsOverTime,
  useUsuariosAtivos,
  useProcessosVisualizados,
  useAcoesPorTipo,
} from '@/lib/react-query/queries/useAdminQueries';
import { formatProcessNumber } from '@/lib/utils';

const PERIODO_OPTIONS = [
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '365d', label: '1 ano' },
];

const TIPO_LABELS: Record<string, string> = {
  login: 'Login',
  visualizar_processo: 'Visualizar Processo',
  pesquisar_processo: 'Pesquisar',
  visualizar_documento: 'Documentos',
  gerar_resumo: 'Resumo IA',
  criar_observacao: 'Observacoes',
  fluxo: 'Fluxos',
  compartilhar: 'Compartilhar',
  equipe: 'Equipes',
  tag: 'Tags',
  admin_action: 'Admin',
  consulta_d1: 'Consulta D-1',
  outro: 'Outro',
};

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--info))',
  'hsl(var(--destructive))',
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function UsoTab({ usuario }: { usuario: string | null }) {
  const [periodo, setPeriodo] = useState('30d');
  const [selectedUsuario, setSelectedUsuario] = useState<string | null>(null);
  const [usuariosPage, setUsuariosPage] = useState(1);
  const [processosPage, setProcessosPage] = useState(1);
  const [usuariosSearch, setUsuariosSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(usuariosSearch);
      setUsuariosPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [usuariosSearch]);

  // Reset pages when period changes
  useEffect(() => {
    setUsuariosPage(1);
    setProcessosPage(1);
  }, [periodo]);

  const { data: resumo, isLoading: resumoLoading } = useResumoAnalitico(usuario, periodo);
  const { data: logins, isLoading: loginsLoading } = useLoginsOverTime(usuario, periodo);
  const { data: usuarios, isLoading: usuariosLoading } = useUsuariosAtivos(usuario, periodo, debouncedSearch, usuariosPage, pageSize);
  const { data: processos, isLoading: processosLoading } = useProcessosVisualizados(usuario, periodo, selectedUsuario ?? undefined, processosPage, pageSize);
  const { data: acoes, isLoading: acoesLoading } = useAcoesPorTipo(usuario, periodo, selectedUsuario ?? undefined);

  const isInitialLoading = resumoLoading && loginsLoading;

  const loginChartData = logins?.items.map(item => ({
    data: new Date(item.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    unicos: item.logins_unicos,
    total: item.total_logins,
  })) ?? [];

  const acoesChartData = acoes?.items.map(item => ({
    tipo: TIPO_LABELS[item.tipo_atividade] ?? item.tipo_atividade,
    total: item.total,
    usuarios: item.usuarios_distintos,
  })) ?? [];

  const usuariosTotalPages = Math.ceil((usuarios?.total ?? 0) / pageSize);
  const processosTotalPages = Math.ceil((processos?.total ?? 0) / pageSize);

  if (isInitialLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Uso da Aplicacao
          </h2>
          {selectedUsuario && (
            <Badge variant="secondary" className="gap-1 pl-2">
              Filtro: {selectedUsuario}
              <button onClick={() => { setSelectedUsuario(null); setProcessosPage(1); }} className="ml-1 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODO_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={<Users className="h-4 w-4" />}
          label="Usuarios Ativos"
          value={resumo?.total_usuarios_unicos ?? 0}
          detail={resumo?.usuario_mais_ativo ? `Mais ativo: ${resumo.usuario_mais_ativo}` : undefined}
        />
        <SummaryCard
          icon={<LogIn className="h-4 w-4" />}
          label="Total de Logins"
          value={resumo?.total_logins ?? 0}
        />
        <SummaryCard
          icon={<Eye className="h-4 w-4" />}
          label="Processos Visualizados"
          value={resumo?.total_visualizacoes_processo ?? 0}
          detail={resumo?.processo_mais_visto ? `Top: ${formatProcessNumber(resumo.processo_mais_visto)}` : undefined}
        />
        <SummaryCard
          icon={<Activity className="h-4 w-4" />}
          label="Total de Acoes"
          value={resumo?.total_acoes ?? 0}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Logins over time — wider */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Logins ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            {loginsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : loginChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados no periodo.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={loginChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="data"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="unicos"
                    name="Usuarios unicos"
                    stroke="hsl(var(--primary))"
                    fill="url(#loginGradient)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total logins"
                    stroke="hsl(var(--muted-foreground))"
                    fill="none"
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Actions by type — narrower */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Acoes por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {acoesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : acoesChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados no periodo.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, acoesChartData.length * 32 + 16)}>
                <BarChart data={acoesChartData} layout="vertical" margin={{ top: 0, right: 4, left: 0, bottom: 0 }}>
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="tipo"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: 12,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    }}
                  />
                  <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]} barSize={18}>
                    {acoesChartData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Users table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Usuarios Ativos</CardTitle>
              <span className="text-2xs text-muted-foreground">{usuarios?.total ?? 0} usuarios</span>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou orgao..."
                value={usuariosSearch}
                onChange={e => setUsuariosSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {usuariosLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="border-y">
                        <th className="px-4 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground">Usuario</th>
                        <th className="px-3 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground">Acoes</th>
                        <th className="px-3 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Processos</th>
                        <th className="px-4 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">Ultimo Acesso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(usuarios?.items ?? []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-sm">
                            Nenhum usuario encontrado.
                          </td>
                        </tr>
                      )}
                      {(usuarios?.items ?? []).map(u => (
                        <tr
                          key={u.usuario_sei}
                          className="border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => { setSelectedUsuario(u.usuario_sei); setProcessosPage(1); }}
                        >
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-sm truncate max-w-[180px]">{u.usuario_sei}</div>
                            {u.orgao && <div className="text-2xs text-muted-foreground">{u.orgao}</div>}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{u.total_atividades}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums hidden sm:table-cell">{u.processos_visualizados}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground text-xs hidden md:table-cell">
                            {u.ultima_atividade
                              ? new Date(u.ultima_atividade).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {usuariosTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t">
                    <span className="text-2xs text-muted-foreground">
                      Pag. {usuariosPage}/{usuariosTotalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={usuariosPage <= 1} onClick={() => setUsuariosPage(p => p - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={usuariosPage >= usuariosTotalPages} onClick={() => setUsuariosPage(p => p + 1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Processes table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                {selectedUsuario ? `Processos de ${selectedUsuario}` : 'Processos Mais Vistos'}
              </CardTitle>
              <span className="text-2xs text-muted-foreground">{processos?.total ?? 0} processos</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {processosLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="border-y">
                        <th className="px-4 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted-foreground">Processo</th>
                        <th className="px-3 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground">Visualizacoes</th>
                        <th className="px-3 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Usuarios</th>
                        <th className="px-4 py-2 text-right text-2xs font-medium uppercase tracking-wide text-muted-foreground hidden md:table-cell">Ultima</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(processos?.items ?? []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground text-sm">
                            Nenhum processo visualizado no periodo.
                          </td>
                        </tr>
                      )}
                      {(processos?.items ?? []).map(p => (
                        <tr key={p.numero_processo} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs">{formatProcessNumber(p.numero_processo)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums font-medium">{p.total_visualizacoes}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">{p.usuarios_distintos}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground text-xs hidden md:table-cell">
                            {p.ultima_visualizacao
                              ? new Date(p.ultima_visualizacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {processosTotalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-2 border-t">
                    <span className="text-2xs text-muted-foreground">
                      Pag. {processosPage}/{processosTotalPages}
                    </span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={processosPage <= 1} onClick={() => setProcessosPage(p => p - 1)}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={processosPage >= processosTotalPages} onClick={() => setProcessosPage(p => p + 1)}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Summary Card ──

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-2xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <div className="text-2xl font-semibold tracking-tight tabular-nums">
          {value.toLocaleString('pt-BR')}
        </div>
        {detail && (
          <p className="text-2xs text-muted-foreground mt-1 truncate">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}
