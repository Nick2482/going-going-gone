"use client";
import { useRouter, useSearchParams } from "next/navigation";

// Picks a category from a single tidy menu instead of a wall of buttons.
export default function CategorySelect({ categories, value }) {
  const router = useRouter();
  const params = useSearchParams();

  function change(e) {
    const qs = new URLSearchParams(params.toString());
    if (e.target.value) qs.set("cat", e.target.value); else qs.delete("cat");
    qs.delete("page");
    const s = qs.toString();
    router.push((s ? `/?${s}` : "/") + "#lots");
  }

  return (
    <label className="sort">
      <span className="hint">Category</span>
      <select className="input" value={value || ""} onChange={change}>
        <option value="">All categories</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </label>
  );
}
