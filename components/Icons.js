// Small line icons used across the site. Each inherits the text colour.
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export function SearchIcon({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}
export function PinIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
}
export function TagIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>;
}
export function HomeIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></svg>;
}
export function ClockIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
export function PhotoIcon({ size = 40 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={1.4} aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="m21 16-5-5-8 8" /></svg>;
}
export function HeartIcon({ size = 14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.4C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.8 1.2 5.4 3.1 1.6-1.9 3.3-3.1 5.4-3.1 3.6 0 5.7 3.7 4.2 7.1C19.5 16.4 12 21 12 21Z" /></svg>;
}
