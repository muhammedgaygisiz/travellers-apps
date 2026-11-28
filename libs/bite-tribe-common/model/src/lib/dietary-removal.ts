import {
  DIETARY_LABELS,
  dietaryLabelClass,
  dietaryLabelsOf,
  isDietaryLabel,
  type DietaryLabel,
  type DietaryLabelClass,
} from './dietary-label';
import type { DietaryDisputeReason } from './dietary-vote';
import type { Category, Menu, MenuItem } from './menu';

/**
 * A restaurant's dietary label that diners dispute is removed and locked
 * (GitHub issue #2198, epic #2193, `RD-DC-4`, `RD-DC-7`).
 *
 * ## Where the restaurant's labels live
 *
 * A menu is one client-written document whose dishes sit in nested arrays,
 * and Firestore rules cannot look inside an array to refuse one label. So the
 * restaurant's labels are kept in {@link Menu.dietary}, one top-level map keyed
 * by menu item id, which the rules refuse to every client write. Only the
 * `saveMenuDietaryLabels` callable, the removal trigger and the operator's
 * approval write it, which is what makes a removed label locked
 * (`UC - Find Dishes That Fit A Dietary Choice` `R-7`).
 *
 * Menus saved before #2198 still carry their labels on each item, and those
 * count until the menu gains the map: the first save through the callable, or
 * the first removal, writes it. Once the map exists the item fields are not
 * read at all, so a client that writes one changes nothing a reader sees.
 * {@link withMenuDietary} applies that rule on read.
 *
 * The constants are repeated in
 * `apps/bite-tribe-firebase/functions/src/functions/dietary/menu-dietary.ts`,
 * which cannot import this library; `menu-dietary-parity.spec.ts` keeps them
 * equal.
 */

/** Disputes count towards a removal for this long, in days. */
export const DIETARY_REMOVAL_WINDOW_DAYS = 90;

/**
 * Eligible disputes within the window that remove a restaurant's label, by
 * class. A high-risk label is removed sooner (`RD-DC-5`).
 */
export const DIETARY_REMOVAL_THRESHOLDS: Readonly<
  Record<DietaryLabelClass, number>
> = {
  lifestyle: 3,
  'high-risk': 2,
};

/** "I got sick" disputes within the window that remove a high-risk label. */
export const DIETARY_REMOVAL_GOT_SICK_THRESHOLD = 1;

/** Removals within the strike period that cost self-declaration. */
export const DIETARY_STRIKE_LIMIT = 3;

/** How long a removal counts as a strike, in days. */
export const DIETARY_STRIKE_PERIOD_DAYS = 365;

/** Where labels waiting for an operator are kept, one document per restaurant. */
export const DIETARY_LABEL_APPROVALS_COLLECTION = 'dietaryLabelApprovals';

/** What a removed label keeps: when, and the disputes that removed it. */
export interface DietaryLabelRemoval {
  removedAt: string;
  disputes: number;
  confirmations: number;
  reasons: Partial<Record<DietaryDisputeReason, number>>;
  /** When the owner last asked for it back (issue #2199). */
  restorationRequestedAt?: string;
}

/** One menu item's labels as the restaurant publishes them. */
export interface MenuItemDietary {
  labels?: DietaryLabel[];
  options?: DietaryLabel[];
  /** Labels diners' disputes removed; locked until an Operator restores one. */
  removed?: Partial<Record<DietaryLabel, DietaryLabelRemoval>>;
}

/** {@link Menu.dietary}: every item's labels, by menu item id. */
export type MenuDietary = Record<string, MenuItemDietary>;

/** One removal counted against a Restaurant (`R-8`). */
export interface DietaryStrike {
  menuItemId: string;
  label: DietaryLabel;
  removedAt: string;
}

/** Whether a label is one the dish fits, or one it can be made to fit. */
export type DietaryLabelKind = 'label' | 'option';

/** One label of one menu item. */
export interface MenuDietaryLabelRef {
  menuItemId: string;
  label: DietaryLabel;
  kind: DietaryLabelKind;
}

/** A menu item's labels that wait for an operator. */
export interface PendingMenuItemDietary {
  name: string;
  labels?: DietaryLabel[];
  options?: DietaryLabel[];
}

/**
 * `dietaryLabelApprovals/{restaurantId}`: what a Restaurant at the strike
 * limit asked to publish. Read by operators only; shown nowhere else.
 */
export interface DietaryLabelApproval {
  restaurantId: string;
  restaurantName?: string;
  items: Record<string, PendingMenuItemDietary>;
  requestedAt: string;
}

/** One dish in the operator's queue, as `listDietaryLabelApprovals` returns it. */
export interface DietaryLabelApprovalItem {
  menuItemId: string;
  name: string;
  labels: DietaryLabel[];
  options: DietaryLabel[];
}

/** One restaurant in the operator's queue, oldest request first. */
export interface DietaryLabelApprovalEntry {
  restaurantId: string;
  restaurantName: string;
  requestedAt: string;
  items: DietaryLabelApprovalItem[];
}

export interface ListDietaryLabelApprovalsResult {
  approvals: DietaryLabelApprovalEntry[];
}

/** What the business app sends with a menu save. */
export interface SaveMenuDietaryLabelsRequest {
  restaurantId: string;
  items: Record<string, { labels: DietaryLabel[]; options: DietaryLabel[] }>;
}

/**
 * Saved, with the labels the backend did not publish: `locked` were removed
 * after diner reports, `pending` wait for an operator.
 */
export interface SaveMenuDietaryLabelsResult {
  status: 'saved';
  locked: MenuDietaryLabelRef[];
  pending: MenuDietaryLabelRef[];
}

