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
    </figure>
  );
}
