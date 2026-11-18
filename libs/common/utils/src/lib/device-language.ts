/** The language the app falls back to when the device's is not one it ships. */
export const FALLBACK_LANGUAGE = 'en';

/**
 * The Capacitor Preferences key holding the language chosen on this device.
 *
 * Only a choice is stored: onboarding, the settings page, and the sign-in
 * reconciliation write it. The device language a new user starts in is never
 * written here, so a phone whose language changes before the first sign-in is
 * followed (issue #2104).
 */
export const LANGUAGE_PREFERENCE_KEY = 'lang';

export interface ShippedLanguage {
  readonly code: string;
  /** Transloco key for the language's endonym, e.g. `turkish` for `Türkçe`. */
  readonly labelKey: string;
}

/**
 * Languages the consumer app ships translations for, English first and the
 * rest by code. Kept in sync with the Transloco `availableLangs` in the shell
 * config and the locale files under `assets/i18n`; a code listed here without
 * a locale file would fall back to English at runtime.
 */
export const SHIPPED_LANGUAGES: readonly ShippedLanguage[] = [
  { code: 'en', labelKey: 'english' },
  { code: 'am', labelKey: 'amharic' },
  { code: 'ar', labelKey: 'arabic' },
  { code: 'de', labelKey: 'german' },
  { code: 'es', labelKey: 'spanish' },
  { code: 'fr', labelKey: 'french' },
  { code: 'id', labelKey: 'indonesian' },
  { code: 'it', labelKey: 'italian' },
  { code: 'ja', labelKey: 'japanese' },
  { code: 'ko', labelKey: 'korean' },
  { code: 'pt', labelKey: 'portuguese' },
  { code: 'th', labelKey: 'thai' },
  { code: 'tr', labelKey: 'turkish' },
  { code: 'zh', labelKey: 'chinese' },
];

/**
 * The interface language the device or browser reports, e.g. `tr-TR`.
 *
 * A web view reads the OS language here, so this is the device language on a
 * native build and the browser language on the web.
 */
export const readDeviceLocale = (): string =>
  navigator.language || navigator.languages?.[0] || FALLBACK_LANGUAGE;

/**
 * The shipped language a locale tag maps to, or English when it maps to none.
 *
 * Only the primary subtag counts, so `tr-TR` and `tr` both give `tr`. The one
 * exception is Chinese: `zh` is Simplified Chinese only, so a locale reading
 * Traditional Chinese (`zh-Hant`, or a region that writes it) gets English
 * rather than a script it did not choose (issue #1880).
 *
 * Start-up and the onboarding language step share this rule, so the language a
 * new user first sees is the one onboarding prefills (issue #2104).
 */
export const languageForLocale = (
  locale: string,
  shippedLanguages: readonly string[],
): string => {
  const [language, ...subtags] = locale
    .replace(/_/g, '-')
    .toLowerCase()
    .split('-');

  if (
    language === 'zh' &&
    subtags.some((subtag) => ['hant', 'tw', 'hk', 'mo'].includes(subtag)) &&
    !subtags.includes('hans')
  ) {
    return FALLBACK_LANGUAGE;
  }

  return shippedLanguages.includes(language) ? language : FALLBACK_LANGUAGE;
};
