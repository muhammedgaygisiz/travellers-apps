import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const LOCALE_DIR = join(__dirname, '..', '..', 'assets', 'i18n');

/**
 * The language picker names every language by its endonym - the name in that
 * language - so a speaker finds their own language whatever the interface is
 * currently set to. That makes the language names the one group of strings
 * that has to be identical in every locale file instead of translated: a
 * locale that translates them hides `Deutsch` from a German speaker who left
 * the device in another language (issue #1415).
 */
const LANGUAGE_ENDONYMS: Readonly<Record<string, string>> = {
  amharic: 'አማርኛ',
  arabic: 'العربية',
  english: 'English',
  french: 'Français',
  german: 'Deutsch',
  indonesian: 'Indonesia',
  italian: 'Italiano',
  portuguese: 'Português',
  spanish: 'Español',
  thai: 'ไทย',
  turkish: 'Türkçe',
};

const localeFiles = readdirSync(LOCALE_DIR).filter((file) =>
  file.endsWith('.json'),
);

describe('language names', () => {
  it('has one locale file per offered language', () => {
    expect(localeFiles).toHaveLength(Object.keys(LANGUAGE_ENDONYMS).length);
  });

  describe.each(localeFiles)('%s', (file) => {
    const messages: Record<string, string> = JSON.parse(
      readFileSync(join(LOCALE_DIR, file), 'utf8'),
    );

    it.each(Object.entries(LANGUAGE_ENDONYMS))(
      'names %s by its endonym',
      (key, endonym) => {
        expect(messages[key]).toBe(endonym);
      },
    );
  });
});
