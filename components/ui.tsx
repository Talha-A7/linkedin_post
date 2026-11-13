"use client";

import { useState, type ReactNode } from "react";

export type Choice<T extends string> = { value: T; label: string; hint?: string };

// Clickable answer options for the questionnaire.
export function Chips<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Choice<T>[];
  value: T | "";
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
}) {
  const cols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[columns];
  return (
    <div role="radiogroup" className={`grid gap-2.5 ${cols}`}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`rounded-xl border px-4 py-3 text-left transition ${
              active ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-border bg-surface hover:border-muted"
            }`}
          >
            <span className="block text-sm font-semibold">{o.label}</span>
            {o.hint && <span className="mt-0.5 block text-xs text-muted">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          // Clipboard blocked (permissions, insecure context): tell the user instead of failing silently.
          setState("failed");
        }
        setTimeout(() => setState("idle"), 2000);
      }}
      className={`shrink-0 whitespace-nowrap rounded-full border border-border px-3 py-1 text-xs font-semibold hover:bg-surface-2 ${className}`}
    >
      {state === "copied" ? "Copied ✓" : state === "failed" ? "Copy failed. Select the text instead" : "Copy"}
    </button>
  );
}

export function CharCount({ text, limit }: { text: string; limit: number }) {
  const n = [...text].length;
  return (
    <span className={`text-xs tabular-nums ${n > limit ? "font-semibold text-bad" : "text-muted"}`}>
      {n.toLocaleString()} / {limit.toLocaleString()}
    </span>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <p role="alert" className="rounded-xl border border-bad/40 bg-bad/10 px-4 py-3 text-sm text-bad">{children}</p>;
}

export function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />;
}
