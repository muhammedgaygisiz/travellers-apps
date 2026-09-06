/**
 * The subscription tiers BiteTribe sells.
 *
 * Deliberately duplicated from `libs/common/utils/src/lib/subscription-tier.ts`
 * rather than imported, for the reason `roles.ts` gives: the Functions project
 * compiles with its own `tsconfig.json` whose `rootDir` is `src` and which
 * carries none of the workspace path mappings, so it cannot reach a library.
 * The two lists have to be changed together.
 *
 * **The tier is a display mirror, not an entitlement.** `subscriptionTier` on
 * the public user document is read by the settings page and the profile badge
 * and by nothing else: no callable and no rule gates on it. Issues #1122 and
 * #1126 own the entitlement record and the custom claim that will become the
 * authority, and this value will mirror those rather than stand alone.
 */
export const SUBSCRIPTION_TIERS = [0, 1] as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const isSubscriptionTier = (value: unknown): value is SubscriptionTier =>
  typeof value === 'number' &&
  (SUBSCRIPTION_TIERS as readonly number[]).includes(value);

/**
 * Reads a tier off a stored user document.
 *
 * An account whose document predates #1127, or whose document holds something
 * that is not a tier, resolves to `null` rather than to Free. The two mean
 * different things to an operator: `null` is "nobody ever decided", and Free is
 * a decision. Collapsing them would show a made-up answer as a real one.
 */
export const tierFromUserData = (
  data: Record<string, unknown> | undefined,
): SubscriptionTier | null => {
  const raw = data?.['subscriptionTier'];

  return isSubscriptionTier(raw) ? raw : null;
};
