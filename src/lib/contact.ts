export const SUPPORT_EMAIL = "support@canyougeo.com";
export const HELLO_EMAIL = "hello@canyougeo.com";

export const CONTACT_SUBJECTS = {
  bugReport: "Can You Geo bug report",
  dataSourceIssue: "Can You Geo data/source issue",
  accountHelp: "Can You Geo account or sign-in help",
  generalFeedback: "Can You Geo general feedback",
  billingHelp: "Can You Geo billing help",
  privacyLegalRequest: "Can You Geo privacy/legal request"
} as const;

export function mailtoHref(email: string, subject: string) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
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
