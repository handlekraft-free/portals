/**
 * Centralized brand configuration.
 *
 * This file is the single source of truth for organization name, contact
 * email, domain, tagline, and other brand-level strings used in BOTH the
 * client and the server. To rebrand a fork (e.g. another community
 * organization adopting the open-source portals), edit ONLY this file.
 *
 * Import style:
 *   import { BRAND } from "@shared/branding";
 *
 * Notes for future open-source extraction:
 * - Brand name is rendered with the Unicode schwa ("ə") in body copy and
 *   document titles. The ASCII form is used for slugs, email domains, and
 *   anywhere a non-Latin character would be problematic.
 * - The Norse cosmetic theme (rank names, "Longship Factory", "Saga of
 *   the Week", etc.) lives separately in the gamification modules — it
 *   is intentionally NOT part of brand config so a fork can keep the
 *   Norse theme even after rebranding the org name.
 */
export const BRAND = {
  /** Primary display name with Unicode schwa (used in body copy, titles). */
  name: "handləkraft",
  /** ASCII form for slugs, email local parts, doc filenames. */
  nameAscii: "handlekraft",
  /** Bare domain (no scheme, no www). */
  domain: "handlekraft.ai",
  /** Most common UI form: name + .ai */
  fullName: "handləkraft.ai",
  /** One-line tagline. */
  tagline: "The Power to Act",
  /** Public contact email used in marketing CTAs and footer. */
  contactEmail: "robert@retired.email",
  /** Whether this deployment is a 501(c)(3) U.S. nonprofit. */
  is501c3: true,
  /** Footer notice rendered when is501c3 is true. */
  nonprofitNotice: "A 501(c)(3) nonprofit initiative",
  /** Strategic-proposal PDF URL (employee onboarding seeds). */
  proposalUrl: "https://handlekraft.ai/proposal.pdf",
  /** Tier 1 / Tier 2 training plan URLs (employee onboarding seeds). */
  tier1TrainingUrl: "https://handlekraft.ai/docs/handlekraft-tier1-training-plan.docx",
  tier2TrainingUrl: "https://handlekraft.ai/docs/handlekraft-tier2-training-plan.docx",
} as const;

export type Brand = typeof BRAND;