/** An operator's answer to one waiting label. */
export interface AnswerDietaryLabelApprovalRequest extends MenuDietaryLabelRef {
  restaurantId: string;
  approve: boolean;
}

/** One waiting label's identity in the operator's queue. */
export const dietaryApprovalKey = (
  request: Omit<AnswerDietaryLabelApprovalRequest, 'approve'>,
): string =>
  [request.restaurantId, request.menuItemId, request.kind, request.label].join(
    '/',
  );

export interface AnswerDietaryLabelApprovalResult {
  status: 'approved' | 'refused' | 'gone';
}

const DAY_MS = 24 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The removal threshold for a label (`R-6`). */
export const dietaryRemovalThreshold = (label: DietaryLabel): number =>
  DIETARY_REMOVAL_THRESHOLDS[dietaryLabelClass(label)];

/** A stored {@link Menu.dietary}, or `undefined` for a menu without one. */
export const menuDietaryOf = (value: unknown): MenuDietary | undefined =>
  isRecord(value)
    ? Object.fromEntries(
        Object.entries(value).map(([id, entry]) => [
          id,
          (isRecord(entry) ? entry : {}) as MenuItemDietary,
        ]),
      )
    : undefined;

/** The labels removed from one item, in vocabulary order. */
export const removedDietaryLabelsOf = (
  entry: MenuItemDietary | undefined,
): DietaryLabel[] => {
  const removed = isRecord(entry?.removed) ? entry.removed : {};

  return DIETARY_LABELS.filter((label) =>
    Object.prototype.hasOwnProperty.call(removed, label),
  );
};

type StrippedMenuItem = Omit<
  MenuItem,
  | 'dietaryLabels'
  | 'dietaryOptions'
  | 'removedDietaryLabels'
  | 'restorationRequestedDietaryLabels'
>;

const stripItem = (item: MenuItem): StrippedMenuItem => {
  const rest: Partial<MenuItem> = { ...item };

  delete rest.dietaryLabels;
  delete rest.dietaryOptions;
  delete rest.removedDietaryLabels;
  delete rest.restorationRequestedDietaryLabels;

  return rest as StrippedMenuItem;
};

const mapItems = (
  categories: Category[] | undefined,
  map: (item: MenuItem) => MenuItem,
): Category[] =>
  (categories ?? []).map((category) => ({
    ...category,
    items: (category.items ?? []).map((item) => {
      const next = map(item);

      return item.variants
        ? { ...next, variants: item.variants.map(map) }
        : next;
    }),
  }));

/**
 * The menu as readers see it: when it has {@link Menu.dietary}, each item's
 * labels, options and removed labels come from the map and the item's own
 * fields are ignored; without it, the legacy item fields stand. A removed
 * label is never among the labels, so it matches no filter (`R-12`).
 */
export const withMenuDietary = <T extends Menu>(menu: T): T => {
  const dietary = menuDietaryOf(menu.dietary);

  if (!dietary) {
    return menu;
  }

  const overlay = (item: MenuItem): MenuItem => {
    const entry = dietary[item.id];
    const removed = removedDietaryLabelsOf(entry);
    const requested = removed.filter(
      (label) => !!entry?.removed?.[label]?.restorationRequestedAt,
    );
    const labels = dietaryLabelsOf(entry?.labels).filter(
      (label) => !removed.includes(label),
    );
    const options = dietaryLabelsOf(entry?.options).filter(
      (label) => !labels.includes(label),
    );

    return {
      ...stripItem(item),
      ...(labels.length ? { dietaryLabels: labels } : {}),
      ...(options.length ? { dietaryOptions: options } : {}),
      ...(removed.length ? { removedDietaryLabels: removed } : {}),
      ...(requested.length
        ? { restorationRequestedDietaryLabels: requested }
        : {}),
    } as MenuItem;
  };

  return { ...menu, categories: mapItems(menu.categories, overlay) };
};

/**
 * Every item's labels and options as the editor holds them, for
 * `saveMenuDietaryLabels`. Every item is named, an empty one included, so a
 * label the owner took off is taken off.
 */
export const menuDietaryLabelsOf = (
  menu: Pick<Menu, 'categories'>,
): SaveMenuDietaryLabelsRequest['items'] => {
  const items: SaveMenuDietaryLabelsRequest['items'] = {};
  const add = (item: MenuItem): void => {
    if (!item.id) {
      return;
    }

    items[item.id] = {
      labels: dietaryLabelsOf(item.dietaryLabels),
      options: dietaryLabelsOf(item.dietaryOptions),
    };
  };

  (menu.categories ?? []).forEach((category) =>
    (category.items ?? []).forEach((item) => {
      add(item);
      (item.variants ?? []).forEach(add);
    }),
  );

  return items;
};

/**
 * The categories without any dietary field, for the client's menu write: the
 * labels travel through the callable, never on the menu's items.
 */
export const withoutMenuItemDietary = (
  categories: Category[] | undefined,
): Category[] => mapItems(categories, (item) => stripItem(item) as MenuItem);

/** The strikes that still count at `now`. */
export const dietaryStrikesWithin = (
  strikes: unknown,
  now: Date,
): DietaryStrike[] =>
  (Array.isArray(strikes) ? strikes : []).filter(
    (strike): strike is DietaryStrike =>
      isRecord(strike) &&
      isDietaryLabel(strike['label']) &&
      typeof strike['removedAt'] === 'string' &&
      now.getTime() - Date.parse(strike['removedAt']) <
        DIETARY_STRIKE_PERIOD_DAYS * DAY_MS,
  );

/** Whether a Restaurant's new labels wait for an operator (`R-8`). */
export const needsDietaryLabelApproval = (
  strikes: unknown,
  now: Date,
): boolean => dietaryStrikesWithin(strikes, now).length >= DIETARY_STRIKE_LIMIT;
