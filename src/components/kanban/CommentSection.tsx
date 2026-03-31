"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  Lock,
  Users,
  Globe,
  Reply,
  Eye,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { MentionDropdown } from '@/components/ui/mention-dropdown';
import { useMencoesEditor } from '@/hooks/use-mencoes-editor';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  getObservacoes,
  createObservacao,
  updateObservacao,
  deleteObservacao,
  getMencoesNaoLidas,
  marcarMencaoVista,
} from '@/lib/api/observacoes-api-client';
import { getTeamDetail } from '@/lib/api/teams-api-client';
import type { Observacao, ObservacaoEscopo, TeamMember } from '@/types/teams';

interface CommentSectionProps {
  processoNumero: string;
  equipeId: string;
  usuario: string | null;
}

function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const scopeConfig: Record<ObservacaoEscopo, { label: string; Icon: React.ElementType; className: string }> = {
  pessoal: { label: 'Pessoal', Icon: Lock,  className: 'bg-muted/50 text-muted-foreground border-muted' },
  equipe:  { label: 'Equipe',  Icon: Users, className: 'bg-info-light text-info border-info/20' },
  global:  { label: 'Global',  Icon: Globe, className: 'bg-success-light text-success border-success/20' },
};

const obsEscopoOptions: { value: ObservacaoEscopo; label: string; Icon: React.ElementType }[] = [
  { value: 'pessoal', label: 'Pessoal', Icon: Lock },
  { value: 'equipe',  label: 'Equipe',  Icon: Users },
  { value: 'global',  label: 'Global',  Icon: Globe },
];

