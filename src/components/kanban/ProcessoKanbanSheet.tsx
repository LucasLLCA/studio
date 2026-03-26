"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  X,
  ExternalLink,
  Tag,
  Plus,
  Check,
  ChevronDown,
  Info,
  ArrowRight,
  Lock,
  Users,
  Globe,
  Reply,
  AtSign,
  Eye,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { MentionDropdown } from '@/components/ui/mention-dropdown';
import { useMencoesEditor } from '@/hooks/use-mencoes-editor';
import { useToast } from '@/hooks/use-toast';
import { usePersistedAuth } from '@/hooks/use-persisted-auth';
import { useRouter } from 'next/navigation';
import { formatProcessNumber, cn } from '@/lib/utils';
import {
  getTags,
  getProcessoTags,
  createTag,
  updateTag,
  deleteTag,
  tagProcesso,
  untagProcessoPorNumero,
  salvarProcessoNoKanban,
} from '@/lib/api/tags-api-client';
import {
  getObservacoes,
  createObservacao,
  updateObservacao,
  deleteObservacao,
  getMencoesNaoLidas,
  marcarMencaoVista,
} from '@/lib/api/observacoes-api-client';
import { getTeamDetail } from '@/lib/api/teams-api-client';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { KanbanProcesso, TeamTag, Observacao, ObservacaoEscopo, TeamMember } from '@/types/teams';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';



import { TAG_COLORS } from '@/lib/constants';
import { EditableTagBadge } from '@/components/ui/editable-tag-badge';

