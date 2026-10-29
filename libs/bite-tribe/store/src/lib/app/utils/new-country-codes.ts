import type { PublicUser } from 'model';
import { filter, map, OperatorFunction, pairwise, pipe } from 'rxjs';

/** The codes as the profile flags read them: trimmed, upper case, once each. */
const normalized = (countryCodes: string[] | null | undefined): string[] => [
  ...new Set(
    (countryCodes ?? [])
      .map((code) => code?.trim().toUpperCase())
      .filter((code): code is string => !!code),
  ),
];

/**
 * The country a profile update just added, if it is one to celebrate (issue
 * #1797).
 *
 * Nothing when the previous codes were empty: that Bite is the user's first,
 * and a first Bite outranks a first country (epic #1741). An update that adds
 * several codes at once, such as a backfill, answers the first of them, so it
 * is celebrated once. One that only removes codes answers nothing.
 */
export const newCountryCode = (
  previous: string[] | null | undefined,
  current: string[] | null | undefined,
): string | undefined => {
  const before = normalized(previous);

  if (before.length === 0) {
    return undefined;
  }

  return normalized(current).find((code) => !before.includes(code));
};

/**
 * Emits the country each later snapshot of the user's own profile adds. The
 * first snapshot only sets the baseline, so a start-up never celebrates codes
 * that were earned while the app was closed.
 */
export const newCountryCodes = (): OperatorFunction<
  Pick<PublicUser, 'countryCodes'>,
  string
> =>
  pipe(
    map((profile) => profile.countryCodes),
    pairwise(),
    map(([previous, current]) => newCountryCode(previous, current)),
    filter((code): code is string => !!code),
  );
