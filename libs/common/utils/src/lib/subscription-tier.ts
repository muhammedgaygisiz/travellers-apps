/**
 * The subscription tiers BiteTribe sells.
 *
 * Free and Pro, as numbers, because that is what `subscriptionTier` on the
 * public user document has always held and what the settings page and the
 * profile badge already read. Naming them stops the next reader from having to
 * work out what `1` meant.
 *
 * **This value is a display mirror, not an entitlement.** Nothing in the
 * product gates on it: there is no entitlement record, no custom claim and no
 * rule that reads it, and `firestore.rules` still lets any signed-in account
 * write it. Issues #1122 and #1126 own the entitlement that will eventually be
 * the authority, and this mirror will follow it rather than stand alone.
 *
 * Duplicated in `apps/bite-tribe-firebase/functions/src/functions/shared/subscription-tier.ts`,
 * which compiles with its own `tsconfig.json` and cannot reach a library. The
 * two have to be changed together.
 */
export const SUBSCRIPTION_TIERS = [0, 1] as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export const SUBSCRIPTION_TIER_FREE: SubscriptionTier = 0;

export const SUBSCRIPTION_TIER_PRO: SubscriptionTier = 1;

export const isSubscriptionTier = (value: unknown): value is SubscriptionTier =>
  typeof value === 'number' &&
  (SUBSCRIPTION_TIERS as readonly number[]).includes(value);
