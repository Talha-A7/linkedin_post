"use client";

import { useState } from "react";
import { LIMITS, type GeneratedPost } from "@/lib/schemas";
import { CharCount, CopyButton } from "./ui";

// Shows the generated post. Clicking a hook swaps it in as the first line.
export function PostResultView({ result }: { result: GeneratedPost }) {
  const [lines] = useState(() => result.post.split("\n"));
  const [hook, setHook] = useState(lines[0]);
  const post = [hook, ...lines.slice(1)].join("\n");

  return (
    <div className="space-y-5">
      {result.formula && (
        <section className="card flex gap-3 bg-brand-soft">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-sm font-bold text-brand-ink" aria-hidden>
            {/^F\d+$/i.test(result.formula.code.trim()) ? result.formula.code.trim().toUpperCase() : "✍️"}
          </span>
          <div className="text-sm">
            <b className="text-base">{/^F\d+$/i.test(result.formula.code.trim()) ? "Formula" : "Structure"}: {result.formula.name}</b>
            <p className="text-muted">{result.formula.why}</p>
          </div>
        </section>
      )}

      {(result.promo_story_first || result.cta_used) && (
        <section className="flex flex-col gap-2 rounded-2xl border border-border bg-surface px-5 py-3 text-sm">
          {result.promo_story_first && (
            <p><b>📣 Promotion detected:</b> <span className="text-muted">we led with the story and kept the offer to the last lines. Pure promo posts get far fewer likes.</span></p>
          )}
          {result.cta_used && <p><b>🔗 Your call to action</b> <span className="text-muted">was added at the end.</span></p>}
        </section>
      )}

      {result.reader_payoff && (
        <section className="rounded-2xl border border-good/40 bg-good/10 px-5 py-3 text-sm">
          <b>🎯 What the reader gets:</b> <span>{result.reader_payoff}</span>
        </section>
      )}

      <section className="card">
        <h2 className="mb-1 text-lg font-semibold">Pick your hook</h2>
        <p className="mb-4 text-sm text-muted">Only the first line or two show before "…see more". This line decides whether anyone reads the rest.</p>
        <div className="space-y-2">
          {result.hooks.map((h, i) => {
            const active = h.text === hook;
            return (
              <button key={i} type="button" onClick={() => setHook(h.text)}
                className={`block w-full rounded-xl border px-4 py-3 text-left transition ${active ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-border hover:border-muted"}`}>
                <span className="text-xs font-semibold uppercase tracking-wide text-brand">{h.pattern}</span>
                <span className="mt-0.5 block font-medium">{h.text}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your post</h2>
          <span className="flex items-center gap-3"><CharCount text={post} limit={LIMITS.post} /><CopyButton text={post} /></span>
        </div>
        {/* LinkedIn-style preview */}
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="size-10 rounded-full bg-surface-2" />
            <span className="text-sm"><b className="block">You</b><span className="text-xs text-muted">Now · 🌐</span></span>
          </div>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed [overflow-wrap:anywhere]">{post}</p>
        </div>
        {result.placeholders.length > 0 && (
          <p className="mt-3 rounded-lg bg-warn/10 px-3 py-2 text-sm text-warn">
            Fill in before posting: {result.placeholders.join(", ")}
          </p>
        )}
      </section>

      {result.reader_read && (
        <details className="card group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span>
              <b>Human-sounding check</b>
              <span className="block text-sm text-muted">
                {result.changes?.length ? `${result.changes.length} AI-sounding phrase${result.changes.length === 1 ? "" : "s"} fixed` : "Nothing needed fixing"}
              </span>
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              result.reader_read === "reads human" ? "bg-good/15 text-good" : result.reader_read === "mixed" ? "bg-warn/15 text-warn" : "bg-bad/15 text-bad"
            }`}>
              {result.reader_read}
            </span>
          </summary>
          {!!result.changes?.length && (
            <ul className="mt-4 space-y-2 text-sm">
              {result.changes.map((c, i) => (
                <li key={i} className="rounded-lg bg-surface-2 px-3 py-2"><b>{c.tell}</b> <span className="text-muted">→ {c.fix}</span></li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">This is how a careful reader would see it, not an AI-detector score.</p>
        </details>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {result.first_comment && (
          <section className="card sm:col-span-3">
            <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">First comment</h3><CopyButton text={result.first_comment} /></div>
            <p className="whitespace-pre-wrap text-sm">{result.first_comment}</p>
            <p className="mt-1.5 text-xs text-muted">Post this as a comment right after publishing. Links inside the post usually cut its reach.</p>
          </section>
        )}
        <section className="card sm:col-span-2"><h3 className="mb-1 font-semibold">🖼 Visual</h3><p className="text-sm text-muted">{result.visual}</p></section>
        <section className="card"><h3 className="mb-1 font-semibold">🕘 When to post</h3><p className="text-sm text-muted">{result.best_time}</p></section>
      </div>
    </div>
  );
}
