import Image from "next/image";

export function EntryAtlasVisual() {
  return (
    <figure className="entry-atlas-visual" data-testid="entry-atlas-visual">
      <video className="entry-atlas-video" autoPlay muted loop playsInline preload="metadata" poster="/images/can-you-geo-atlas-hero.png" aria-hidden="true">
        <source src="/worldprint/hero-loop.webm" type="video/webm" />
        <source src="/worldprint/hero-atlas-loop.webm" type="video/webm" />
        <source src="/worldprint/hero-loop.mp4" type="video/mp4" />
        <source src="/worldprint/hero-atlas-loop.mp4" type="video/mp4" />
      </video>
      <Image
        className="entry-atlas-image"
        src="/images/can-you-geo-atlas-hero.png"
        alt="Stylized atlas globe showing mystery data-map patterns"
        fill
        priority
        sizes="(max-width: 720px) calc(100vw - 2rem), 43rem"
      />
      <div className="entry-atlas-preview" aria-hidden="true">
        <span className="entry-preview-scan" />
        <span className="entry-preview-node entry-preview-node-a" />
        <span className="entry-preview-node entry-preview-node-b" />
        <span className="entry-preview-node entry-preview-node-c" />
        <span className="entry-preview-chip entry-preview-chip-a">Map 1/5</span>
        <span className="entry-preview-chip entry-preview-chip-b">+1000</span>
        <span className="entry-preview-chip entry-preview-chip-c">-100 clue</span>
        <span className="entry-preview-route entry-preview-route-a" />
        <span className="entry-preview-route entry-preview-route-b" />
        <span className="entry-preview-progress">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
    </figure>
  );
}
