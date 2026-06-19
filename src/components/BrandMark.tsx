export function BrandMark() {
  return (
    <span className="brand-mark" aria-label="WORLDPRINT">
      <svg className="brand-glyph" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M8 24h32M24 5c5.5 5 8.2 11.4 8.2 19S29.5 38 24 43M24 5c-5.5 5-8.2 11.4-8.2 19S18.5 38 24 43" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15 18c5.8-4.4 12.1-4.4 18 0M12.5 25.8c7.3-4.8 15.6-4.8 23 0M16.8 33c4.8-2.6 9.6-2.6 14.4 0" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
      </svg>
      <span>
        <strong>WORLDPRINT</strong>
        <small>Read the world.</small>
      </span>
    </span>
  );
}

