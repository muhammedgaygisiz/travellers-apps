import type { DocumentData } from 'firebase-admin/firestore';
import {
  DIETARY_LABELS,
  DietaryDisputeReason,
  DietaryLabel,
  isDietaryLabel,
} from './dietary-votes';

/**
 * A restaurant's labels as the backend keeps them (GitHub issue #2198).
 *
 * ```text
 * /menus/{menuId}.dietary                  { [menuItemId]: MenuItemDietary }
 * /restaurants/{restaurantId}.dietaryStrikes   [{ menuItemId, label, removedAt }]
 * /dietaryLabelApprovals/{restaurantId}    labels waiting for an operator
 * ```
 *
 * `dietary` is one top-level field so the rules can refuse every client write
 * of it, which is what locks a removed label: a menu's dishes sit in nested
 * arrays the rules cannot look into. Menus saved before #2198 keep their labels
 * on each item until the map is first written, and {@link menuDietaryMapOf}
 * reads those; once the map exists the item fields are ignored.
 *
 * The constants are copies of
 * `libs/bite-tribe-common/model/src/lib/dietary-removal.ts` and
 * `dietary-label.ts`, which this project cannot import;
 * `menu-dietary-parity.spec.ts` keeps them equal.
 */

export const MENUS_COLLECTION = 'menus';
export const DIETARY_LABEL_APPROVALS_COLLECTION = 'dietaryLabelApprovals';

export const DIETARY_REMOVAL_WINDOW_DAYS = 90;
export const DIETARY_REMOVAL_THRESHOLDS = {
  lifestyle: 3,
  'high-risk': 2,
} as const;
export const DIETARY_REMOVAL_GOT_SICK_THRESHOLD = 1;
export const DIETARY_STRIKE_LIMIT = 3;
export const DIETARY_STRIKE_PERIOD_DAYS = 365;

/** The high-risk labels of `DIETARY_LABEL_CLASSES`. */
export const HIGH_RISK_DIETARY_LABELS: readonly DietaryLabel[] = [
  'gluten-free',
  'lactose-free',
  'nut-free',
  'halal',
  'kosher',
];

export const DAY_MS = 24 * 60 * 60 * 1000;

export type DietaryLabelKind = 'label' | 'option';

export interface DietaryLabelRemoval {
  removedAt: string;
  disputes: number;
  confirmations: number;
  reasons: Partial<Record<DietaryDisputeReason, number>>;
}

export interface MenuItemDietary {
  labels?: DietaryLabel[];
  options?: DietaryLabel[];
  removed?: Partial<Record<DietaryLabel, DietaryLabelRemoval>>;
}

export type MenuDietary = Record<string, MenuItemDietary>;

export interface DietaryStrike {
  menuItemId: string;
  label: DietaryLabel;
  removedAt: string;
}

export interface MenuDietaryLabelRef {
  menuItemId: string;
  label: DietaryLabel;
  kind: DietaryLabelKind;
}

export const isHighRiskDietaryLabel = (label: DietaryLabel): boolean =>
  HIGH_RISK_DIETARY_LABELS.includes(label);

export const dietaryRemovalThreshold = (label: DietaryLabel): number =>
  DIETARY_REMOVAL_THRESHOLDS[
    isHighRiskDietaryLabel(label) ? 'high-risk' : 'lifestyle'
  ];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Known labels only, no repeats, vocabulary order. */
export const labelsOf = (value: unknown): DietaryLabel[] =>
  Array.isArray(value)
    ? DIETARY_LABELS.filter((label) => value.includes(label))
    : [];

/** One row of a stored menu: a dish or one of its variants. */
export interface MenuRow {
  id: string;
  name: string;
  /** The dish's name for a variant, so a notification can say which dish. */
  dishName: string;
  row: DocumentData;
}

/** Every dish and variant of a stored menu, with an id. */
export const menuRowsOf = (menu: DocumentData | undefined): MenuRow[] => {
  const rows: MenuRow[] = [];
  const nameOf = (row: DocumentData): string =>
    typeof row['name'] === 'string' ? row['name'] : '';

  for (const category of Array.isArray(menu?.['categories'])
    ? menu['categories']
    : []) {
    for (const item of Array.isArray(category?.items) ? category.items : []) {
      if (!isRecord(item)) {
        continue;
      }

      if (typeof item['id'] === 'string' && item['id']) {
        rows.push({
          id: item['id'],
          name: nameOf(item),
          dishName: nameOf(item),
          row: item,
        });
      }

      for (const variant of Array.isArray(item['variants'])
        ? item['variants']
        : []) {
        if (
          isRecord(variant) &&
          typeof variant['id'] === 'string' &&
          variant['id']
        ) {
          rows.push({
            id: variant['id'],
            name: nameOf(variant),
            dishName: nameOf(item),
            row: variant,
          });
        }
      }
    }
  }

  return rows;
};

