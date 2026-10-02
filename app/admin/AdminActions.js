"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// One admin button. Runs an admin function, asks first if `confirm` is given,
// then refreshes the page so the lists update.
export default function AdminButton({ fn, args, label, confirm, tone = "ghost" }) {
  const supabase = createClient();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc(fn, args);
    setBusy(false);
    if (err) return setError(err.message || "That didn't work. Try again.");
    router.refresh();
  }

  return (
    <>
      <button type="button" className={`btn btn-sm btn-${tone}`} onClick={run} disabled={busy}>
        {busy ? "…" : label}
      </button>
      {error ? <span className="error" role="alert">{error}</span> : null}
    </>
  );
}
