/**
 * Languages the Privacy Policy is published in.
 *
 * A legal document may only be shown in a language whose wording carries the
 * same coverage as the English original, so a language belongs here only once
 * its policy copy exists in that locale file (issue #1218). Every app language
 * is covered today, and this list has to be extended together with
 * `availableLangs` in `libs/bite-tribe/shell/src/lib/app.config.ts`: a locale
 * added there without policy copy would otherwise render raw keys.
 */
export const PUBLISHED_PRIVACY_POLICY_LANGUAGES = [
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

/** The published language a user without a published policy is shown. */
export const PRIVACY_POLICY_FALLBACK_LANGUAGE = 'en';

export type PrivacyPolicyLanguage = {
  /** The language the policy body is rendered in. */
  lang: string;
  /** True when the language has no published policy and English is shown. */
  isFallback: boolean;
};

/**
 * Resolves the app language to the language the policy is rendered in.
 *
 * The resolution is deterministic in both directions: a published language
 * always renders its own policy, and anything else - a language the app does
 * not offer, or a preference that has not loaded yet - always renders the
 * English one and reports the fallback, so the page can disclose the switch
 * instead of silently changing the language of legal content.
 */
export const resolvePrivacyPolicyLanguage = (
  appLang: string | undefined | null,
): PrivacyPolicyLanguage => {
  // Region tags such as `de-CH` still mean German. Everything else - an empty
  // or unknown value included - resolves to the fallback.
  const lang = (appLang ?? '').toLowerCase().split(/[-_]/)[0];

  const isPublished = (
    PUBLISHED_PRIVACY_POLICY_LANGUAGES as readonly string[]
  ).includes(lang);

  return {
    lang: isPublished ? lang : PRIVACY_POLICY_FALLBACK_LANGUAGE,
    isFallback: !isPublished,
  };
};
