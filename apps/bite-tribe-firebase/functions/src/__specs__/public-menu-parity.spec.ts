import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Why a public menu was withheld exists twice, and the duplication is
 * deliberate (GitHub issue #1102).
 *
 * `public-menu.ts` in `libs/bite-tribe-common/model` is the single definition.
 * The backend cannot reach it: this project compiles with its own
 * `tsconfig.json`, whose `rootDir` is `src` and which carries none of the
 * workspace path mappings, and the deploy uploads `lib/` alone. So the list is
 * copied, and `table-scan-parity.spec.ts` is the precedent for what to do about
 * that - copy the data, and make the copy checked instead of trusted.
 *
 * The drift is silent and lands in front of a guest. `public-menu.component`
 * renders the refusal as `'public-menu-refused-' + reason | transloco`, so a
 * reason the backend returns that the client has no sentence for is a heading
 * above a blank line - somebody who scanned a code being told nothing at all.
 * Both copies would keep passing their own tests while it happened.
 *
 * Both files are read as **text** rather than imported, for the same reason the
 * table-scan spec reads them that way.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_PUBLIC_MENU = join(
  __dirname,
  '..',
  'functions',
  'menus',
  'load-public-menu.ts',
);

const LIBRARY_PUBLIC_MENU = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'public-menu.ts',
);

const CONSUMER_LOCALES = join(
  WORKSPACE_ROOT,
  'apps',
  'bite-tribe',
  'src',
  'assets',
  'i18n',
);

/**
 * The `PUBLIC_MENU_REFUSAL_REASONS` members, in declaration order.
 *
 * Anchored on the constant rather than on any quoted string in the file: the
 * library copy documents each reason in prose above it, and a reason named in a
 * sentence is not a member.
 */
const reasonsIn = (file: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const list = /PUBLIC_MENU_REFUSAL_REASONS = \[([\s\S]*?)\] as const/.exec(
    source,
  );

  if (!list) {
    throw new Error(
      `No PUBLIC_MENU_REFUSAL_REASONS declaration found in ${file}`,
    );
  }

  return [...list[1].matchAll(/^\s*'([^']+)',/gm)].map((match) => match[1]);
};

/** The eleven consumer locales, as `[language, messages]`. */
const CONSUMER_LANGS = [
  'am',
  'ar',
  'de',
  'en',
  'es',
  'fr',
  'id',
  'it',
  'pt',
  'th',
  'tr',
] as const;

const localeFiles = (): [string, Record<string, string>][] =>
  CONSUMER_LANGS.map((lang) => [
    lang,
    JSON.parse(
      readFileSync(join(CONSUMER_LOCALES, `${lang}.json`), 'utf8'),
    ) as Record<string, string>,
  ]);

describe('public menu parity', () => {
  it('finds a reason list in both files', () => {
    expect(reasonsIn(FUNCTIONS_PUBLIC_MENU).length).toBeGreaterThan(1);
    expect(reasonsIn(LIBRARY_PUBLIC_MENU).length).toBeGreaterThan(1);
  });

  /**
   * Order as well as membership. The order is the order the checks run in,
   * which decides *which* of several true refusals a reader is shown - so the
   * two copies disagreeing about it would be the two copies disagreeing about
   * the contract, not about a list.
   */
  it('holds the same reasons in the same order in both files', () => {
    expect(reasonsIn(FUNCTIONS_PUBLIC_MENU)).toEqual(
      reasonsIn(LIBRARY_PUBLIC_MENU),
    );
  });

  /**
   * A refusal reaches the reader as one sentence looked up by its own name, so
   * a member with no key renders as nothing at all. Checked in **every** locale
   * rather than in English alone: a missing key falls back silently, and the
   * repository rule is that user-facing copy lands in all of them together.
   */
  it('gives every reason a sentence in every consumer locale', () => {
    const reasons = reasonsIn(LIBRARY_PUBLIC_MENU);
    const missing: string[] = [];

    for (const [lang, messages] of localeFiles()) {
      for (const reason of reasons) {
        const key = `public-menu-refused-${reason}`;

        if (!messages[key]) {
          missing.push(`${lang}.json is missing ${key}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });

  /**
   * Ordering is not a reason to withhold a menu, and this endpoint is the one
   * the menu-only restaurant of #1102 exists for. A reason about ordering
   * appearing here would mean the public path had grown the dead end the issue
   * removed from the scan.
   */
  it('never refuses a menu for a reason about ordering', () => {
    const reasons = reasonsIn(LIBRARY_PUBLIC_MENU);

    expect(reasons).not.toContain('tableOrderingDisabled');
    expect(reasons).not.toContain('orderingPaused');
    expect(reasons).not.toContain('menuUnavailable');
  });
});