const removalOf = (value: unknown): DietaryLabelRemoval | undefined =>
  isRecord(value) && typeof value['removedAt'] === 'string'
    ? (value as unknown as DietaryLabelRemoval)
    : undefined;

const entryOf = (value: unknown): MenuItemDietary => {
  if (!isRecord(value)) {
    return {};
  }

  const labels = labelsOf(value['labels']);
  const options = labelsOf(value['options']);
  const removed: Partial<Record<DietaryLabel, DietaryLabelRemoval>> = {};

  if (isRecord(value['removed'])) {
    Object.entries(value['removed']).forEach(([label, raw]) => {
      const removal = removalOf(raw);

      if (isDietaryLabel(label) && removal) {
        removed[label] = removal;
      }
    });
  }

  return {
    ...(labels.length ? { labels } : {}),
    ...(options.length ? { options } : {}),
    ...(Object.keys(removed).length ? { removed } : {}),
  };
};

/**
 * The menu's labels by item id: the stored map when there is one, otherwise
 * the legacy fields on each item. `stored` says which, so a writer knows it is
 * creating the map.
 */
export const menuDietaryMapOf = (
  menu: DocumentData | undefined,
): { dietary: MenuDietary; stored: boolean } => {
  if (isRecord(menu?.['dietary'])) {
    return {
      stored: true,
      dietary: Object.fromEntries(
        Object.entries(menu['dietary']).map(([id, entry]) => [
          id,
          entryOf(entry),
        ]),
      ),
    };
  }

  const dietary: MenuDietary = {};

  menuRowsOf(menu).forEach(({ id, row }) => {
    const entry = entryOf({
      labels: row['dietaryLabels'],
      options: row['dietaryOptions'],
    });

    if (entry.labels || entry.options) {
      dietary[id] = entry;
    }
  });

  return { dietary, stored: false };
};

/** The labels an item publishes: listed, and not removed. */
export const publishedLabelsOf = (
  entry: MenuItemDietary | undefined,
): DietaryLabel[] =>
  (entry?.labels ?? []).filter((label) => !entry?.removed?.[label]);

/** An entry as it is stored: empty lists and maps are left out. */
export const compactEntry = (entry: MenuItemDietary): MenuItemDietary => ({
  ...(entry.labels?.length ? { labels: entry.labels } : {}),
  ...(entry.options?.length ? { options: entry.options } : {}),
  ...(entry.removed && Object.keys(entry.removed).length
    ? { removed: entry.removed }
    : {}),
});

/** The map as it is stored, with no empty entry. */
export const compactMap = (dietary: MenuDietary): MenuDietary =>
  Object.fromEntries(
    Object.entries(dietary)
      .map(([id, entry]) => [id, compactEntry(entry)] as const)
      .filter(([, entry]) => Object.keys(entry).length > 0),
  );

/** The strikes that still count at `now`. */
export const strikesWithin = (strikes: unknown, now: Date): DietaryStrike[] =>
  (Array.isArray(strikes) ? strikes : []).filter(
    (strike): strike is DietaryStrike =>
      isRecord(strike) &&
      isDietaryLabel(strike['label']) &&
      typeof strike['removedAt'] === 'string' &&
      now.getTime() - Date.parse(strike['removedAt']) <
        DIETARY_STRIKE_PERIOD_DAYS * DAY_MS,
  );

/** Whether the restaurant's new labels wait for an operator (`R-8`). */
export const needsApproval = (
  restaurant: DocumentData | undefined,
  now: Date,
): boolean =>
  strikesWithin(restaurant?.['dietaryStrikes'], now).length >=
  DIETARY_STRIKE_LIMIT;

/** Resolves the menu document a restaurant points at, or `undefined`. */
export const menuIdOf = (
  restaurant: DocumentData | undefined,
): string | undefined => {
  const menuId = restaurant?.['menuId'];

  if (typeof menuId !== 'string' || !menuId) {
    return undefined;
  }

  return menuId.split('/').filter(Boolean).pop();
};
