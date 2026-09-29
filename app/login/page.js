import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  return (
    <div className="wrap narrow">
      <h1 className="page-title">Sign in</h1>
      <p className="hint" style={{ marginBottom: 24 }}>
        No password needed. Enter your email and we&apos;ll send you a sign-in link and a 6-digit code. New here? The same form creates your account.
      </p>
      {sp.error ? <p className="error" style={{ marginBottom: 16 }}>That sign-in link has expired or was already used. Ask for a new one below.</p> : null}
      <LoginForm next={next} />
    </div>
  );
}
