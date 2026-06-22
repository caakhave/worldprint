export function EntryAtlasVisual() {
  return (
    <figure className="entry-atlas-visual" aria-label="Mystery Map atlas preview" data-testid="entry-atlas-visual">
      <svg viewBox="0 0 760 330" role="img" aria-labelledby="entry-atlas-title entry-atlas-desc">
        <title id="entry-atlas-title">Mystery Map atlas preview</title>
        <desc id="entry-atlas-desc">A stylized mystery choropleth atlas plate with globe grid, map panels, and data marks.</desc>
        <defs>
          <linearGradient id="entry-atlas-ink" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#11363d" />
            <stop offset="1" stopColor="#071c24" />
          </linearGradient>
          <linearGradient id="entry-atlas-water" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#0b2a32" />
            <stop offset="1" stopColor="#102f37" />
          </linearGradient>
          <pattern id="entry-atlas-grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M34 0H0V34" fill="none" stroke="rgba(164, 224, 214, 0.13)" strokeWidth="1" />
          </pattern>
          <filter id="entry-atlas-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect className="atlas-frame" x="5" y="5" width="750" height="320" rx="24" />
        <rect className="atlas-paper" x="23" y="23" width="714" height="284" rx="18" />
        <rect x="23" y="23" width="714" height="284" rx="18" fill="url(#entry-atlas-grid)" opacity="0.74" />

        <g className="atlas-globe" transform="translate(77 47)">
          <circle cx="114" cy="114" r="104" fill="url(#entry-atlas-water)" />
          <circle cx="114" cy="114" r="104" fill="none" stroke="rgba(133, 228, 213, 0.42)" strokeWidth="2" />
          <ellipse cx="114" cy="114" rx="55" ry="104" fill="none" stroke="rgba(133, 228, 213, 0.22)" strokeWidth="1.5" />
          <ellipse cx="114" cy="114" rx="89" ry="104" fill="none" stroke="rgba(133, 228, 213, 0.16)" strokeWidth="1.5" />
          <path d="M10 114H218M114 10V218M31 62H197M31 166H197" fill="none" stroke="rgba(133, 228, 213, 0.16)" strokeWidth="1.5" />
          <path className="atlas-land high" d="M45 90l28-26 36 8 16 24-18 19 10 29-35 18-32-13-13-30z" />
          <path className="atlas-land mid" d="M127 72l38-18 41 19-11 30 23 15-16 42-51 8-18-36 18-24z" />
          <path className="atlas-land low" d="M93 159l26-7 22 20-10 32-30 12-20-24z" />
          <path className="atlas-route" d="M42 178C92 129 146 122 207 81" />
          <circle className="atlas-pin" cx="42" cy="178" r="5" />
          <circle className="atlas-pin" cx="207" cy="81" r="5" />
        </g>

        <g className="atlas-map-card" transform="translate(340 55)">
          <rect x="0" y="0" width="314" height="142" rx="14" />
          <path className="atlas-contour" d="M28 92C74 34 121 34 160 66s79 26 124-16" />
          <path className="atlas-cell low" d="M38 81l40-33 46 13 4 46-38 21-43-9z" />
          <path className="atlas-cell mid" d="M123 63l47-30 54 18-12 57-54 13-34-22z" />
          <path className="atlas-cell high" d="M218 61l46-20 30 27-14 46-49 12-24-30z" />
          <path className="atlas-cell peak" d="M142 105l58-7 35 26-42 24-49-8z" />
          <g className="atlas-bars" transform="translate(32 111)">
            <rect x="0" y="0" width="42" height="7" rx="3.5" />
            <rect x="54" y="0" width="86" height="7" rx="3.5" />
            <rect x="152" y="0" width="118" height="7" rx="3.5" />
          </g>
        </g>

        <g className="atlas-mini" transform="translate(343 224)">
          <rect x="0" y="0" width="88" height="54" rx="10" />
          <path className="atlas-mini-map" d="M16 31l19-14 21 7 18-12 3 23-24 8-19-6-18 8z" />
          <circle cx="70" cy="17" r="4" />
        </g>
        <g className="atlas-mini" transform="translate(456 224)">
          <rect x="0" y="0" width="88" height="54" rx="10" />
          <path className="atlas-mini-map alt" d="M13 23l24-11 20 13 18-4-6 23-26-3-15 7-17-11z" />
          <circle cx="23" cy="39" r="4" />
        </g>
        <g className="atlas-mini" transform="translate(569 224)">
          <rect x="0" y="0" width="88" height="54" rx="10" />
          <path className="atlas-mini-map peak" d="M14 34l15-20 24 5 10-8 15 18-9 17-27-5-19 5z" />
          <circle cx="62" cy="20" r="4" />
        </g>
      </svg>
    </figure>
  );
}
