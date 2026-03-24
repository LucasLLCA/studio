/**
 * Authoritative module definitions (mirrors backend api/rbac.py MODULOS).
 */
export const MODULOS = {
  home: "Início",
  processo_visualizar: "Visualizar Processo",
  equipes: "Equipes",
  bi: "Business Intelligence",
  fluxos: "Fluxos de Processos",
  admin: "Administração",
  financeiro: "Dados Financeiros",
} as const;

export type ModuloKey = keyof typeof MODULOS;
