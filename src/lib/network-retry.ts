/**
 * Shared network error detection and retry utilities.
 */

/** Detect network errors eligible for retry (fetch failures, connection resets). */
export function isNetworkError(err: unknown): boolean {
  if (
    err instanceof TypeError &&
    (err.message.includes('Failed to fetch') ||
      err.message.includes('Load failed') ||
      err.message.includes('NetworkError'))
  )
    return true;
  if (
    typeof err === 'string' &&
    (err.includes('Failed to fetch') || err.includes('Load failed'))
  )
    return true;
  return false;
}

/** Retry an async function on network errors with exponential backoff. */
export async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 2,
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < maxRetries && isNetworkError(err)) {
        const delay = 2000 * (attempt + 1);
        console.warn(
          `[RETRY] ${label}: tentativa ${attempt + 1} falhou (rede), aguardando ${delay}ms...`,
        );
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`${label}: todas as tentativas falharam`);
}
