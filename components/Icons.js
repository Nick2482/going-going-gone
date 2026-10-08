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
export function BellIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>;
}
export function PlaneIcon({ size = 22 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16.5 6a2.1 2.1 0 0 1 3 3L15 13.5l1 7.5-1.5 1.5-2.5-7.5" /><path d="m7 17-3 .5L5.5 19 7 20.5l1.5-3" /></svg>;
}
export function BedIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M3 19V6" /><path d="M3 15h18v4" /><path d="M21 15v-3a3 3 0 0 0-3-3h-7v6" /><circle cx="7" cy="11" r="2" /></svg>;
}
export function CameraIcon({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.5" /></svg>;
}
