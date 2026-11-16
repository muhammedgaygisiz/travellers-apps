/**
 * The translation key for a count label: the `-one` variant for exactly one,
 * the base key for any other count (issue #2094). The catalogs carry both, and
 * a language that does not inflect gives them the same text.
 *
 * Kept to "one or not" on purpose. The board shows Bite and like counts only,
 * and every language the app ships either inflects for one alone or not at all
 * in how these labels are written.
 */
export const countKey = (key: string, count: number): string =>
  count === 1 ? `${key}-one` : key;
