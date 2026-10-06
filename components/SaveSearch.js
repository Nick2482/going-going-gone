"use client";
import { useState } from "react";
import Link from "next/link";
import { BellIcon } from "@/components/Icons";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// "Email me new matches" on search results. Works out sign-in by asking the database:
// if you're not signed in, it sends you to sign in and brings you back here.
export default function SaveSearch({ q = "", cat = "", charity = false, backTo = "/" }) {
  const supabase = createClient();
  const router = useRouter();
  const [state, setState] = useState("idle"); // idle | busy | saved
  const [error, setError] = useState("");

  async function save() {
    setState("busy");
    setError("");
    const { error: err } = await supabase.rpc("save_search", {
      p_query: q || null, p_category: cat || null, p_charity: Boolean(charity), p_max: null,
    });
    if (err) {
      if (/sign in|permission denied|JWT/i.test(err.message || "")) {
        router.push(`/login?next=${encodeURIComponent(backTo)}`);
        return;
      }
      setState("idle");
      setError(/violates|syntax|fetch/i.test(err.message || "") ? "That didn't save. Please try again." : err.message);
      return;
    }
    setState("saved");
  }

  const what = [q ? `“${q}”` : null, cat || null, charity ? "charity lots" : null].filter(Boolean).join(" in ");

  return (
    <div className="save-search" role="region" aria-label="Search alert">
      <span className="save-search-bell" aria-hidden="true"><BellIcon size={18} /></span>
      {state === "saved" ? (
        <span className="save-search-text"><strong>Alert saved.</strong> We&apos;ll email you when new {what} lots are listed. <Link href="/account#alerts">Manage alerts</Link></span>
      ) : (
        <>
          <span className="save-search-text">Get an email when new <strong>{what}</strong> lots are listed.</span>
          <button type="button" className="btn btn-brass btn-sm" onClick={save} disabled={state === "busy"}>
            {state === "busy" ? "Saving…" : "Email me new matches"}
          </button>
        </>
      )}
      {error ? <span className="error" role="alert" style={{ flexBasis: "100%" }}>{error}</span> : null}
    </div>
  );
}
