import Image from "next/image";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export function BrandMark() {
  return (
    <span className="brand-mark" aria-label={BRAND_NAME}>
      <Image
        className="brand-glyph"
        src="/images/brand/cgy-logo-header-96.png"
        alt=""
        width={96}
        height={96}
        priority
        sizes="(max-width: 720px) 40px, 48px"
      />
      <span>
        <strong>{BRAND_NAME}</strong>
        <small>{BRAND_TAGLINE}</small>
      </span>
    </span>
  );
}
