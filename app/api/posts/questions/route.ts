import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { QuestionsInput } from "@/lib/schemas";
import { askPostQuestions } from "@/lib/claude";
import { errorResponse } from "@/lib/api-errors";

// Before writing a post: 0-2 quick questions for things only the author knows (opinion, reason, example).
export const maxDuration = 60;

export async function POST(request: Request) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const parsed = QuestionsInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Describe your scenario in at least a couple of sentences." }, { status: 400 });
  }
  try {
    return NextResponse.json(await askPostQuestions(parsed.data));
  } catch (err) {
    return errorResponse(err);
  }
}
