// The Going Going Gone mark: a Monaco-red gavel on a Riva-navy tile.
export function BrandMark({ className = "brand-mark" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="#09212c" />
      <g transform="rotate(-38 20 18)">
        <rect x="11" y="9" width="18" height="8.5" rx="2" fill="#e8213a" />
        <rect x="9.5" y="10.5" width="2.2" height="5.5" rx="1" fill="#a80e1f" />
        <rect x="28.3" y="10.5" width="2.2" height="5.5" rx="1" fill="#a80e1f" />
        <rect x="18.6" y="17" width="2.8" height="15" rx="1.4" fill="#ffffff" />
      </g>
      <rect x="8" y="31" width="14" height="3" rx="1.5" fill="#79c5c8" />
    </svg>
  );
}

export function BrandWord() {
  return (
    <span className="brand-word">
      <span>Going</span><span>Going</span><span>Gone</span>
    </span>
  );
}
