/**
 * Centralized brand configuration.
 *
 * This file is the single source of truth for organization name, contact
 * email, domain, tagline, and other brand-level strings used in BOTH the
 * client and the server. To rebrand a fork, edit ONLY this file.
 *
 * Import style:
 *   import { BRAND } from "@shared/branding";
 *
 * Notes:
 * - The Norse cosmetic theme (rank names, "Longship Factory", "Saga of
 *   the Week", etc.) lives separately in the gamification modules — it
 *   is intentionally NOT part of brand config so a fork can keep the
 *   Norse theme even after rebranding the org name.
 */
export const BRAND = {
  /** Primary display name (used in body copy, titles). */
  name: "Handlekraft Portals",
  /** ASCII form for slugs, email local parts, doc filenames. */
  nameAscii: "handlekraft-portals",
  /** Bare domain (no scheme, no www). */
  domain: "handlekraft.dev",
  /** Most common UI form (header / login). */
  fullName: "Handlekraft Portals",
  /** One-line tagline. */
  tagline: "A modern portal suite for your team, clients, and board.",
  /** Public contact email. */
  contactEmail: "hello@handlekraft.dev",
  /** Whether this deployment is a 501(c)(3) U.S. nonprofit. */
  is501c3: false,
  /** Footer notice rendered when is501c3 is true. */
  nonprofitNotice: "A 501(c)(3) nonprofit initiative",
  /** Strategic-proposal PDF URL (employee onboarding seeds). */
  proposalUrl: "https://handlekraft.dev/proposal.pdf",
  /** Tier 1 / Tier 2 training plan URLs (employee onboarding seeds). */
  tier1TrainingUrl: "https://handlekraft.dev/docs/tier1-training-plan.docx",
  tier2TrainingUrl: "https://handlekraft.dev/docs/tier2-training-plan.docx",
} as const;

export type Brand = typeof BRAND;
