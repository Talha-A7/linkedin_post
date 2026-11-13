// Pure helpers for labelling AI output (no server-only imports, so tests can use them).
import { FORMULAS } from "./formulas";

/** "F7 · Odd-Precision Money Ledger" for library formulas; the writer's own label (e.g. "Story template") otherwise. */
export function hookLabel(code: string): string {
  const f = FORMULAS.find((x) => x.code === code.trim().toUpperCase());
  return f ? `${f.code} · ${f.name}` : code.trim();
}

export function findPlaceholders(...texts: string[]): string[] {
  const found = texts.join("\n").match(/\[[^\[\]\n]{2,160}\]/g) ?? [];
  return [...new Set(found)];
}
