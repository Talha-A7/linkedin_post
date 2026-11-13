import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { AuditInput } from "@/lib/schemas";
import { runAudit } from "@/lib/claude";
import { errorResponse } from "@/lib/api-errors";

export const maxDuration = 300;

const MAX_PDF_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const form = await request.formData();
  const parsed = AuditInput.safeParse({
    profileType: form.get("profileType"),
    goal: form.get("goal"),
    idealCustomer: form.get("idealCustomer"),
    offer: form.get("offer") ?? "",
    proof: form.get("proof") ?? "",
    visuals: form.get("visuals") ?? "",
    profileText: form.get("profileText") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Some answers are missing or too long.", issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  let pdfBase64: string | undefined;
  const file = form.get("pdf");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_PDF_BYTES) return NextResponse.json({ error: "PDF is larger than 5 MB." }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    // Check the file's own signature rather than the browser-reported type.
    if (bytes.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return NextResponse.json({ error: "That file isn't a PDF. On LinkedIn, use Resources → Save to PDF." }, { status: 400 });
    }
    pdfBase64 = bytes.toString("base64");
  }
  if (!pdfBase64 && input.profileText.length < 50) {
    return NextResponse.json({ error: "Upload your profile PDF or paste your profile content." }, { status: 400 });
  }

  try {
    const report = await runAudit(input, pdfBase64);
    const { data, error } = await supabase
      .from("audits")
      .insert({
        profile_type: input.profileType,
        goal: input.goal,
        ideal_customer: input.idealCustomer,
        offer: input.offer,
        overall_score: Math.round(report.overall_score),
        subject_name: report.subject_name,
        report,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id });
  } catch (err) {
    return errorResponse(err);
  }
}
