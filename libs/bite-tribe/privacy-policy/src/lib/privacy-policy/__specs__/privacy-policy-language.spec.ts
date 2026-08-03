import {
  PRIVACY_POLICY_FALLBACK_LANGUAGE,
  REVIEWED_PRIVACY_POLICY_LANGUAGES,
  resolvePrivacyPolicyLanguage,
} from '../privacy-policy-language';

describe('resolvePrivacyPolicyLanguage', () => {
  describe.each(REVIEWED_PRIVACY_POLICY_LANGUAGES)(
    'given the reviewed language %s',
    (lang) => {
      it('should resolve to that language without a fallback', () => {
        expect(resolvePrivacyPolicyLanguage(lang)).toEqual({
          lang,
          isFallback: false,
        });
      });
    },
  );

  describe.each(['fr', 'tr', 'es', 'it', 'ar', 'am', 'id', 'pt', 'th'])(
    'given the app language %s',
    (lang) => {
      it('should resolve to the fallback language and report the fallback', () => {
        expect(resolvePrivacyPolicyLanguage(lang)).toEqual({
          lang: PRIVACY_POLICY_FALLBACK_LANGUAGE,
          isFallback: true,
        });
      });
    },
  );

  describe.each(['de-CH', 'de_AT', 'DE'])(
    'given the regional language tag %s',
    (lang) => {
      it('should resolve to the reviewed base language', () => {
        expect(resolvePrivacyPolicyLanguage(lang)).toEqual({
          lang: 'de',
          isFallback: false,
        });
      });
    },
  );

  describe.each([undefined, null, ''])('given the value %p', (lang) => {
    it('should resolve to the fallback language and report the fallback', () => {
      expect(resolvePrivacyPolicyLanguage(lang)).toEqual({
        lang: PRIVACY_POLICY_FALLBACK_LANGUAGE,
        isFallback: true,
      });
    });
  });
});
