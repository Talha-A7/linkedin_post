import { Suspense } from "react";
import { PageLoading } from "@/components/Loading";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SaveWorkBanner } from "@/components/SaveWorkBanner";
import { AuditReportView } from "@/components/AuditReportView";
import { getUser } from "@/lib/supabase/server";
import type { AuditReport } from "@/lib/schemas";

async function AuditPageContent({ params }: PageProps<"/audit/[id]">) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  const { data } = await supabase.from("audits").select("id, profile_type, goal, report").eq("id", id).maybeSingle();
  if (!data) notFound();

  return (
    <>
      <AppHeader email={user?.email} signedIn={!!user} guest={!!user?.is_anonymous} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {user?.is_anonymous && <div className="mb-6"><SaveWorkBanner /></div>}
        <AuditReportView id={data.id} report={data.report as AuditReport} profileType={data.profile_type} goal={data.goal} />
      </main>
    </>
  );
}

export default function AuditPage(props: PageProps<"/audit/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <AuditPageContent {...props} />
    </Suspense>
  );
}
