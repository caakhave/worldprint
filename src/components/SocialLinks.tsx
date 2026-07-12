"use client";

import { trackAnalyticsEvent } from "@/lib/site/analytics";
import { OFFICIAL_SOCIAL_LINKS, type OfficialSocialLinkId } from "@/lib/social";

type SocialLinksSource = "footer" | "support";
type SocialLinksVariant = "icons" | "labeled";

type SocialLinksProps = {
  source: SocialLinksSource;
  variant?: SocialLinksVariant;
  className?: string;
};

export function SocialLinks({ source, variant = "icons", className }: SocialLinksProps) {
  const labelClassName = variant === "icons" ? "visually-hidden" : "social-link-label";
  const classNames = ["social-links", className].filter(Boolean).join(" ");

  return (
    <nav className={classNames} data-variant={variant} aria-label="Can You Geo social links">
      {OFFICIAL_SOCIAL_LINKS.map((link) => (
        <a
          key={link.id}
          className="social-link"
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Follow Can You Geo on ${link.label}`}
          onClick={() => {
            trackAnalyticsEvent("cgy_select_content", {
              content_type: "social_link",
              item_id: link.id,
              source
            });
          }}
        >
          <SocialIcon id={link.id} />
          <span className={labelClassName}>{link.label}</span>
        </a>
      ))}
    </nav>
  );
}

function SocialIcon({ id }: { id: OfficialSocialLinkId }) {
  return (
    <svg className="social-link-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {id === "instagram" ? (
        <>
          <rect x="5.5" y="5.5" width="13" height="13" rx="4" />
          <circle cx="12" cy="12" r="3.25" />
          <circle cx="16" cy="8" r="0.75" />
        </>
      ) : null}
      {id === "facebook" ? <path d="M13 20v-7h2.3l0.4-3H13V8.2c0-0.85 0.28-1.45 1.55-1.45H16V4.1C15.7 4.06 14.8 4 13.8 4C11.6 4 10 5.35 10 7.85V10H7.6v3H10v7h3Z" /> : null}
      {id === "tiktok" ? (
        <path d="M14 4c0.3 2.15 1.55 3.65 3.7 4.15v3.05c-1.45-0.05-2.65-0.45-3.7-1.2v5.15c0 3-1.85 4.85-4.7 4.85C6.8 20 5 18.35 5 16.05c0-2.45 1.95-4.15 4.65-4.15c0.35 0 0.7 0.03 1.05 0.1v3.05A2.87 2.87 0 0 0 9.65 14.85c-0.95 0-1.6 0.48-1.6 1.22c0 0.7 0.58 1.15 1.35 1.15c0.95 0 1.55-0.65 1.55-1.85V4h3.05Z" />
      ) : null}
    </svg>
  );
}
