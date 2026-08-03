/**
 * Languages the Privacy Policy is legally reviewed and published in.
 *
 * A legal document may only be shown in a language whose wording carries the
 * same coverage as the English original, so this list is deliberately smaller
 * than the app's `availableLangs`. Adding a language here means its policy copy
 * exists in that locale file and has been reviewed (issue #1218).
 */
export const REVIEWED_PRIVACY_POLICY_LANGUAGES = ['en', 'de'] as const;

/** The published language a user without a reviewed policy is shown. */
export const PRIVACY_POLICY_FALLBACK_LANGUAGE = 'en';

export type PrivacyPolicyLanguage = {
  /** The language the policy body is rendered in. */
  lang: string;
  /** True when the app language has no reviewed policy and English is shown. */
  isFallback: boolean;
};

/**
 * Resolves the app language to the language the policy is rendered in.
 *
 * The resolution is deterministic in both directions: a reviewed language
 * always renders its own policy, and every other language always renders the
 * English one and reports the fallback, so the page can disclose the switch
 * instead of silently changing the language of legal content.
 */
export const resolvePrivacyPolicyLanguage = (
  appLang: string | undefined | null,
): PrivacyPolicyLanguage => {
  // Region tags such as `de-CH` still mean German. Everything else - an empty
  // or unknown value included - resolves to the fallback.
  const lang = (appLang ?? '').toLowerCase().split(/[-_]/)[0];

  const isReviewed = (
    REVIEWED_PRIVACY_POLICY_LANGUAGES as readonly string[]
  ).includes(lang);

  return {
    lang: isReviewed ? lang : PRIVACY_POLICY_FALLBACK_LANGUAGE,
    isFallback: !isReviewed,
  };
};
