import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CtaSettings } from "./schemas";

/** The signed-in user's saved call to action, or null if they haven't set one. RLS limits this to their own row. */
export async function getCta(supabase: SupabaseClient): Promise<CtaSettings | null> {
  const { data, error } = await supabase.from("user_settings").select("cta_offer, cta_url, cta_link_in_body").maybeSingle();
  if (error) throw error;
  if (!data?.cta_offer) return null;
  return { offer: data.cta_offer, url: data.cta_url, linkInBody: data.cta_link_in_body };
}
