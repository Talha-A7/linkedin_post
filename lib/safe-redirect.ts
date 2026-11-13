/**
 * Returns `next` only if it is a same-site path, otherwise `fallback`.
 * Rejects "//host", "/\host" (browsers treat "\" like "/"), absolute URLs and control characters.
 */
export function safeNextPath(next: unknown, fallback = "/dashboard"): string {
  if (typeof next !== "string" || !next.startsWith("/")) return fallback;
  if (/[\\\u0000-\u001f]/.test(next) || next.startsWith("//")) return fallback;
  try {
    const url = new URL(next, "http://localhost");
    if (url.host !== "localhost") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
