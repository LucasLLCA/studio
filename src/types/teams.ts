export interface TeamMember {
  id: string;
  equipe_id: string;
  usuario: string;
  papel: string;
  criado_em: string;
}

export interface Team {
  id: string;
  nome: string;
  descricao?: string | null;
  proprietario_usuario: string;
  criado_em: string;
  atualizado_em: string;
  total_membros: number;
}

export interface TeamDetail {
  id: string;
  nome: string;
  descricao?: string | null;
  proprietario_usuario: string;
  criado_em: string;
  atualizado_em: string;
  membros: TeamMember[];
}

/** Personal process group (formerly "Tag") */
export interface GrupoProcesso {
  id: string;
  nome: string;
  usuario: string;
  cor?: string | null;
  criado_em: string;
  atualizado_em: string;
  total_processos: number;
}

/** @deprecated Use GrupoProcesso instead */
export type Tag = GrupoProcesso;

export interface SavedProcesso {
  id: string;
  tag_id: string;
  numero_processo: string;
  numero_processo_formatado?: string | null;
  nota?: string | null;
  criado_em: string;
}

export interface GrupoProcessoWithProcessos {
  id: string;
  nome: string;
  usuario: string;
  cor?: string | null;
  criado_em: string;
  atualizado_em: string;
  processos: SavedProcesso[];
}

/** @deprecated Use GrupoProcessoWithProcessos instead */
export type TagWithProcessos = GrupoProcessoWithProcessos;

export interface SharedWithMeItem {
  compartilhamento_id: string;
  tag_id: string;
  tag_nome: string;
  tag_cor?: string | null;
  compartilhado_por: string;
  equipe_nome?: string | null;
  equipe_destino_id?: string | null;
  criado_em: string;
  processos: (SavedProcesso & { team_tags?: TeamTag[] })[];
}

export interface ShareRecord {
  id: string;
  tag_id: string;
  compartilhado_por: string;
  equipe_destino_id?: string | null;
  usuario_destino?: string | null;
  criado_em: string;
}

export type ObservacaoEscopo = 'pessoal' | 'equipe' | 'global';

export interface ObservacaoMencao {
  id: string;
  observacao_id: string;
  usuario_mencionado: string;
  visto_em: string | null;
  criado_em: string;
}

export interface Observacao {
  id: string;
  numero_processo: string;
  usuario: string;
  conteudo: string;
  escopo?: ObservacaoEscopo;
  equipe_id?: string | null;
  parent_id?: string | null;
  mencoes?: ObservacaoMencao[];
  respostas?: Observacao[];
  criado_em: string;
  atualizado_em: string;
}

export interface ProcessoSalvoCheck {
  salvo: boolean;
  // Backend still returns field as "tags" — kept for API compatibility
  tags: { tag_id: string; tag_nome: string; tag_cor: string | null }[];
}

export interface TeamTag {
  id: string;
  equipe_id?: string | null;
  nome: string;
  cor?: string | null;
  criado_por: string;
  criado_em: string;
  atualizado_em: string;
}

export interface ProcessoTeamTag {
  id: string;
  team_tag_id: string;
  numero_processo: string;
  adicionado_por: string;
  criado_em: string;
}

export interface KanbanColumn {
  tag_id: string;
  tag_nome: string;
  tag_cor?: string | null;
  criado_por: string;
  processos: KanbanProcesso[];
}

export interface KanbanProcesso extends SavedProcesso {
  team_tags: TeamTag[];
}

export interface KanbanBoard {
  equipe: TeamDetail;
  colunas: KanbanColumn[];
  team_tags: TeamTag[];
}