export function CommentSection({ processoNumero, equipeId, usuario }: CommentSectionProps) {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Observacoes state
  const [observacoes, setObservacoes] = useState<Observacao[]>([]);
  const [isLoadingObs, setIsLoadingObs] = useState(false);
  const [isSendingObs, setIsSendingObs] = useState(false);
  const [obsConteudo, setObsConteudo] = useState('');
  const [obsEscopo, setObsEscopo] = useState<ObservacaoEscopo>('equipe');
  const [filterEscopo, setFilterEscopo] = useState<'todos' | ObservacaoEscopo>('todos');

  // @mencao state
  const [membrosEquipe, setMembrosEquipe] = useState<TeamMember[]>([]);
  const mencoeEditor = useMencoesEditor(membrosEquipe, usuario);
  const mencoeReply = useMencoesEditor(membrosEquipe, usuario);

  // Badge de mencoes nao lidas
  const [mencoesBadge, setMencoesBadge] = useState(0);

  // Respostas inline
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyConteudo, setReplyConteudo] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);

  // Edicao de observacoes
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
      const result = await getObservacoes(processoNumero, equipeId, usuario);
      if (!('error' in result)) {
        setObservacoes(result);
        setTimeout(scrollToBottom, 100);
        for (const obs of result) {
          const temMencaoNaoVista = obs.mencoes?.some(
            m => m.usuario_mencionado === usuario && !m.visto_em
          );
          if (temMencaoNaoVista) {
            marcarMencaoVista(processoNumero, obs.id, usuario);
          }
        }
      }
    } finally {
      setIsLoadingObs(false);
    }
  }, [processoNumero, equipeId, usuario, scrollToBottom]);

  const loadMembrosEBadge = useCallback(async () => {
    if (!usuario) return;
    const [teamResult, badgeResult] = await Promise.all([
      getTeamDetail(equipeId, usuario),
      getMencoesNaoLidas(processoNumero, usuario),
    ]);
    if (!('error' in teamResult)) {
      setMembrosEquipe(teamResult.membros);
    }
    if (!('error' in badgeResult)) {
      setMencoesBadge(badgeResult.count);
    }
  }, [equipeId, usuario, processoNumero]);

  useEffect(() => {
    loadObservacoes();
    loadMembrosEBadge();
  }, [loadObservacoes, loadMembrosEBadge]);

  const handleSendObs = async () => {
    if (!usuario || !obsConteudo.trim() || isSendingObs) return;
    setIsSendingObs(true);
    const equipeParaEnvio = obsEscopo === 'equipe' ? equipeId : undefined;
    try {
      const mencoes = mencoeEditor.extrairMencoes(obsConteudo);
      const result = await createObservacao(
        processoNumero, usuario, obsConteudo.trim(),
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
        processoNumero, usuario, replyConteudo.trim(),
        obsEscopo, obsEscopo === 'equipe' ? equipeId : undefined,
        mencoes, parentId,
      );
      if ('error' in result) {
        toast({ title: "Erro ao responder", description: result.error, variant: "destructive" });
        return;
      }
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
      const result = await updateObservacao(processoNumero, editingId, usuario, editConteudo);
      if ('error' in result) {
        toast({ title: "Erro ao atualizar", description: result.error, variant: "destructive" });
        return;
      }
      setObservacoes(prev => prev.map(o => o.id === editingId ? result : o));
      setEditingId(null);
      setEditConteudo('');
      toast({ title: "Observacao atualizada", duration: 2000 });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteObs = async (observacaoId: string, parentId?: string) => {
    if (!usuario) return;
    const result = await deleteObservacao(processoNumero, observacaoId, usuario);
    if ('error' in result) {
      toast({ title: "Erro ao excluir", description: result.error, variant: "destructive" });
      return;
    }
    if (parentId) {
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

  const renderizarConteudo = (html: string) => {
    return (
      <div
        className="text-sm text-foreground/90 whitespace-pre-wrap break-words max-w-none [&>p]:m-0 [&>ul]:my-2 [&>ol]:my-2 [&>strong]:font-bold [&>em]:italic"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  const observacoesFiltradas = filterEscopo === 'todos'
    ? observacoes
    : observacoes.filter(o => (o.escopo ?? 'pessoal') === filterEscopo);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 flex-shrink-0">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Observacoes da equipe</h3>
        {mencoesBadge > 0 && (
          <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-2xs font-bold">
            {mencoesBadge}
          </span>
        )}
      </div>

      {/* Obs input */}
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
              placeholder="Escreva uma observacao... use @ para mencionar"
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
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xs font-semibold">
                  {getInitials(obs.usuario)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-medium text-foreground truncate">
                      {obs.usuario}
                    </span>
                    <span
                      className="text-2xs text-muted-foreground flex-shrink-0 cursor-default"
                      title={format(new Date(obs.criado_em), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                    >
                      {formatDistanceToNow(new Date(obs.criado_em), { addSuffix: true, locale: ptBR })}
                    </span>
                    <span className={cn(
                      'inline-flex items-center gap-0.5 text-2xs px-1.5 py-0.5 rounded border flex-shrink-0',
                      scopeClassName
                    )}>
                      <ScopeIcon className="h-2.5 w-2.5" />
                      {scopeLabel}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
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

                  {/* Edicao inline ou conteudo */}
                  {editingId === obs.id ? (
                    <div className="mt-2 space-y-2 p-2 border border-primary/30 rounded bg-primary/5">
                      <RichTextEditor
                        value={editConteudo}
                        onChange={setEditConteudo}
                        placeholder="Editar observacao..."
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
                          className="inline-flex items-center gap-0.5 text-2xs text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5"
                          title={m.visto_em ? format(new Date(m.visto_em), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR }) : ''}
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
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xs font-semibold">
                            {getInitials(resp.usuario)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-[11px] font-medium truncate">{resp.usuario}</span>
                              <span
                                className="text-2xs text-muted-foreground cursor-default"
                                title={format(new Date(resp.criado_em), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
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
                        <textarea
                          autoFocus
                          value={replyConteudo}
                          onChange={(e) => setReplyConteudo(e.target.value)}
                          onKeyDown={(e) => {
                            if (mencoeReply.showDropdown && e.key === 'Escape') {
                              mencoeReply.handleCloseMentionDropdown();
                              return;
                            }
                            if (e.key === 'Enter' && !e.shiftKey && !mencoeReply.showDropdown) {
                              e.preventDefault();
                              handleSendReply(obs.id);
                            }
                            if (e.key === 'Escape' && !mencoeReply.showDropdown) {
                              setReplyingToId(null);
                            }
                          }}
                          placeholder="Responder... use @ para mencionar"
                          rows={2}
                          className="w-full resize-none rounded-lg border border-input bg-white dark:bg-background px-2 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
    </>
  );
}
