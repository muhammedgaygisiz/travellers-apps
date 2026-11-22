/**
 * The dietary label vocabulary (GitHub issue #2194, epic #2193).
 *
 * One fixed list, used by every story of the epic: the restaurant's labels on
 * a dish, the creator's on a Bite, the votes, the member's choices and the
 * filters. A label is a structured value, never a free-text tag - `#vegan` on a
 * Bite stays a tag as typed.
 *
 * Each label has a class, and the class decides how strictly it is shown and
 * how fast a disputed one is removed (`UC - Find Dishes That Fit A Dietary
 * Choice` `R-1`). `high-risk` is a medical or religious property, where a
 * wrong label is a health or a faith risk rather than a bad recommendation.
 *
 * The order here is the order the business app offers them in and the order a
 * dish shows them in.
 */
export const DIETARY_LABEL_CLASSES = {
  vegan: 'lifestyle',
  vegetarian: 'lifestyle',
  pescatarian: 'lifestyle',
  'alcohol-free': 'lifestyle',
  'gluten-free': 'high-risk',
  'lactose-free': 'high-risk',
  'nut-free': 'high-risk',
  halal: 'high-risk',
  kosher: 'high-risk',
} as const;

export type DietaryLabel = keyof typeof DIETARY_LABEL_CLASSES;

export type DietaryLabelClass = (typeof DIETARY_LABEL_CLASSES)[DietaryLabel];

export const DIETARY_LABELS = Object.keys(
  DIETARY_LABEL_CLASSES,
) as readonly DietaryLabel[];

export const isDietaryLabel = (value: unknown): value is DietaryLabel =>
  typeof value === 'string' &&
  Object.prototype.hasOwnProperty.call(DIETARY_LABEL_CLASSES, value);

export const dietaryLabelClass = (label: DietaryLabel): DietaryLabelClass =>
  DIETARY_LABEL_CLASSES[label];

/**
 * Stored labels as every reader should see them: known values only, no
 * repeats, in vocabulary order. A value the list does not know - a label a
 * later version removed, or one written by hand - is dropped rather than shown
 * (`R-1`), as for `Restaurant.categories`.
 */
export const dietaryLabelsOf = (values: unknown): DietaryLabel[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  return DIETARY_LABELS.filter((label) => values.includes(label));
};

/**
 * What a restaurant says about its whole kitchen (GitHub issue #2194): a fixed
 * list, as the restaurant states it. A statement covers every dish, which a
 * label on each dish cannot say - "fully halal" is about the kitchen, not about
 * the dishes that happen to be on today's menu.
 */
export const RESTAURANT_DIETARY_STATEMENTS = [
  'fully-plant-based',
  'fully-vegetarian',
  'fully-halal',
  'fully-kosher',
  'dedicated-gluten-free-kitchen',
] as const;

export type RestaurantDietaryStatement =
  (typeof RESTAURANT_DIETARY_STATEMENTS)[number];

export const isRestaurantDietaryStatement = (
  value: unknown,
): value is RestaurantDietaryStatement =>
  (RESTAURANT_DIETARY_STATEMENTS as readonly unknown[]).includes(value);

/** Stored statements as readers see them: known only, no repeats, list order. */
export const restaurantDietaryStatementsOf = (
  values: unknown,
): RestaurantDietaryStatement[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  return RESTAURANT_DIETARY_STATEMENTS.filter((statement) =>
    values.includes(statement),
  );
};

/**
 * The longest cross-contamination note a restaurant may publish. A note says
 * how the kitchen handles shared fryers and surfaces; it is not a menu.
 */
export const MAX_CROSS_CONTAMINATION_NOTE_LENGTH = 500;

/**
 * A dish's declared labels and options, as readers see them (issue #2194).
 * A label the dish fits as served is not also offered as an option: "vegan"
 * beside "a vegan option is available" would contradict itself.
 */
export const menuItemDietaryOf = (
  item: { dietaryLabels?: unknown; dietaryOptions?: unknown } | undefined,
): { labels: DietaryLabel[]; options: DietaryLabel[] } => {
  const labels = dietaryLabelsOf(item?.dietaryLabels);
  const options = dietaryLabelsOf(item?.dietaryOptions).filter(
    (label) => !labels.includes(label),
  );

  return { labels, options };
};
