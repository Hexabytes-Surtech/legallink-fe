/**
 * Single source of truth for practice areas (review finding #7 / #10).
 *
 * - `PRACTICE_AREAS` is the canonical bucket list shown in the directory filter and
 *   the advocate onboarding/profile chips. The backend normalises stored values to
 *   these Title-Case labels on save, so the filter and the data agree.
 * - `SLUG_TO_CANONICAL` maps the legacy/AI snake_case slugs onto a canonical bucket.
 * - `displayPracticeArea()` is the one formatter every UI consumer should use.
 *
 * Previously these lived in three unlinked places (advocate-card PA_DISPLAY, the
 * directory page's inline list, and lib/constants PRACTICE_AREAS) that had to be
 * edited in lockstep.
 */

export const PRACTICE_AREAS: string[] = [
  'Criminal',
  'Civil',
  'Family',
  'Labour',
  'Tenancy',
  'Traffic',
  'Consumer',
];

// Legacy / AI slug → canonical bucket. Keys are lowercase (lookup lowercases input).
export const SLUG_TO_CANONICAL: Record<string, string> = {
  criminal_matter: 'Criminal', criminal_offence: 'Criminal', criminal: 'Criminal',
  civil_dispute: 'Civil', cheque_bounce: 'Civil', property_dispute: 'Civil', property: 'Civil', civil: 'Civil',
  corporate: 'Civil', corporate_law: 'Civil',
  family_law: 'Family', domestic_violence: 'Family', divorce: 'Family', maintenance: 'Family', dowry: 'Family', family: 'Family',
  labour_dispute: 'Labour', labour_law: 'Labour', labour_employment: 'Labour', employment: 'Labour', workplace_harassment: 'Labour', labour: 'Labour',
  tenancy_dispute: 'Tenancy', tenancy: 'Tenancy',
  'motor_vehicle/traffic_offence': 'Traffic', motor_vehicle: 'Traffic', traffic_offence: 'Traffic',
  consumer_complaint: 'Consumer', consumer_dispute: 'Consumer', consumer: 'Consumer',
};

/**
 * Normalise any stored/AI practice-area label to a human-readable Title-Case string.
 * Null/empty-safe: element-map callers guard the array, not its items, so a
 * [null]/[''] payload must not crash the render.
 */
export function displayPracticeArea(raw: string | null | undefined): string {
  if (!raw) return '';
  return (
    SLUG_TO_CANONICAL[raw.toLowerCase()] ??
    raw.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Normalise a list of raw practice-area values to unique display labels. Different
 * slugs can map to the same bucket (civil_dispute + property_dispute → "Civil"), so
 * the raw array may contain duplicates after normalisation — collapse them to avoid
 * duplicate badges (and duplicate React keys).
 */
export function uniquePracticeAreaLabels(areas?: (string | null | undefined)[]): string[] {
  if (!areas) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of areas) {
    const label = displayPracticeArea(a);
    if (label && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}
