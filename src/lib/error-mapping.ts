/**
 * Maps low-level network/fetch errors to user-friendly messages.
 */
export function mapNetworkErrorToMessage(error: Error): string {
  const msg = error.message.toLowerCase();

  if (error.name === 'AbortError') {
    return 'Timeout: API não respondeu em 10 segundos';
  }
  if (msg.includes('econnreset')) {
    return 'Conexão resetada pelo servidor';
  }
  if (msg.includes('failed to fetch') || msg.includes('load failed')) {
    return 'Serviço indisponível';
  }
  if (msg.includes('timeout')) {
    return 'Timeout na conexão';
  }
  if (msg.includes('network')) {
    return 'Erro de rede';
  }

  return 'Serviço indisponível';
}
