import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALE_DIR = join(__dirname, '..', '..', 'assets', 'i18n');

const readLocale = (file: string): Record<string, string> =>
  JSON.parse(readFileSync(join(LOCALE_DIR, file), 'utf8'));

const localeFiles = readdirSync(LOCALE_DIR).filter((file) =>
  file.endsWith('.json'),
);

const referenceKeys = Object.keys(readLocale('en.json'));

describe('locale copy', () => {
  /**
   * A key that is missing from one locale file does not fail a build - Transloco
   * silently falls back to English - so the only thing standing between a
   * half-translated feature and the store is this test.
   */
  describe.each(localeFiles)('%s', (file) => {
    const messages = readLocale(file);

    it('carries every key that en.json carries', () => {
      expect(Object.keys(messages).sort()).toEqual([...referenceKeys].sort());
    });

    /**
     * My Bites lists only the signed-in user's own Bites, so the discovery
     * feed's invitation to "be the first one" is wrong there twice over: the
     * user cannot be the first to write their own list, and the sentence blames
     * the emptiness on other people. See GitHub issue #1417.
     */
    it("does not reuse the feed invitation for the user's own empty list", () => {
      expect(messages['no-own-bites-yet']).toBeTruthy();
      expect(messages['no-own-bites-yet']).not.toBe(
        messages['no-bites-found-be-the-first'],
      );
    });
  });

  /**
   * Turkish writes `ı` and `ş`, and dropping them reads as sloppiness to a
   * native speaker in a way an English reviewer never sees. These three settings
   * strings shipped as ASCII while their neighbour `dark` was already correct.
   * See GitHub issue #1416.
   */
  describe('tr.json', () => {
    const messages = readLocale('tr.json');

    it.each([
      ['theme', 'Tema'],
      ['light', 'Aydınlık'],
      ['dark', 'Karanlık'],
      ['no-location', 'Konum bulunamadı'],
    ])('spells %s with its Turkish characters', (key, expected) => {
      expect(messages[key]).toBe(expected);
    });
  });

  /**
   * Copy addresses the user without a grammatical gender, by rephrasing rather
   * than by marking both forms (`Implementation - Localization`). A deny-list
   * cannot prove a string neutral; it only keeps the forms that already shipped
   * from coming back. See GitHub issues #1824 and #1825.
   */
  describe('gender-neutral address', () => {
    // Spanish `la bienvenida` and Italian `il benvenuto` are nouns and the
    // neutral rephrasing; only the adjective addresses the user with a gender.
    const GENDERED_ADDRESS: Record<string, RegExp[]> = {
      'es.json': [
        /(?<!\b(?:la|una|de) )\bbienvenid[oa]s?\b/i,
        /\bestás segur[oa]\b/i,
        /\bsé (?:el|la) primer[oa]\b/i,
        /\bsentad[oa]\b/i,
        /\b(?:permanecer|seguir|quedarte) (?:públic|privad)[oa]\b/i,
      ],
      'it.json': [
        /(?<!\b(?:il|un|del|di|al|nel) )\bbenvenut[oaie]\b/i,
        /\bsei sicur[oa]\b/i,
        /\bsii (?:il|la) prim[oa]\b/i,
        /\bsedut[oa]\b/i,
        /\b(?:rimani|restare|resta|diventa) (?:pubblic|privat)[oa]\b/i,
      ],
      'pt.json': [
        /\bbem-vind[oa]s?\b/i,
        /\bobrigad[oa]\b/i,
        /\bseja (?:o|a) primeir[oa]\b/i,
        /\bsentad[oa]\b/i,
        /\bficar (?:públic|privad)[oa]\b/i,
      ],
      // `Bienvenue` is the neutral noun; the bare adjective is masculine.
      'fr.json': [
        /\bbienvenus?\b/i,
        /\bes-tu sûre?\b/i,
        /\bsois (?:le|la) premi(?:er|ère)\b/i,
        /\btoi seule?\b/i,
        /\brester (?:public|privé)\b/i,
      ],
      'de.json': [/\b(?:Benutzer|Nutzer)(?:n|s)?\b/],
      // Masculine informal second person; Amharic uses the polite form.
      'am.json': [
        /መጣህ/,
        /ትከተላለህ/,
        /ትፈልጋለህ/,
        /ትችላለህ/,
        /ነህ[?።\s]/,
        /እባክህ/,
        /አንተ/,
      ],
      // Masculine imperative and adjective; Arabic uses a verbal noun.
      'ar.json': [/هل أنت متأكد/, /(?:^|\s)حاول مرة أخرى/, /(?:^|\s)اضغط /],
      // Gendered speaker particles in the app's own voice.
      'th.json': [/ครับ|ค่ะ/],
    };

    const offenders = Object.entries(GENDERED_ADDRESS).flatMap(
      ([file, patterns]) =>
        Object.entries(readLocale(file))
          .filter(([, value]) =>
            patterns.some((pattern) => pattern.test(value)),
          )
          .map(([key]) => `${file} ${key}`),
    );

    it('does not address the user with a gendered form', () => {
      expect(offenders).toEqual([]);
    });
  });

  /**
   * The theme row names the setting, not one of its two options. Every other
   * locale uses the neutral word, and `Theme` was left untranslated in German
   * and French. See GitHub issue #1416.
   */
  describe('theme label', () => {
    it.each([
      ['de.json', 'Design'],
      ['fr.json', 'Thème'],
      ['tr.json', 'Tema'],
    ])(
      'names the setting rather than the light option in %s',
      (file, expected) => {
        expect(readLocale(file)['theme']).toBe(expected);
      },
    );
  });
});
