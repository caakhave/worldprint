import Image from "next/image";

export function EntryAtlasVisual() {
  return (
    <figure className="entry-atlas-visual" data-testid="entry-atlas-visual">
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
      </div>
    </figure>
  );
}
