import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";
  return (
    <div className="wrap narrow" style={{ maxWidth: 560 }}>
      <h1 className="page-title">Sign in</h1>
      <p className="page-lead">
        No password needed. Enter your email and we&apos;ll send you a sign-in link. New here? The same form creates your account.
      </p>
      <div className="form-card">
        {sp.error ? <p className="error" style={{ marginBottom: 16 }}>That sign-in link has expired or was already used. Ask for a new one below.</p> : null}
        <LoginForm next={next} />
      </div>
    </div>
  );
}
