"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/net-errors";
import { ErrorNote, Spinner } from "./ui";

// LinkedIn sign-in needs a LinkedIn developer app connected in Supabase; until then only email is shown.
const LINKEDIN_ENABLED = process.env.NEXT_PUBLIC_LINKEDIN_LOGIN === "true";

export function SignIn({ next = "/dashboard" }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function linkedIn() {
    setError("");
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "linkedin_oidc",
      options: { redirectTo: redirectTo() },
    });
    if (error) setError(friendlyError(error));
  }

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setError(friendlyError(error));
      setState("idle");
    } else setState("sent");
  }

  return (
    <div className="card w-full max-w-sm space-y-4">
      {LINKEDIN_ENABLED && (
        <>
      <button onClick={linkedIn} className="btn w-full bg-[#0a66c2] text-white hover:opacity-90">
        <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
          <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
        </svg>
        Continue with LinkedIn
      </button>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" />
      </div>
        </>
      )}
      {state === "sent" ? (
        <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm">Check <b>{email}</b> for your sign-in link.</p>
      ) : (
        <form onSubmit={magicLink} className="space-y-2.5">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="input" />
          <button disabled={state === "sending"} className={`${LINKEDIN_ENABLED ? "btn-ghost" : "btn-primary"} w-full`}>
            {state === "sending" && <Spinner />} Email me a sign-in link
          </button>
        </form>
      )}
      {error && <ErrorNote>{error}</ErrorNote>}
      <p className="text-xs leading-relaxed text-muted">
        {LINKEDIN_ENABLED ? "Signing in with LinkedIn only shares your name, email and photo. " : ""}LinkedIn doesn't let apps read your full profile, so you'll upload a PDF of it instead. It takes 20 seconds.
      </p>
    </div>
  );
}
