import type { Bite } from './bite';

/**
 * What the business app sends `linkBiteToMenuItem` (GitHub issue #2216):
 * exactly one of `menuItemId` and `notOnMenu`, and `variantId` only with a
 * `menuItemId` whose dish has that variant.
 */
export interface LinkBiteToMenuItemRequest {
  biteId: string;
  menuItemId?: string;
  variantId?: string;
  notOnMenu?: boolean;
}

export type LinkBiteToMenuItemResult =
  | { biteId: string; menuItemId: string; variantId?: string }
  | { biteId: string; notOnMenu: true };

/**
 * Whether a Bite still waits for its restaurant's owner on the Guest Bites
 * page (GitHub issue #2216): linked to no dish, and not marked as about
 * nothing on the menu. A Bite the guest linked themself is linked.
 */
export const awaitsMenuLink = (
  bite: Pick<Bite, 'menuItemId' | 'menuLinkDismissed'>,
): boolean => !bite.menuItemId && !bite.menuLinkDismissed;
