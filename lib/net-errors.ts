/** Turns low-level network failures into a message people understand. */
export const OFFLINE_MESSAGE = "You seem to be offline or the connection dropped. Check your internet and try again.";

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (err instanceof TypeError) return true; // fetch() rejects with TypeError on network failure
  const e = err as { name?: string; message?: string; status?: number } | null;
  return !!e && (e.name === "AuthRetryableFetchError" || /failed to fetch|network|load failed/i.test(e.message ?? ""));
}

export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (isNetworkError(err)) return OFFLINE_MESSAGE;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
