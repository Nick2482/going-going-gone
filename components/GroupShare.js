"use client";
import { useState } from "react";
import { GROUP_NAME, GROUP_URL } from "@/lib/site";

// Facebook won't let websites post into groups, so this copies the lot's link
// and opens the group in a new tab, ready to paste into a new post.
export default function GroupShare({ message, label = `Post in ${GROUP_NAME}`, big = false }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 8000); };
    try {
      navigator.clipboard.writeText(message).then(done, () => window.prompt("Copy this, then paste it into a new post in the group:", message));
    } catch {
      window.prompt("Copy this, then paste it into a new post in the group:", message);
    }
  }

  return (
    <div className="group-share">
      <a className={`btn btn-fb${big ? " btn-lg" : ""}`} href={GROUP_URL} target="_blank" rel="noopener noreferrer" onClick={copy}>
        <GroupIcon /> {label}
      </a>
      {copied ? <span className="hint" role="status">Link copied. In the group, tap <strong>Write something…</strong> and paste it in.</span> : null}
    </div>
  );
}

function GroupIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" /><path d="M2.8 19.5c.7-3.2 3.1-5 6.2-5s5.5 1.8 6.2 5" /><circle cx="17" cy="9" r="2.6" /><path d="M16.6 14.4c2.4.2 4 1.8 4.6 4.6" />
    </svg>
  );
}