interface ProcessoKanbanSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  processo: KanbanProcesso;
  equipeId: string;
  onTagsChanged: () => void;
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function ProcessoKanbanSheet({
  isOpen,
  onOpenChange,
  processo,
  equipeId,
  onTagsChanged,
}: ProcessoKanbanSheetProps) {
  const [moverModalAberto, setMoverModalAberto] = useState(false);
  const [gruposDestino, setGruposDestino] = useState<TeamTag[]>([]);
  const [multiSelectAberto, setMultiSelectAberto] = useState(false);
  const { toast } = useToast();
  const { usuario, idUnidadeAtual, selectedUnidadeFiltro, updateSelectedUnidade } = usePersistedAuth();
  const router = useRouter();
  const [isMoving, setIsMoving] = useState(false);

  const numeroAtual = processo.numero_processo;

  const colunaJaTemProcesso = useCallback((coluna: any) => {
    const listaProcessos =
      coluna?.processos ??
      coluna?.listaDeProcessos ??
      coluna?.lista_processos ??
      coluna?.items ??
      [];

    return listaProcessos.some((p: any) => p?.numero_processo === numeroAtual);
  }, [numeroAtual]);


  // Team tags state (rotulos/labels from team_tags table)
  const [processoTags, setProcessoTags] = useState<TeamTag[]>(processo.team_tags || []);
  const [teamTagsList, setTeamTagsList] = useState<TeamTag[]>([]);
  const [tagFilter, setTagFilter] = useState('');
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isLoadingTeamTags, setIsLoadingTeamTags] = useState(false);
  const [newTagColor, setNewTagColor] = useState<string>('');
  const [editingTag, setEditingTag] = useState<TeamTag | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  // Kanban columns state (groups from tags table — for the "Adicionar a outros grupos" feature)
  const [kanbanColunas, setKanbanColunas] = useState<any[]>([]);

  // Busca as tags da equipe (rotulos, não grupos)
  const loadTeamTags = useCallback(async () => {
    if (!usuario) return;
    setIsLoadingTeamTags(true);
    try {
      const result = await getTags(usuario, equipeId);
      setTeamTagsList('error' in result ? [] : result);
    } finally {
      setIsLoadingTeamTags(false);
    }
  }, [equipeId, usuario]);

  // Busca as colunas do kanban (grupos de processos — para mover entre grupos)
  const loadKanbanColunas = useCallback(async () => {
    if (!usuario) return;
    const boardResult = await import('@/lib/api/tags-api-client').then(m => m.getKanbanBoard(equipeId, usuario));
    if (!('error' in boardResult)) {
      setKanbanColunas(boardResult.colunas);
    } else {
      setKanbanColunas([]);
    }
  }, [equipeId, usuario]);

  // Observacoes state
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [isLoadingObs, setIsLoadingObs] = useState(false);
  const [isSendingObs, setIsSendingObs] = useState(false);
  const [obsConteudo, setObsConteudo] = useState('');
  const [obsEscopo, setObsEscopo] = useState<ObservacaoEscopo>('equipe');
  const [filterEscopo, setFilterEscopo] = useState<'todos' | ObservacaoEscopo>('todos');
  const scrollRef = useRef<HTMLDivElement>(null);

  // @mencao state
  const [membrosEquipe, setMembrosEquipe] = useState<TeamMember[]>([]);
  const mencoeEditor = useMencoesEditor(membrosEquipe, usuario);

  // Badge de mencoes nao lidas
  const [mencoesBadge, setMencoesBadge] = useState(0);

  // Respostas inline
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyConteudo, setReplyConteudo] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const mencoeReply = useMencoesEditor(membrosEquipe, usuario);

  // Edição de observações
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editConteudo, setEditConteudo] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const loadObservacoes = useCallback(async () => {
    if (!usuario) return;
    setIsLoadingObs(true);
    try {
      const result = await getObservacoes(processo.numero_processo, equipeId, usuario);
      if (!('error' in result)) {
        setObservacoes(result);
        setTimeout(scrollToBottom, 100);
        // Marcar automaticamente como vistas as mencoes do usuario
        for (const obs of result) {
          const temMencaoNaoVista = obs.mencoes?.some(
            m => m.usuario_mencionado === usuario && !m.visto_em
          );
          if (temMencaoNaoVista) {
            marcarMencaoVista(processo.numero_processo, obs.id, usuario);
          }
        }
      }
    } finally {
      setIsLoadingObs(false);
    }
  }, [processo.numero_processo, equipeId, usuario, scrollToBottom]);

  const loadMembrosEBadge = useCallback(async () => {
    if (!usuario || !equipeId) return;
    const [teamResult, badgeResult] = await Promise.all([
      getTeamDetail(equipeId, usuario),
      getMencoesNaoLidas(processo.numero_processo, usuario),
    ]);
    if (!('error' in teamResult)) {
      setMembrosEquipe(teamResult.membros);
    }
    if (!('error' in badgeResult)) {
      setMencoesBadge(badgeResult.count);
    }
  }, [equipeId, usuario, processo.numero_processo]);

  const loadTags = useCallback(async () => {
    if (!usuario) return;
    const result = await getProcessoTags(processo.numero_processo, usuario, equipeId);
    if (!('error' in result)) {
      setProcessoTags(result);
    }
  }, [equipeId, processo.numero_processo, usuario]);

  // const move -> Função para mover

  const toggleGrupoDestino = useCallback((coluna: { tag_id: string; tag_nome: string; tag_cor: string; equipe_id?: string; criado_por?: string; criado_em?: string; atualizado_em?: string }) => {
    if (colunaJaTemProcesso(coluna)) return;

    const tag: TeamTag = {
      id: coluna.tag_id,
      nome: coluna.tag_nome,
      cor: coluna.tag_cor,
      equipe_id: coluna.equipe_id ?? equipeId,
      criado_por: coluna.criado_por ?? '',
      criado_em: coluna.criado_em ?? '',
      atualizado_em: coluna.atualizado_em ?? '',
    };
    setGruposDestino(prev =>
      prev.some(g => g.id === tag.id)
        ? prev.filter(g => g.id !== tag.id)
        : [...prev, tag]
    );
  }, [equipeId, colunaJaTemProcesso]);

  const moverProcessoParaGrupos = useCallback(async () => {
    if (!usuario || gruposDestino.length === 0) return;

    const destinosValidos = gruposDestino.filter(grupo => {
      const coluna = kanbanColunas.find((c) => c.tag_id === grupo.id);
      return !coluna || !colunaJaTemProcesso(coluna);
    });

    if (destinosValidos.length === 0) {
      toast({
        title: 'Nenhum destino válido',
        description: 'O processo já está presente nos grupos selecionados.',
        variant: 'destructive',
      });
      return;
    }

    setIsMoving(true);
    try {
      const resultados = await Promise.all(
        destinosValidos.map(grupo =>
          salvarProcessoNoKanban(
            equipeId,
            grupo.id,
            processo.numero_processo,
            processo.numero_processo_formatado ?? undefined,
            usuario,
          )
        )
      );

      const erros = resultados.filter(r => 'error' in r) as { error: string; status?: number }[];
      const sucessos = resultados.filter(r => !('error' in r));
      const errosDuplicidade = erros.filter(e => e.status === 409);
      const errosOutros = erros.filter(e => e.status !== 409);

      if (erros.length === 0) {
        toast({
          title: "Processo adicionado com sucesso!",
          description: destinosValidos.length === 1
            ? `Adicionado ao grupo "${destinosValidos[0].nome}".`
            : `Adicionado a ${destinosValidos.length} grupos.`,
        });
      } else if (sucessos.length > 0 || errosDuplicidade.length > 0) {
        toast({
          title: "Adicionado parcialmente",
          description: `${sucessos.length} grupo(s) com sucesso, ${errosDuplicidade.length} já tinham o processo${errosOutros.length > 0 ? `, ${errosOutros.length} com outro erro` : ''}.`,
          variant: "destructive",
        });
      } else {
        const primeiroErro = erros[0];
        const description = primeiroErro.status === 409
          ? 'O processo já existe em todos os grupos selecionados.'
          : primeiroErro.error;
        toast({ title: "Erro ao adicionar processo", description, variant: "destructive" });
        return;
      }

      setGruposDestino([]);
      setMoverModalAberto(false);
      onTagsChanged();
    } finally {
      setIsMoving(false);
    }
  }, [equipeId, processo.numero_processo, processo.numero_processo_formatado, usuario, toast, onTagsChanged, gruposDestino, kanbanColunas, colunaJaTemProcesso]);


  useEffect(() => {
    if (isOpen) {
      loadObservacoes();
      loadTags();
      loadTeamTags();
      loadKanbanColunas();
      loadMembrosEBadge();
    }
  }, [isOpen, loadObservacoes, loadTags, loadTeamTags, loadKanbanColunas, loadMembrosEBadge]);

  const handleAddTag = async (tag: TeamTag) => {
    if (!usuario) return;
    const result = await tagProcesso(tag.id, usuario, processo.numero_processo);
    if ('error' in result) {
      toast({ title: "Erro ao adicionar tag", description: result.error, variant: "destructive" });
      return;
    }
    setProcessoTags(prev => [...prev, tag]);
    setIsTagPopoverOpen(false);
    setTagFilter('');
    onTagsChanged();
  };

  const handleRemoveTag = async (tag: TeamTag) => {
    if (!usuario) return;
    // Optimistic remove
    setProcessoTags(prev => prev.filter(t => t.id !== tag.id));
    const result = await untagProcessoPorNumero(tag.id, processo.numero_processo, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao remover tag", description: result.error, variant: "destructive" });
      // Revert on error
      setProcessoTags(prev => [...prev, tag]);
      return;
    }
    onTagsChanged();
  };

  const handleCreateAndAddTag = async () => {
    if (!usuario || !tagFilter.trim()) return;
    setIsCreatingTag(true);
    try {
      const result = await createTag(usuario, tagFilter.trim(), newTagColor || undefined, equipeId);
      if ('error' in result) {
        const isDuplicate = result.status === 409;
        toast({
          title: isDuplicate ? "Tag duplicada" : "Erro ao criar tag",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
      setNewTagColor('');
      await handleAddTag(result);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleEditTag = async () => {
    if (!usuario || !editingTag) return;
    const updates: { nome?: string; cor?: string } = {};
    if (editTagName.trim() && editTagName !== editingTag.nome) updates.nome = editTagName.trim();
    if (editTagColor !== (editingTag.cor ?? '')) updates.cor = editTagColor;
    if (Object.keys(updates).length === 0) { setEditingTag(null); return; }

    const result = await updateTag(editingTag.id, usuario, updates);
    if ('error' in result) {
      toast({ title: "Erro ao editar tag", description: result.error, variant: "destructive" });
      return;
    }
    setTeamTagsList(prev => prev.map(t => t.id === editingTag.id ? { ...t, ...updates } : t));
    setProcessoTags(prev => prev.map(t => t.id === editingTag.id ? { ...t, ...updates } : t));
    setEditingTag(null);
    onTagsChanged();
  };

  const handleDeleteTag = async (tag: TeamTag) => {
    if (!usuario) return;
    const result = await deleteTag(tag.id, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao excluir tag", description: result.error, variant: "destructive" });
      return;
    }
    setTeamTagsList(prev => prev.filter(t => t.id !== tag.id));
    setProcessoTags(prev => prev.filter(t => t.id !== tag.id));
    onTagsChanged();
    toast({ title: "Tag excluída" });
  };


  const handleSendObs = async () => {
    if (!usuario || !obsConteudo.trim() || isSendingObs) return;
    setIsSendingObs(true);
    const equipeParaEnvio = obsEscopo === 'equipe' ? equipeId : undefined;
    try {
      const mencoes = mencoeEditor.extrairMencoes(obsConteudo);
      const result = await createObservacao(
        processo.numero_processo, usuario, obsConteudo.trim(),
        obsEscopo, equipeParaEnvio, mencoes,
      );
      if ('error' in result) {
        toast({ title: "Erro ao enviar", description: result.error, variant: "destructive" });
        return;
      }
      setObservacoes(prev => [...prev, result]);
      setObsConteudo('');
      mencoeEditor.handleCloseMentionDropdown();
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsSendingObs(false);
    }
  };

  const handleSendReply = async (parentId: string) => {
    if (!usuario || !replyConteudo.trim() || isSendingReply) return;
    setIsSendingReply(true);
    try {
      const mencoes = mencoeReply.extrairMencoes(replyConteudo);
      const result = await createObservacao(
        processo.numero_processo, usuario, replyConteudo.trim(),
        obsEscopo, obsEscopo === 'equipe' ? equipeId : undefined,
        mencoes, parentId,
      );
      if ('error' in result) {
        toast({ title: "Erro ao responder", description: result.error, variant: "destructive" });
        return;
      }
      // Atualiza a obs pai com a nova resposta
      setObservacoes(prev => prev.map(o => {
        if (o.id === parentId) {
          return { ...o, respostas: [...(o.respostas ?? []), result] };
        }
        return o;
      }));
      setReplyConteudo('');
      setReplyingToId(null);
      mencoeReply.handleCloseMentionDropdown();
      setTimeout(scrollToBottom, 100);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdate = async () => {
    if (!usuario || !editConteudo.trim() || !editingId || isUpdating) return;
    setIsUpdating(true);
    try {
      const result = await updateObservacao(processo.numero_processo, editingId, usuario, editConteudo);
      if ('error' in result) {
        toast({ title: "Erro ao atualizar", description: result.error, variant: "destructive" });
        return;
      }
      setObservacoes(prev => prev.map(o => o.id === editingId ? result : o));
      setEditingId(null);
      setEditConteudo('');
      toast({ title: "Observação atualizada", duration: 2000 });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteObs = async (observacaoId: string, parentId?: string) => {
    if (!usuario) return;
    const result = await deleteObservacao(processo.numero_processo, observacaoId, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao excluir", description: result.error, variant: "destructive" });
      return;
    }
    if (parentId) {
      // É uma resposta — remove da lista de respostas da pai
      setObservacoes(prev => prev.map(o => {
        if (o.id === parentId) {
          return { ...o, respostas: (o.respostas ?? []).filter(r => r.id !== observacaoId) };
        }
        return o;
      }));
    } else {
      setObservacoes(prev => prev.filter(o => o.id !== observacaoId));
    }
  };


  // Renderiza conteudo com @mencoes destacadas
  const renderizarConteudo = (html: string) => {
    return (
      <div
        className="text-sm text-foreground/90 whitespace-pre-wrap break-words max-w-none [&>p]:m-0 [&>ul]:my-2 [&>ol]:my-2 [&>strong]:font-bold [&>em]:italic"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  // Config visual de escopo
  const scopeConfig: Record<ObservacaoEscopo, { label: string; Icon: React.ElementType; className: string }> = {
    pessoal: { label: 'Pessoal', Icon: Lock,  className: 'bg-muted/50 text-muted-foreground border-muted' },
    equipe:  { label: 'Equipe',  Icon: Users, className: 'bg-blue-50 text-blue-600 border-blue-100' },
    global:  { label: 'Global',  Icon: Globe, className: 'bg-green-50 text-green-600 border-green-100' },
  };

  const obsEscopoOptions: { value: ObservacaoEscopo; label: string; Icon: React.ElementType }[] = [
    { value: 'pessoal', label: 'Pessoal', Icon: Lock },
    { value: 'equipe',  label: 'Equipe',  Icon: Users },
    { value: 'global',  label: 'Global',  Icon: Globe },
  ];

  const observacoesFiltradas = filterEscopo === 'todos'
    ? observacoes
    : observacoes.filter(o => (o.escopo ?? 'pessoal') === filterEscopo);

  // Filter available tags (not already applied)
  const appliedTagIds = new Set(processoTags.map(t => t.id));
  const availableTags = teamTagsList
    .filter(t => !appliedTagIds.has(t.id) && t.nome.toLowerCase().includes(tagFilter.toLowerCase()));

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        showOverlay={false}
        showCloseButton={false}
        className="w-full sm:w-[480px] sm:max-w-[480px] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">
              {processo.numero_processo_formatado || formatProcessNumber(processo.numero_processo)}
            </SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Multi-select de grupos para mover processo */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Adicionar a outros grupos:</h3>
            </div>

            {/* Informativo */}
            <div className="flex items-start gap-1.5 rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1.5">
              <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-600 leading-snug">
                Selecione um ou mais grupos para adicionar este processo a todos eles simultaneamente.
              </p>
            </div>

            {/* Popover multi-select */}
            <Popover open={multiSelectAberto} onOpenChange={setMultiSelectAberto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={multiSelectAberto}
                  className="w-full justify-between font-normal text-muted-foreground hover:text-foreground"
                >
                  {gruposDestino.length === 0
                    ? 'Selecione os grupos de destino...'
                    : `${gruposDestino.length} grupo${gruposDestino.length > 1 ? 's' : ''} selecionado${gruposDestino.length > 1 ? 's' : ''}`}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
                <div className="max-h-48 overflow-y-auto">
                  {kanbanColunas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum grupo encontrado.</p>
                  ) : (
                    kanbanColunas.map(coluna => {
                      const isSelecionado = gruposDestino.some(g => g.id === coluna.tag_id);
                      const jaAdicionado = colunaJaTemProcesso(coluna);
                      return (
                        <button
                          key={coluna.tag_id}
                          type="button"
                          onClick={() => !jaAdicionado && toggleGrupoDestino(coluna)}
                          disabled={jaAdicionado}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left transition-colors',
                            jaAdicionado
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-accent cursor-pointer'
                          )}
                        >
                          <div className={cn(
                            'h-4 w-4 rounded border flex items-center justify-center flex-shrink-0',
                            isSelecionado
                              ? 'bg-primary border-primary'
                              : 'border-muted-foreground/40'
                          )}>
                            {isSelecionado && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <span className="flex-1">{coluna.tag_nome}</span>
                          {jaAdicionado && (
                            <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100">
                              Já adicionado
                            </Badge>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                {gruposDestino.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <div className="px-1 pb-0.5 pt-0.5">
                      <Button
                        className="w-full h-8 text-sm"
                        onClick={() => {
                          setMultiSelectAberto(false);
                          setMoverModalAberto(true);
                        }}
                      >
                        <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                        Adicionar a {gruposDestino.length} grupo{gruposDestino.length > 1 ? 's' : ''}
                      </Button>
                    </div>
                  </>
                )}
              </PopoverContent>
            </Popover>

            {/* Chips dos grupos selecionados */}
            {gruposDestino.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {gruposDestino.map(grupo => (
                  <span
                    key={grupo.id}
                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2.5 py-0.5"
                  >
                    {grupo.nome}
                    <button
                      type="button"
                      onClick={() => setGruposDestino(prev => prev.filter(g => g.id !== grupo.id))}
                      className="hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

          </div>

          {/* Dialog de confirmação */}
          <Dialog open={moverModalAberto} onOpenChange={setMoverModalAberto}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Confirmar adição</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-1">
                <p className="text-sm text-muted-foreground">
                  O processo será adicionado {gruposDestino.length === 1 ? 'ao grupo:' : `aos seguintes ${gruposDestino.length} grupos:`}
                </p>
                <ul className="space-y-1.5">
                  {gruposDestino.map(grupo => (
                    <li key={grupo.id} className="flex items-center gap-2 text-sm font-medium">
                      <ArrowRight className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      {grupo.nome}
                    </li>
                  ))}
                </ul>
              </div>
              <DialogFooter className="gap-2">
                <DialogClose asChild>
                  <Button variant="outline" disabled={isMoving}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  disabled={isMoving}
                  onClick={moverProcessoParaGrupos}
                >
                  {isMoving
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Adicionando...</>
                    : 'Confirmar'
                  }
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <SheetDescription className="sr-only">Detalhes do processo no kanban</SheetDescription>
        </SheetHeader>

        {processo.nota && (
          <p className="text-sm text-muted-foreground px-1 mt-1">{processo.nota}</p>
        )}

        {/* Tags inline row */}
        <div className="flex-shrink-0 flex flex-wrap items-center gap-1.5 py-3 border-b">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          {processoTags.map((tag) => (
            <EditableTagBadge
              key={tag.id}
              tag={tag}
              usuario={usuario || ''}
              size="sm"
              onUpdated={(updated) => {
                setProcessoTags(prev => prev.map(t => t.id === updated.id ? updated : t));
                setTeamTagsList(prev => prev.map(t => t.id === updated.id ? updated : t));
                onTagsChanged();
              }}
              onDeleted={(id) => {
                setProcessoTags(prev => prev.filter(t => t.id !== id));
                setTeamTagsList(prev => prev.filter(t => t.id !== id));
                onTagsChanged();
              }}
              suffix={
                <button className="ml-0.5 hover:opacity-70" onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag); }}>
                  <X className="h-3 w-3" />
                </button>
              }
            />
          ))}
          <Popover
            open={isTagPopoverOpen}
            onOpenChange={(open) => {
              setIsTagPopoverOpen(open);
              if (!open) {
                setTagFilter('');
                setNewTagColor('');
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" /> Tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2" align="start">
              <Input
                placeholder="Filtrar ou criar tag..."
                value={tagFilter}
                onChange={(e) => { setTagFilter(e.target.value); setNewTagColor(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagFilter.trim() && availableTags.length === 0) {
                    const existing = teamTagsList.find(t => t.nome.toLowerCase() === tagFilter.trim().toLowerCase());
                    if (existing) handleAddTag(existing);
                    else handleCreateAndAddTag();
                  }
                }}
                className="h-8 text-sm mb-1"
                autoFocus
              />
              {isLoadingTeamTags ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                  {availableTags.map((tag) => (
                    <div key={tag.id} className="group flex items-center gap-1 rounded hover:bg-accent">
                      <button
                        className="flex-1 text-left px-2 py-1 text-sm flex items-center gap-2"
                        onClick={() => handleAddTag(tag)}
                      >
                        {tag.cor ? (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted border" />
                        )}
                        {tag.nome}
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-opacity"
                        title="Editar tag"
                        onClick={(e) => { e.stopPropagation(); setEditingTag(tag); setEditTagName(tag.nome); setEditTagColor(tag.cor ?? ''); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                        title="Excluir tag"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {tagFilter.trim() && availableTags.length === 0 && (() => {
                    const existingTag = teamTagsList.find(
                      t => t.nome.toLowerCase() === tagFilter.trim().toLowerCase()
                    );
                    if (existingTag) {
                      const jaAplicada = appliedTagIds.has(existingTag.id);
                      return (
                        <div className="space-y-1 pt-0.5">
                          {jaAplicada ? (
                            <div className="flex items-center gap-1.5 px-2 py-2 bg-green-50 border border-green-100 rounded text-xs text-green-700">
                              <Check className="h-3.5 w-3.5 shrink-0 text-green-600" />
                              <span>
                                <span className="font-medium">&quot;{existingTag.nome}&quot;</span> já está aplicada a este processo.
                              </span>
                            </div>
                          ) : (
                            <>
                              <p className="text-[10px] text-amber-600 px-2 py-1 bg-amber-50 rounded flex items-center gap-1">
                                <Info className="h-3 w-3 shrink-0" /> Tag já existe — deseja aplicá-la?
                              </p>
                              <button
                                className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent flex items-center gap-2"
                                onClick={() => handleAddTag(existingTag)}
                              >
                                {existingTag.cor ? (
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: existingTag.cor }} />
                                ) : (
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-muted border" />
                                )}
                                Aplicar &quot;{existingTag.nome}&quot;
                              </button>
                            </>
                          )}
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[10px] text-muted-foreground px-1">Cor da tag (opcional):</p>
                        <div className="flex flex-wrap gap-1 px-1">
                          {TAG_COLORS.map(cor => (
                            <button
                              key={cor}
                              type="button"
                              title={cor}
                              className={cn(
                                'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                                newTagColor === cor ? 'border-foreground scale-110' : 'border-transparent'
                              )}
                              style={{ backgroundColor: cor }}
                              onClick={() => setNewTagColor(prev => prev === cor ? '' : cor)}
                            />
                          ))}
                          <button
                            type="button"
                            title="Sem cor"
                            className={cn(
                              'w-5 h-5 rounded-full border-2 bg-muted flex items-center justify-center transition-transform hover:scale-110',
                              !newTagColor ? 'border-foreground scale-110' : 'border-transparent'
                            )}
                            onClick={() => setNewTagColor('')}
                          >
                            <X className="h-2.5 w-2.5 text-muted-foreground" />
                          </button>
                        </div>
                        <button
                          className="w-full text-left px-2 py-1 rounded text-sm hover:bg-accent text-primary flex items-center gap-1.5"
                          onClick={handleCreateAndAddTag}
                          disabled={isCreatingTag}
                        >
                          {isCreatingTag ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              {newTagColor && (
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: newTagColor }} />
                              )}
                              <Plus className="h-3 w-3" />
                            </>
                          )}
                          Criar &quot;{tagFilter.trim()}&quot;
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Edit tag dialog */}
          <Dialog open={!!editingTag} onOpenChange={(open) => { if (!open) setEditingTag(null); }}>
            <DialogContent className="sm:max-w-xs">
              <DialogHeader>
                <DialogTitle className="text-base">Editar tag</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  placeholder="Nome da tag"
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditTag(); }}
                />
                <div>
                  <p className="text-[10px] text-muted-foreground mb-1">Cor:</p>
                  <div className="flex flex-wrap gap-1">
                    {TAG_COLORS.map(cor => (
                      <button
                        key={cor}
                        type="button"
                        className={cn(
                          'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                          editTagColor === cor ? 'border-foreground scale-110' : 'border-transparent'
                        )}
                        style={{ backgroundColor: cor }}
                        onClick={() => setEditTagColor(prev => prev === cor ? '' : cor)}
                      />
                    ))}
                    <button
                      type="button"
                      title="Sem cor"
                      className={cn(
                        'w-5 h-5 rounded-full border-2 bg-muted flex items-center justify-center transition-transform hover:scale-110',
                        !editTagColor ? 'border-foreground scale-110' : 'border-transparent'
                      )}
                      onClick={() => setEditTagColor('')}
                    >
                      <X className="h-2.5 w-2.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
                <Button size="sm" onClick={handleEditTag}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator className="my-3" />

        {/* Team Observacoes Section */}
        <div className="flex items-center gap-2 mb-2 flex-shrink-0">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Observacoes da equipe</h3>
          {mencoesBadge > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {mencoesBadge}
            </span>
          )}
        </div>

        {/* Obs input at top */}
        <div className="flex-shrink-0 pb-2 space-y-1.5">
          {/* Seletor de escopo */}
          <div className="flex gap-1.5">
            {obsEscopoOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setObsEscopo(value)}
                className={cn(
                  'flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border transition-colors',
                  obsEscopo === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          <div className="relative flex gap-2 items-end">
            <div className="flex-1 relative">
              <RichTextEditor
                value={obsConteudo}
                onChange={setObsConteudo}
                onSubmit={handleSendObs}
                onMentionQuery={mencoeEditor.handleMentionQuery}
                members={membrosEquipe}
                placeholder="Escreva uma observação... use @ para mencionar"
              />
              <MentionDropdown
                show={mencoeEditor.showDropdown}
                members={mencoeEditor.membrosFiltrados()}
                onSelect={mencoeEditor.handleSelectMembro}
                onClose={mencoeEditor.handleCloseMentionDropdown}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setObsConteudo(obsConteudo + '@');
              }}
              disabled={isSendingObs}
              className="h-9 w-9 p-0 flex-shrink-0"
              title="Marcar pessoa"
              aria-label="Marcar pessoa"
            >
              <span className="text-base">@</span>
            </Button>
            <Button
              size="sm"
              onClick={handleSendObs}
              disabled={!obsConteudo.trim() || isSendingObs}
              className="h-9 w-9 p-0 flex-shrink-0"
            >
              {isSendingObs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Filtro de escopo */}
        <div className="flex-shrink-0 flex items-center gap-1.5 pb-2">
          <span className="text-xs text-muted-foreground font-medium mr-0.5">Filtrar por:</span>
          {(['todos', 'pessoal', 'equipe', 'global'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterEscopo(f)}
              className={cn(
                'text-xs px-2.5 py-0.5 rounded-full border transition-colors',
                filterEscopo === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground border-border hover:text-foreground'
              )}
            >
              {f === 'todos' ? 'Todos' : scopeConfig[f].label}
            </button>
          ))}
        </div>

        {/* Obs message list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto pr-1 space-y-3">
          {isLoadingObs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            </div>
          ) : observacoesFiltradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">Nenhuma observacao ainda.</p>
            </div>
          ) : (
            observacoesFiltradas.map((obs) => {
              const escopoObs = (obs.escopo ?? 'pessoal') as ObservacaoEscopo;
              const { label: scopeLabel, Icon: ScopeIcon, className: scopeClassName } = scopeConfig[escopoObs];
              const souMencionado = obs.mencoes?.some(m => m.usuario_mencionado === usuario);
              const vistosPor = obs.mencoes?.filter(m => m.visto_em !== null) ?? [];
              const isReplying = replyingToId === obs.id;
              return (
                <div
                  key={obs.id}
                  className={cn(
                    'group flex gap-2.5 rounded-lg p-1.5 -mx-1.5 transition-colors',
                    souMencionado && 'bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/40'
                  )}
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">
                    {getInitials(obs.usuario)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-medium text-foreground truncate">
                        {obs.usuario}
                      </span>
                      <span
                        className="text-[10px] text-muted-foreground flex-shrink-0 cursor-default"
                        title={format(new Date(obs.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      >
                        {formatDistanceToNow(new Date(obs.criado_em), { addSuffix: true, locale: ptBR })}
                      </span>
                      <span className={cn(
                        'inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0',
                        scopeClassName
                      )}>
                        <ScopeIcon className="h-2.5 w-2.5" />
                        {scopeLabel}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        {/* Botao responder */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => {
                            setReplyingToId(isReplying ? null : obs.id);
                            setReplyConteudo('');
                          }}
                          title="Responder"
                        >
                          <Reply className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        {usuario === obs.usuario && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => {
                                setEditingId(editingId === obs.id ? null : obs.id);
                                setEditConteudo(obs.conteudo);
                              }}
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => handleDeleteObs(obs.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Edição inline ou conteúdo */}
                    {editingId === obs.id ? (
                      <div className="mt-2 space-y-2 p-2 border border-primary/30 rounded bg-primary/5">
                        <RichTextEditor
                          value={editConteudo}
                          onChange={setEditConteudo}
                          placeholder="Editar observação..."
                          editorClassName="min-h-[80px]"
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setEditingId(null);
                              setEditConteudo('');
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs"
                            onClick={handleUpdate}
                            disabled={!editConteudo.trim() || isUpdating}
                          >
                            {isUpdating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words mt-0.5">
                        {renderizarConteudo(obs.conteudo)}
                      </div>
                    )}

                    {/* Tag "Visto por X" */}
                    {vistosPor.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {vistosPor.map(m => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-0.5 text-[10px] text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5"
                            title={m.visto_em ? format(new Date(m.visto_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                          >
                            <Eye className="h-2.5 w-2.5" />
                            Visto por {m.usuario_mencionado.split('@')[0]}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Respostas indentadas */}
                    {(obs.respostas ?? []).length > 0 && (
                      <div className="mt-2 space-y-2 pl-3 border-l-2 border-muted">
                        {(obs.respostas ?? []).map(resp => (
                          <div key={resp.id} className="group/resp flex gap-2">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-semibold">
                              {getInitials(resp.usuario)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[11px] font-medium truncate">{resp.usuario}</span>
                                <span
                                  className="text-[10px] text-muted-foreground cursor-default"
                                  title={format(new Date(resp.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                >
                                  {formatDistanceToNow(new Date(resp.criado_em), { addSuffix: true, locale: ptBR })}
                                </span>
                                {usuario === resp.usuario && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-4 w-4 p-0 opacity-0 group-hover/resp:opacity-100 transition-opacity ml-auto"
                                    onClick={() => handleDeleteObs(resp.id, obs.id)}
                                  >
                                    <Trash2 className="h-2.5 w-2.5 text-destructive" />
                                  </Button>
                                )}
                              </div>
                              <p className="text-xs text-foreground/90 whitespace-pre-wrap break-words">
                                {renderizarConteudo(resp.conteudo)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Caixa de resposta inline */}
                    {isReplying && (
                      <div className="mt-2 pl-3 border-l-2 border-primary/30">
                        <div className="relative">
                          <RichTextEditor
                            value={replyConteudo}
                            onChange={setReplyConteudo}
                            onSubmit={() => handleSendReply(obs.id)}
                            onMentionQuery={mencoeReply.handleMentionQuery}
                            members={membrosEquipe}
                            placeholder="Responder... use @ para mencionar"
                            editorClassName="min-h-[60px]"
                          />
                          <MentionDropdown
                            show={mencoeReply.showDropdown}
                            members={mencoeReply.membrosFiltrados()}
                            onSelect={mencoeReply.handleSelectMembro}
                            onClose={mencoeReply.handleCloseMentionDropdown}
                          />
                        </div>
                        <div className="flex gap-1 mt-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => { setReplyingToId(null); setReplyConteudo(''); }}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => handleSendReply(obs.id)}
                            disabled={!replyConteudo.trim() || isSendingReply}
                          >
                            {isSendingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Responder'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Full-width button at the bottom */}
        <div className="flex-shrink-0 pt-3 border-t">
          <Button
            className="w-full"
            onClick={() => {
              const unitId = selectedUnidadeFiltro || idUnidadeAtual;
              if (unitId) {
                updateSelectedUnidade(unitId);
              }
              router.push(`/processo/${encodeURIComponent(processo.numero_processo)}/visualizar`);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir processo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
