import type { Restaurant } from 'model';

export type SetupItemKey =
  | 'image'
  | 'address'
  | 'opening-hours'
  | 'description'
  | 'social-links'
  | 'facilities'
  | 'menu-reviewed';

export interface SetupItem {
  readonly key: SetupItemKey;
  readonly labelKey: string;
  readonly done: boolean;
  /** The screen that completes the item. */
  readonly target: 'edit-restaurant' | 'edit-menu';
}

const hasText = (value: string | undefined): boolean => !!value?.trim();

/**
 * What a restaurant still lacks for guests to see a complete page, read from
 * the stored restaurant and nothing else (GitHub issue #2126).
 *
 * Ticked from the document rather than a local flag, so every owner of the
 * restaurant sees the same list on every device. A photo that is still
 * uploading does not count: `imagePath` is only written once one has landed.
 *
 * Once #2131 adds a category to the restaurant, it joins this list.
 */
export const restaurantSetupChecklist = (
  restaurant: Restaurant,
): readonly SetupItem[] => {
  const item = (
    key: SetupItemKey,
    done: boolean,
    target: SetupItem['target'] = 'edit-restaurant',
  ): SetupItem => ({ key, labelKey: `setup-checklist-${key}`, done, target });

  const address = restaurant.address;

  return [
    item('image', hasText(restaurant.imagePath) || hasText(restaurant.image)),
    item('address', hasText(address?.street) && hasText(address?.city)),
    item('opening-hours', (restaurant.openingHours?.length ?? 0) > 0),
    item('description', hasText(restaurant.description)),
    item(
      'social-links',
      (restaurant.socialMediaLinks ?? []).some((link) => hasText(link.url)),
    ),
    item(
      'facilities',
      restaurant.facilities?.genderNeutralRestroom !== undefined,
    ),
    item(
      'menu-reviewed',
      typeof restaurant.menuReviewedAtTimestamp === 'number',
      'edit-menu',
    ),
  ];
};

/** Whether every item is ticked, and the checklist no longer shows. */
export const isRestaurantSetUp = (restaurant: Restaurant): boolean =>
  restaurantSetupChecklist(restaurant).every((item) => item.done);
