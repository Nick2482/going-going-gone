import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap narrow" style={{ textAlign: "center" }}>
      <h1 className="page-title">Gone</h1>
      <p className="hint" style={{ marginBottom: 20 }}>This lot or page doesn&apos;t exist, or it has been withdrawn.</p>
      <Link className="btn btn-primary" href="/">Browse open lots</Link>
    </div>
  );
}
