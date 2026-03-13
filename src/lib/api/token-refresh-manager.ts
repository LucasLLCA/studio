/**
 * Module-level singleton that bridges plain fetch functions to React state
 * for transparent SEI token refresh on 422 "Token inválido" errors.
 */

type RefreshFn = () => Promise<string | null>;

let registeredRefreshFn: RefreshFn | null = null;
let inflightRefresh: Promise<string | null> | null = null;

/**
 * Returns true only for 422 responses whose body matches "Token inválido".
 * Distinguishes expired tokens from other 422s (process access denied, validation errors).
 */
export function isTokenInvalidError(status: number, details: unknown): boolean {
  if (status !== 422) return false;

  const text = typeof details === 'string'
    ? details
    : JSON.stringify(details);

  return /token\s+inv[aá]lido/i.test(text);
}

/** React layer registers its refresh callback at mount. */
export function setRefreshFn(fn: RefreshFn): void {
  registeredRefreshFn = fn;
}

/** React layer unregisters on unmount. */
export function clearRefreshFn(): void {
  registeredRefreshFn = null;
}

/**
 * Calls the registered refresh function with mutex deduplication:
 * if a refresh is already in-flight, subsequent callers await the same Promise.
 * Returns the new token on success, or null if refresh failed/unavailable.
 */
export async function executeRefresh(): Promise<string | null> {
  if (!registeredRefreshFn) return null;

  if (inflightRefresh) {
    return inflightRefresh;
  }

  inflightRefresh = registeredRefreshFn().finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}
