import { SupportedLanguage } from '../i18n/supported-languages';

/**
 * `Intl.DisplayNames` is not free to construct, and one notification send
 * renders the same language for every recipient in its group, so the formatter
 * is kept per language for the lifetime of the function instance.
 */
const countryNameFormatters = new Map<string, Intl.DisplayNames>();

/**
 * The distance between an ASCII letter and its regional indicator symbol. Two
 * regional indicators next to each other are what the OS renders as a flag.
 */
const REGIONAL_INDICATOR_OFFSET = 0x1f1e6 - 'A'.charCodeAt(0);

const ALPHA_2 = /^[A-Z]{2}$/;

/**
 * Names a country in the recipient's own language.
 *
 * A push notification is rendered by the OS before the app runs, so the country
 * behind a badge has to be worded in the backend (issue \#1200). ICU already
 * knows every country in every language the app offers, which is why the
 * catalog carries the sentence and not the 200 country names per locale.
 *
 * Falls back to the raw code for anything ICU cannot name, so an unusual
 * territory still produces a readable notification instead of an error.
 */
export const getCountryName = (
  countryCode: string,
  language: SupportedLanguage,
): string => {
  try {
    let formatter = countryNameFormatters.get(language);

    if (!formatter) {
      formatter = new Intl.DisplayNames([language], { type: 'region' });
      countryNameFormatters.set(language, formatter);
    }

    return formatter.of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
};

/**
 * Turns an ISO 3166-1 alpha-2 code into its flag emoji.
 *
 * The profile renders badges as flag icons from a CSS sprite, which a
 * notification cannot use, so the same recognition is carried by the emoji the
 * OS already ships. Anything that is not a plain alpha-2 code yields no flag
 * rather than a pair of stray symbols.
 */
export const getCountryFlagEmoji = (countryCode: string): string => {
  const code = countryCode.trim().toUpperCase();

  if (!ALPHA_2.test(code)) {
    return '';
  }

  return String.fromCodePoint(
    ...[...code].map(
      (letter) => letter.charCodeAt(0) + REGIONAL_INDICATOR_OFFSET,
    ),
  );
};

/**
 * The way a country badge is named inside notification copy: the flag next to
 * the localized country name.
 *
 * Flag and name travel as one parameter so the catalog keeps a single
 * placeholder. A locale that reads right to left, or one that puts the country
 * last, then decides where the whole badge goes, and a country without a flag
 * leaves no gap in the sentence.
 */
export const buildCountryLabel = (
  countryCode: string,
  language: SupportedLanguage,
): string => {
  const name = getCountryName(countryCode, language);
  const flag = getCountryFlagEmoji(countryCode);

  return flag ? `${flag} ${name}` : name;
};
