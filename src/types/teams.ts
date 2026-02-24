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

export interface Tag {
  id: string;
  nome: string;
  usuario: string;
  cor?: string | null;
  criado_em: string;
  atualizado_em: string;
  total_processos: number;
}

export interface SavedProcesso {
  id: string;
  tag_id: string;
  numero_processo: string;
  numero_processo_formatado?: string | null;
  nota?: string | null;
  criado_em: string;
}

export interface TagWithProcessos {
  id: string;
  nome: string;
  usuario: string;
  cor?: string | null;
  criado_em: string;
  atualizado_em: string;
  processos: SavedProcesso[];
}

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

export interface Observacao {
  id: string;
  numero_processo: string;
  usuario: string;
  conteudo: string;
  equipe_id?: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface ProcessoSalvoCheck {
  salvo: boolean;
  tags: { tag_id: string; tag_nome: string; tag_cor: string | null }[];
}

export interface TeamTag {
  id: string;
  equipe_id: string;
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
  compartilhamento_id: string;
  tag_id: string;
  tag_nome: string;
  tag_cor?: string | null;
  compartilhado_por: string;
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
