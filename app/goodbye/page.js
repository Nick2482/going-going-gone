import Link from "next/link";

export const metadata = { title: "Account deleted", robots: { index: false } };

export default function Goodbye() {
  return (
    <div className="wrap prose">
      <h1 className="page-title">Account deleted</h1>
      <p>Your account and everything linked to it have been deleted. Thanks for using Going Going Gone.</p>
      <p>You&apos;re welcome back any time. Just sign in with your email to start again.</p>
      <p><Link href="/" className="btn btn-primary">Back to the lots</Link></p>
    </div>
  );
}
