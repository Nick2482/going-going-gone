"use client";
import { useRouter, useSearchParams } from "next/navigation";

// Changes the sort order as soon as a new option is picked.
export default function SortSelect({ options, value }) {
  const router = useRouter();
  const params = useSearchParams();

  function change(e) {
    const qs = new URLSearchParams(params.toString());
    if (e.target.value === "ending") qs.delete("sort"); else qs.set("sort", e.target.value);
    qs.delete("page");
    const s = qs.toString();
    router.push(s ? `/?${s}` : "/");
  }

  return (
    <label className="sort">
      <span className="hint">Sort by</span>
      <select className="input" value={value} onChange={change}>
        {Object.entries(options).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
      </select>
    </label>
  );
}
