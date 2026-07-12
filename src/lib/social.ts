export const OFFICIAL_SOCIAL_LINKS = [
  {
    id: "tiktok",
    label: "TikTok",
    href: "https://www.tiktok.com/@canyougeo"
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/canyougeo"
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/canyougeo"
  }
] as const;

export type OfficialSocialLinkId = (typeof OFFICIAL_SOCIAL_LINKS)[number]["id"];

export const OFFICIAL_SOCIAL_URLS = OFFICIAL_SOCIAL_LINKS.map((link) => link.href);
