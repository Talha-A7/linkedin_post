"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isNetworkError, OFFLINE_MESSAGE } from "@/lib/net-errors";
import { ErrorNote, Spinner } from "./ui";

// Starts a guest session (Supabase anonymous sign-in) so people can try the app without an account.
export function StartButton({ href, children, variant = "primary" }: { href: string; children: React.ReactNode; variant?: "primary" | "ghost" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError(OFFLINE_MESSAGE);
      setBusy(false);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        setError(isNetworkError(error) ? OFFLINE_MESSAGE : "Guest access isn't available right now. Please sign in with your email below.");
        setBusy(false);
        return;
      }
    }
    router.push(href);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button onClick={start} disabled={busy} className={`${variant === "primary" ? "btn-primary" : "btn-ghost"} px-6 py-3 text-base`}>
        {busy && <Spinner />} {children}
      </button>
      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}
