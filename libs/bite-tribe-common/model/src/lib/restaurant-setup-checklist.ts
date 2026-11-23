import { restaurantCategoriesOf, type Restaurant } from './restaurant';

export type SetupItemKey =
  | 'image'
  | 'categories'
  | 'address'
  | 'opening-hours'
  | 'description'
  | 'social-links'
  | 'facilities'
  | 'menu-reviewed';

/**
 * The parts of a restaurant the business app edits one at a time, each in a
 * view of its own under `restaurant/:restaurantId/edit/:section` (GitHub issue
 * #2183). The order is the order the overview lists them in.
 */
export const RESTAURANT_SECTIONS = [
  'photo',
  'categories',
  'about',
  'links',
  'address',
  'position',
  'opening-hours',
  'facilities',
  'dietary',
  'table-ordering',
  'menu-code',
] as const;

export type RestaurantSection = (typeof RESTAURANT_SECTIONS)[number];

export const isRestaurantSection = (
  value: unknown,
): value is RestaurantSection =>
  (RESTAURANT_SECTIONS as readonly unknown[]).includes(value);

export interface SetupItem {
  readonly key: SetupItemKey;
  readonly labelKey: string;
  readonly done: boolean;
  /**
   * The screen that completes the item: the menu editor, or the restaurant
   * section that holds the field (GitHub issue #2183).
   */
  readonly target: 'edit-menu' | RestaurantSection;
}

const hasText = (value: string | undefined): boolean => !!value?.trim();

/**
 * What the checklist knows beyond the restaurant document: whether its menu
 * was built from guests' Bites, which only the menu records (GitHub issue
 * #2302). Unknown reads as a menu of the owner's own.
 */
export interface SetupChecklistContext {
  readonly menuBuiltFromBites?: boolean;
}

/**
 * The menu item's label, by the menu the restaurant actually has (GitHub
 * issue #2302): none yet, one built from guests' Bites, or its own. Always
 * naming the Bite-built menu told an owner with no menu, or one they wrote
 * themselves, to check something that did not exist.
 */
const menuLabelKey = (
  restaurant: Restaurant,
  { menuBuiltFromBites }: SetupChecklistContext,
): string => {
  if (!restaurant.menuId) {
    return 'setup-checklist-menu-create';
  }

  return menuBuiltFromBites
    ? 'setup-checklist-menu-reviewed'
    : 'setup-checklist-menu-review';
};

/**
 * What a restaurant still lacks for guests to see a complete page, read from
 * the stored restaurant and nothing else (GitHub issue #2126).
 *
 * Ticked from the document rather than a local flag, so every owner of the
 * restaurant sees the same list on every device. A photo that is still
 * uploading does not count: `imagePath` is only written once one has landed.
 *
 * The category is second, after the photo, because it is the first thing a
 * guest reads about the place after its name (#2131).
 */
export const restaurantSetupChecklist = (
  restaurant: Restaurant,
  context: SetupChecklistContext = {},
): readonly SetupItem[] => {
  const item = (
    key: SetupItemKey,
    done: boolean,
    target: SetupItem['target'],
    labelKey = `setup-checklist-${key}`,
  ): SetupItem => ({ key, labelKey, done, target });

  const address = restaurant.address;

  return [
    item(
      'image',
      hasText(restaurant.imagePath) || hasText(restaurant.image),
      'photo',
    ),
    item(
      'categories',
      restaurantCategoriesOf(restaurant).length > 0,
      'categories',
    ),
    item(
      'address',
      hasText(address?.street) && hasText(address?.city),
      'address',
    ),
    item(
      'opening-hours',
      (restaurant.openingHours?.length ?? 0) > 0,
      'opening-hours',
    ),
    item('description', hasText(restaurant.description), 'about'),
    item(
      'social-links',
      (restaurant.socialMediaLinks ?? []).some((link) => hasText(link.url)),
      'links',
    ),
    item(
      'facilities',
      restaurant.facilities?.genderNeutralRestroom !== undefined,
      'facilities',
    ),
    item(
      'menu-reviewed',
      typeof restaurant.menuReviewedAtTimestamp === 'number',
      'edit-menu',
      menuLabelKey(restaurant, context),
    ),
  ];
};

/** Whether every item is ticked, and the checklist no longer shows. */
export const isRestaurantSetUp = (restaurant: Restaurant): boolean =>
  restaurantSetupChecklist(restaurant).every((item) => item.done);
