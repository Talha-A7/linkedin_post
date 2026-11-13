import type { Cookie } from "@playwright/test";

/** Decodes the Supabase auth cookie (possibly split into .0, .1 … chunks) written by @supabase/ssr. */
export function readSessionFromCookies(cookies: Cookie[]): { access_token: string; user: { id: string } } {
  const auth = cookies.filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
  if (!auth.length) throw new Error("No Supabase auth cookie found. Did the guest sign-in fail?");
  auth.sort((a, b) => chunkIndex(a.name) - chunkIndex(b.name));
  let raw = auth.map((c) => decodeURIComponent(c.value)).join("");
  if (raw.startsWith("base64-")) raw = Buffer.from(raw.slice(7), "base64url").toString("utf8");
  return JSON.parse(raw);
}

function chunkIndex(name: string) {
  const m = name.match(/\.(\d+)$/);
  return m ? Number(m[1]) : -1;
}
