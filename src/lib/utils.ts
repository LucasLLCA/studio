import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Remove toda formatação de um número de processo, retornando apenas dígitos.
 */
export function stripProcessNumber(numero: string): string {
  return numero.replace(/\D/g, '');
}

/**
 * Formata um número de processo no padrão brasileiro
 * Exemplo: 12345678901234567890 -> 12345.678901/2345-67
 */
export function formatProcessNumber(numeroProcesso: string): string {
  // Remove qualquer formatação existente
  const clean = numeroProcesso.replace(/[^\d]/g, '');

  // Se não tem 20 dígitos, retorna o original
  if (clean.length !== 17) {
    return numeroProcesso;
  }

  // Formato: NNNNN.NNNNNN/AAAA-DD
  // 12345 678901 2345 67 89 0
  const parte1 = clean.substring(0, 5);   // 12345
  const parte2 = clean.substring(5, 11);  // 678901
  const parte3 = clean.substring(11, 15); // 2345
  const parte4 = clean.substring(15, 17); // 67

  return `${parte1}.${parte2}/${parte3}-${parte4}`;
}
