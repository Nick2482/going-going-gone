// The Going Going Gone mark: a brass gavel on a navy tile.
export function BrandMark({ className = "brand-mark" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="9" fill="#16213a" />
      <g transform="rotate(-38 20 18)">
        <rect x="11" y="9" width="18" height="8.5" rx="2" fill="#e3a649" />
        <rect x="9.5" y="10.5" width="2.2" height="5.5" rx="1" fill="#b8741a" />
        <rect x="28.3" y="10.5" width="2.2" height="5.5" rx="1" fill="#b8741a" />
        <rect x="18.6" y="17" width="2.8" height="15" rx="1.4" fill="#e3a649" />
      </g>
      <rect x="8" y="31" width="14" height="3" rx="1.5" fill="#f3f4f1" />
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
