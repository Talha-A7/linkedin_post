"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/net-errors";
import { ErrorNote, Spinner } from "./ui";

// Shown to guests: adding an email turns the guest account into a normal one, keeping all audits and posts.
export function SaveWorkBanner() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError("");
    const { error } = await createClient().auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    );
    if (error) {
      setError(friendlyError(error));
      setState("idle");
    } else setState("sent");
  }

  return (
    <section className="card flex flex-col gap-3 border-brand/40 sm:flex-row sm:items-center">
      <div className="flex-1 text-sm">
        <b className="block text-base">You're using a guest session</b>
        <span className="text-muted">Your work is saved in this browser only. Add your email to keep it and open it anywhere.</span>
      </div>
      {state === "sent" ? (
        <p className="rounded-xl bg-brand-soft px-4 py-2.5 text-sm">Check <b>{email}</b> to confirm.</p>
      ) : (
        <form onSubmit={save} className="flex w-full gap-2 sm:w-auto">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="input min-w-0 flex-1 sm:w-56 sm:flex-none" />
          <button disabled={state === "sending"} className="btn-primary shrink-0">{state === "sending" && <Spinner />} Save</button>
        </form>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
    </section>
  );
}
