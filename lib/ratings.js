// Turns a member_summary() result into a short line like "100% positive · 12 ratings".
export function ratingLine(s) {
  if (!s) return "";
  const pos = Number(s.positive || 0), neu = Number(s.neutral || 0), neg = Number(s.negative || 0);
  const total = pos + neu + neg;
  if (!total) return "No ratings yet";
  const scored = pos + neg;
  const pct = scored ? Math.round((pos / scored) * 100) : 100;
  return `${pct}% positive · ${total} rating${total === 1 ? "" : "s"}`;
}

export const SCORE_LABEL = { 1: "Positive", 0: "Neutral", "-1": "Negative" };
