/**
 * ADORA CXP-04C — Centralized Rollback-Safe Experience Mode Switch
 *
 * Default is ALWAYS "ux1-dialog" when NEXT_PUBLIC_ADORA_CONCIERGE_MODE is
 * missing, empty, or invalid. Only explicit "atelier" activates "atelier-workspace".
 *
 * Next.js Note: NEXT_PUBLIC_ADORA_CONCIERGE_MODE is inlined at compile/build time
 * into client bundles, so toggling between modes requires rebuilding or restarting
 * the server with the target environment configuration.
 */

export type ConciergeExperienceMode = "ux1-dialog" | "atelier-workspace";

export function resolveConciergeExperienceMode(
  rawValue: string | undefined | null,
): ConciergeExperienceMode {
  if (typeof rawValue !== "string") return "ux1-dialog";
  return rawValue.trim() === "atelier" ? "atelier-workspace" : "ux1-dialog";
}

export const CONCIERGE_EXPERIENCE_MODE: ConciergeExperienceMode =
  resolveConciergeExperienceMode(process.env.NEXT_PUBLIC_ADORA_CONCIERGE_MODE);

export const IS_ATELIER_MODE: boolean =
  CONCIERGE_EXPERIENCE_MODE === "atelier-workspace";
