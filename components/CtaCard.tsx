"use client";

import { useEffect, useState } from "react";
import type { CtaSettings } from "@/lib/schemas";
import { friendlyError } from "@/lib/net-errors";
import { InfoButton } from "./InfoButton";
import { ErrorNote, Spinner } from "./ui";

/**
 * "My call to action": the user's standing offer, saved once and added to the end of posts.
 * Calls onChange(include) so the composer knows whether to ask the API to add it.
 */
export function CtaCard({ onChange }: { onChange: (include: boolean) => void }) {
  const [state, setState] = useState<"loading" | "view" | "edit">("loading");
  const [cta, setCta] = useState<CtaSettings | null>(null);
  const [include, setInclude] = useState(true);
  const [offer, setOffer] = useState("");
  const [url, setUrl] = useState("");
  const [linkInBody, setLinkInBody] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : { cta: null }))
      .then((b) => {
        if (cancelled) return;
        setCta(b.cta ?? null);
        setState("view");
      })
      .catch(() => !cancelled && setState("view"));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => onChange(!!cta && include), [cta, include, onChange]);

  function startEdit() {
    setOffer(cta?.offer ?? "");
    setUrl(cta?.url ?? "");
    setLinkInBody(cta?.linkInBody ?? false);
    setError("");
    setState("edit");
  }

  async function save(remove = false) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(remove ? { offer: "", url: "", linkInBody: false } : { offer, url, linkInBody }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't save. Please try again.");
      setCta(body.cta ?? null);
      setInclude(true);
      setState("view");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSaving(false);
    }
  }

  const help = (
    <InfoButton title="Why one call to action?" label="Why?">
      <p>In our audit of top LinkedIn posts, the creators with the most likes end <b>every</b> post with the same single offer, such as a free guide or a newsletter, and always <b>after</b> the story.</p>
      <p>Save yours once. We add it to the end of each post in your voice. The link goes in the first comment by default, because links in the post can reduce reach for smaller accounts.</p>
    </InfoButton>
  );

  if (state === "loading") return <div className="h-16 animate-pulse rounded-xl bg-surface-2" aria-label="Loading your call to action" />;

  if (state === "edit") {
    return (
      <div className="space-y-3 rounded-xl border border-brand/50 p-4">
        <div className="flex justify-between gap-3"><span className="text-sm font-semibold">My call to action</span>{help}</div>
        <div>
          <label htmlFor="cta-offer" className="label">What do you offer?</label>
          <input id="cta-offer" className="input" value={offer} onChange={(e) => setOffer(e.target.value)} maxLength={200}
            placeholder="e.g. my free 30-page guide to starting a one-person business" />
        </div>
        <div>
          <label htmlFor="cta-url" className="label">Link <span className="font-normal text-muted">(optional)</span></label>
          <input id="cta-url" type="url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} placeholder="https://…" />
        </div>
        <fieldset className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <legend className="sr-only">Where should the link go?</legend>
          <label className="flex items-center gap-2"><input type="radio" name="cta-place" checked={!linkInBody} onChange={() => setLinkInBody(false)} className="accent-[var(--brand)]" /> Link in the first comment (recommended)</label>
          <label className="flex items-center gap-2"><input type="radio" name="cta-place" checked={linkInBody} onChange={() => setLinkInBody(true)} className="accent-[var(--brand)]" /> Link in the post</label>
        </fieldset>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => save()} disabled={saving || offer.trim().length < 3} className="btn-primary">{saving && <Spinner />} Save</button>
          <button type="button" onClick={() => setState("view")} className="btn-ghost">Cancel</button>
          {cta && <button type="button" onClick={() => save(true)} disabled={saving} className="btn-ghost text-bad">Remove</button>}
        </div>
      </div>
    );
  }

  if (!cta) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4 sm:flex-row sm:items-center">
        <div className="flex-1 text-sm">
          <b className="block">Add your call to action</b>
          <span className="text-muted">Save your one standing offer (a guide, newsletter or booking link) and end every post with it.</span>
        </div>
        <div className="flex items-center gap-3">{help}<button type="button" onClick={startEdit} className="btn-ghost shrink-0">Add my CTA</button></div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={include} onChange={(e) => setInclude(e.target.checked)} className="mt-1 size-4 accent-[var(--brand)]" />
          <span>
            <b className="block">End this post with my call to action</b>
            <span className="text-muted">{cta.offer}{cta.url ? ` · link ${cta.linkInBody ? "in the post" : "in the first comment"}` : ""}</span>
          </span>
        </label>
        <button type="button" onClick={startEdit} className="shrink-0 text-sm font-medium text-brand hover:underline">Edit</button>
      </div>
    </div>
  );
}
