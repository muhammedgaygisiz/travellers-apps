import {
  DIETARY_LABELS,
  dietaryLabelClass,
  isDietaryLabel,
} from './dietary-label';

/**
 * A member's dietary choices (GitHub issue #2196, epic #2193).
 *
 * The label vocabulary of issue #2194, plus two choices that have no matching
 * dish label: avoiding pork and avoiding alcohol are about what a member stays
 * away from, which is what keeps a conflicting ad away (`RD-DC-2`), not a
 * property a restaurant declares about a dish.
 *
 * The order here is the order settings offers them in and the order they are
 * stored in.
 */
export const DIETARY_CHOICES = [
  ...DIETARY_LABELS,
  'avoids-pork',
  'avoids-alcohol',
] as const;

export type DietaryChoice = (typeof DIETARY_CHOICES)[number];

export const isDietaryChoice = (value: unknown): value is DietaryChoice =>
  (DIETARY_CHOICES as readonly unknown[]).includes(value);

/**
 * Whether a choice reveals religion or health, special-category data under
 * GDPR Art. 9, and so is stored only with the member's consent (`UC - Find
 * Dishes That Fit A Dietary Choice` `R-10`): every high-risk label, and both
 * avoidances, which are religious as often as not.
 */
export const isSensitiveDietaryChoice = (choice: DietaryChoice): boolean =>
  !isDietaryLabel(choice) || dietaryLabelClass(choice) === 'high-risk';

export const SENSITIVE_DIETARY_CHOICES = DIETARY_CHOICES.filter(
  isSensitiveDietaryChoice,
);

export const LIFESTYLE_DIETARY_CHOICES = DIETARY_CHOICES.filter(
  (choice) => !isSensitiveDietaryChoice(choice),
);

/**
 * Stored choices as every reader should see them: known values only, no
 * repeats, in list order. A sensitive choice without a recorded consent is
 * dropped, so it is never acted on even if a write slipped one past the rules.
 */
export const dietaryChoicesOf = (
  settings:
    { dietaryChoices?: unknown; dietaryConsentAt?: unknown } | undefined,
): DietaryChoice[] => {
  const values = settings?.dietaryChoices;

  if (!Array.isArray(values)) {
    return [];
  }

  const consented = hasDietaryConsent(settings);

  return DIETARY_CHOICES.filter(
    (choice) =>
      values.includes(choice) &&
      (consented || !isSensitiveDietaryChoice(choice)),
  );
};

/** Whether the member has consented to religion and health choices being stored. */
export const hasDietaryConsent = (
  settings: { dietaryConsentAt?: unknown } | undefined,
): boolean =>
  typeof settings?.dietaryConsentAt === 'string' &&
  settings.dietaryConsentAt.length > 0;
