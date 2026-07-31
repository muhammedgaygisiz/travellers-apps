/**
 * Languages the consumer app can render.
 *
 * Mirrors `availableLangs` in `libs/bite-tribe/shell/src/lib/app.config.ts`.
 * A push notification is rendered by the OS, not by Transloco, so the backend
 * needs its own copy of the list to pick the right copy before sending.
 */
export const SUPPORTED_LANGUAGES = [
  'en',
  'de',
  'fr',
  'tr',
  'es',
  'it',
  'ar',
  'am',
  'id',
  'pt',
  'th',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Matches Transloco's `defaultLang`/`fallbackLang`. */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

const isSupported = (value: string): value is SupportedLanguage =>
  (SUPPORTED_LANGUAGES as readonly string[]).includes(value);

/**
 * Maps a stored settings value onto a language the catalog covers.
 *
 * Settings documents hold whatever the app wrote, which today is a plain
 * language code but historically could be a browser tag such as `de-CH`, so the
 * region subtag is dropped before the lookup. Anything unknown, missing, or
 * malformed falls back to {@link DEFAULT_LANGUAGE} rather than blocking the
 * notification.
 */
export const normalizeLanguage = (value: unknown): SupportedLanguage => {
  if (typeof value !== 'string') {
    return DEFAULT_LANGUAGE;
  }

  const base = value.trim().toLowerCase().split(/[-_]/)[0];

  return isSupported(base) ? base : DEFAULT_LANGUAGE;
};
