// Only allow "next" to point to a page on this site after signing in.
// Blocks tricks like "/\evil.com" or "/%09/evil.com" that browsers treat as another site.
export function safeNext(n) {
  if (typeof n !== "string" || !/^\/(?![/\\])/.test(n) || /[\\\x00-\x1f\x7f]/.test(n)) return "/";
  try {
    const u = new URL(n, "https://x.invalid");
    return u.origin === "https://x.invalid" ? u.pathname + u.search + u.hash : "/";
  } catch {
    return "/";
  }
}
