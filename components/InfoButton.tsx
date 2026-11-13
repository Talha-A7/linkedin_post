"use client";

import { useId, useRef, type ReactNode } from "react";

// The ⓘ icon: opens a modal popup with step-by-step help.
export function InfoButton({ title, children, label }: { title: string; children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label={`Help: ${title}`}
        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        <span className="grid size-5 place-items-center rounded-full border-[1.5px] border-brand bg-brand-soft font-serif text-xs font-bold italic">
          i
        </span>
        {label}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(560px,calc(100vw-32px))] rounded-2xl border border-border bg-surface p-0 text-text"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 id={titleId} className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="text-2xl leading-none text-muted">
            ×
          </button>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm leading-relaxed [&_code]:rounded [&_code]:bg-brand-soft [&_code]:px-1.5 [&_code]:text-brand [&_li]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5">
          {children}
        </div>
      </dialog>
    </>
  );
}

export function Tip({ children }: { children: ReactNode }) {
  return <div className="rounded-lg bg-brand-soft px-3 py-2.5">{children}</div>;
}
