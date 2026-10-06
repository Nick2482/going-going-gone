import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

// A click on a local business: count it (just a number), then send the visitor on to their website.
export async function GET(request, { params }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.redirect(SITE_URL, 302);
  const supabase = await createClient();
  const { data: url } = await supabase.rpc("business_click", { p_id: id });
  if (!url || !/^https?:\/\//i.test(url)) return NextResponse.redirect(SITE_URL, 302);
  // Tag the visit so the business can see it came from Going Going Gone in their own stats.
  let dest = url;
  try {
    const u = new URL(url);
    if (!u.searchParams.has("utm_source")) {
      u.searchParams.set("utm_source", "going-going-gone");
      u.searchParams.set("utm_medium", "referral");
    }
    dest = u.toString();
  } catch {}
  return NextResponse.redirect(dest, 302);
}
