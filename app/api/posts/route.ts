import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { PostInput, type AuditReport } from "@/lib/schemas";
import { runPost, type PostContext } from "@/lib/claude";
import { errorResponse } from "@/lib/api-errors";
import { getCta } from "@/lib/settings";

export const maxDuration = 300;

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const parsed = PostInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Describe your scenario in at least a couple of sentences." }, { status: 400 });
  }
  const input = parsed.data;

  // Optional: reuse the audience and positioning from one of the user's audits (RLS keeps this to their own rows).
  let context: PostContext | undefined;
  if (input.auditId) {
    const { data } = await supabase.from("audits").select("ideal_customer, report").eq("id", input.auditId).maybeSingle();
    if (data) {
      const report = data.report as AuditReport;
      context = { audience: data.ideal_customer, positioning: report.rewrites?.headlines?.[0] };
    }
  }

  try {
    if (input.includeCta) context = { ...context, cta: await getCta(supabase) };
    const result = await runPost(input, context);
    const { data, error } = await supabase
      .from("posts")
      .insert({
        audit_id: context?.audience ? input.auditId : null,
        scenario: input.scenario,
        goal: input.goal,
        tone: input.tone,
        result,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id, result });
  } catch (err) {
    return errorResponse(err);
  }
}
