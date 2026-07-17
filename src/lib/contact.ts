export const SUPPORT_EMAIL = "support@canyougeo.com";
export const HELLO_EMAIL = "hello@canyougeo.com";

export const CONTACT_SUBJECTS = {
  bugReport: "Can You Geo bug report",
  dataSourceIssue: "Can You Geo data/source issue",
  accountHelp: "Can You Geo account or sign-in help",
  accountDeletion: "Can You Geo account deletion request",
  generalFeedback: "Can You Geo general feedback",
  billingHelp: "Can You Geo billing help",
  privacyLegalRequest: "Can You Geo privacy/legal request"
} as const;

export function mailtoHref(email: string, subject: string, body?: string) {
  const params = new URLSearchParams({ subject });
  if (body) params.set("body", body);
  return `mailto:${email}?${params.toString()}`;
}

export const CONTACT_LINKS = {
  bugReport: {
    email: SUPPORT_EMAIL,
    href: mailtoHref(SUPPORT_EMAIL, CONTACT_SUBJECTS.bugReport)
  },
  dataSourceIssue: {
    email: SUPPORT_EMAIL,
    href: mailtoHref(SUPPORT_EMAIL, CONTACT_SUBJECTS.dataSourceIssue)
  },
  accountHelp: {
    email: SUPPORT_EMAIL,
    href: mailtoHref(SUPPORT_EMAIL, CONTACT_SUBJECTS.accountHelp)
  },
  accountDeletion: {
    email: SUPPORT_EMAIL,
    href: mailtoHref(
      SUPPORT_EMAIL,
      CONTACT_SUBJECTS.accountDeletion,
      [
        "I want to request deletion of my Can You Geo account and associated personal data.",
        "",
        "Account email:",
        "",
        "I understand Can You Geo may ask me to verify account ownership and may retain limited records where required for legal, accounting, fraud-prevention, security, dispute-resolution, or backup purposes."
      ].join("\n")
    )
  },
  generalFeedback: {
    email: HELLO_EMAIL,
    href: mailtoHref(HELLO_EMAIL, CONTACT_SUBJECTS.generalFeedback)
  },
  billingHelp: {
    email: SUPPORT_EMAIL,
    href: mailtoHref(SUPPORT_EMAIL, CONTACT_SUBJECTS.billingHelp)
  },
  privacyLegalRequest: {
    email: SUPPORT_EMAIL,
    href: mailtoHref(SUPPORT_EMAIL, CONTACT_SUBJECTS.privacyLegalRequest)
  }
} as const;
