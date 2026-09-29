import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Where the sign-in link in the email lands. Handles both link styles Supabase can send:
// ?token_hash=...&type=email (works on any device) and ?code=... (same browser only).
export async function GET(request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") || "email";
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") || "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = await createClient();
  let error = null;
  if (tokenHash) ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type }));
  else if (code) ({ error } = await supabase.auth.exchangeCodeForSession(code));
  else error = new Error("missing token");

  if (error) return NextResponse.redirect(new URL(`/login?error=1&next=${encodeURIComponent(next)}`, url.origin));
  return NextResponse.redirect(new URL(next, url.origin));
}
