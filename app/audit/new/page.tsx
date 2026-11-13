import { Suspense } from "react";
import { PageLoading } from "@/components/Loading";
import { AppHeader } from "@/components/AppHeader";
import { getUser } from "@/lib/supabase/server";
import { AuditWizard } from "./AuditWizard";

async function NewAuditContent() {
  const { user } = await getUser();
  // Sign In with LinkedIn (OIDC) only gives us name, email and photo; LinkedIn's API can't return the
  // rest of a profile, so we use what we have and still ask for the PDF.
  const providers: string[] = user?.app_metadata?.providers ?? (user?.app_metadata?.provider ? [user.app_metadata.provider] : []);
  const meta = user?.user_metadata ?? {};
  const linkedin = providers.includes("linkedin_oidc")
    ? { firstName: String(meta.given_name ?? meta.name ?? meta.full_name ?? "").split(" ")[0], hasPhoto: !!(meta.picture ?? meta.avatar_url) }
    : null;
  return (
    <>
      <AppHeader email={user?.email} signedIn={!!user} guest={!!user?.is_anonymous} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">New LinkedIn audit</h1>
        <AuditWizard linkedin={linkedin} />
      </main>
    </>
  );
}

export default function NewAudit() {
  return (
    <Suspense fallback={<PageLoading />}>
      <NewAuditContent />
    </Suspense>
  );
}
