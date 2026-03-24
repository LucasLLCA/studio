/**
 * Shared tag color palette.
 * Used by ProcessoKanbanSheet, ObservacoesSheet, SaveProcessoModal, and any tag UI.
 * Backend accepts any hex string (VARCHAR(7)) — no server-side validation needed.
 */
export const TAG_COLORS = [
  // Vivid
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#1e293b',
  // Pastel / light
  '#fca5a5', '#fdba74', '#fde047', '#86efac',
  '#5eead4', '#93c5fd', '#c4b5fd', '#f9a8d4',
  // Deep / dark
  '#991b1b', '#9a3412', '#854d0e', '#166534',
  '#115e59', '#1e40af', '#5b21b6', '#9d174d',
];
