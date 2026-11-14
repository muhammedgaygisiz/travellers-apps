import type { Bite } from 'model';

/** How old a copied price may be before the form asks whether it still holds. */
export const COPIED_PRICE_MAX_AGE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * When the price a copied draft carries was recorded, if it is old enough to
 * be worth checking (GitHub issue #2018).
 *
 * The copy keeps the price because that is what saves the typing; a price
 * from last season is only a starting point, so the form says how old it is.
 * Undefined for a draft that is not a copy, a copy without a creation date,
 * and a copy younger than {@link COPIED_PRICE_MAX_AGE_DAYS}.
 */
export const copiedPriceDate = (
  draft: Partial<Bite> | undefined,
  now: Date = new Date(),
): Date | undefined => {
  const createdAt = draft?.copiedFrom?.createdAt;

  if (!createdAt) {
    return undefined;
  }

  const created = new Date(createdAt);

  if (Number.isNaN(created.getTime())) {
    return undefined;
  }

  const ageDays = (now.getTime() - created.getTime()) / DAY_MS;

  return ageDays > COPIED_PRICE_MAX_AGE_DAYS ? created : undefined;
};
