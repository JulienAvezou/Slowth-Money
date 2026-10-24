import type { AccountWrapper, SourceType } from "../../../shared/types/domain";

export interface CanadaCountryPack {
  jurisdiction: "CA";
  currency: "CAD";
  supportedWrappers: AccountWrapper[];
  concepts: Array<{ id: string; label: string; description: string; authoritativeUrl: string }>;
  sourceTrust: Record<SourceType, number>;
  refreshDays: { rules: 30; products: 7 };
}

export const canadaCountryPack: CanadaCountryPack = {
  jurisdiction: "CA",
  currency: "CAD",
  supportedWrappers: ["TFSA", "FHSA", "RRSP", "NON_REGISTERED"],
  concepts: [
    {
      id: "tfsa",
      label: "Tax-Free Savings Account",
      description: "Contribution room is personal and must be supplied or left unknown.",
      authoritativeUrl:
        "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html",
    },
    {
      id: "fhsa",
      label: "First Home Savings Account",
      description: "Eligibility and available room are explicit inputs, never inferred.",
      authoritativeUrl:
        "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/first-home-savings-account.html",
    },
    {
      id: "rrsp",
      label: "Registered Retirement Savings Plan",
      description: "Slowth Money provides basic education and uses user-supplied room only.",
      authoritativeUrl:
        "https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html",
    },
    {
      id: "cdic",
      label: "CDIC deposit protection",
      description: "Coverage depends on membership and deposit category; verify before acting.",
      authoritativeUrl: "https://www.cdic.ca/depositors/whats-covered/",
    },
  ],
  sourceTrust: {
    GOVERNMENT_REGULATOR: 1,
    FINANCIAL_INSTITUTION: 0.95,
    ESTABLISHED_COMPARISON: 0.75,
    FINANCIAL_PUBLICATION: 0.7,
    GENERAL_WEB: 0.4,
    FORUM_SOCIAL: 0.2,
  },
  refreshDays: { rules: 30, products: 7 },
};
