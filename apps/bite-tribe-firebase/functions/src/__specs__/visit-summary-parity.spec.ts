import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The visit summary model exists twice, and the duplication is deliberate
 * (GitHub issue #1111).
 *
 * `table-visit-parity.spec.ts` next door explains the wall: this project
 * compiles with its own `tsconfig.json`, whose `rootDir` is `src`, and the
 * deploy uploads `lib/` alone - so the library the model belongs in is not
 * importable here. Copy it, and make the copy checked rather than trusted.
 *
 * What drifts worst here is a **refusal reason**. Each one is a Transloco key
 * on the guest's screen, so a reason this backend answers with and the library
 * does not declare is a blank line where somebody was told why they cannot see
 * what they ate, or why their mail did not go.
 *
 * Both files are read as text rather than imported, for the same reason: the
 * library resolves through a path mapping this project does not have.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_FILE = join(
  __dirname,
  '..',
  'functions',
  'restaurants',
  'visit-summary.ts',
);

const LIBRARY_FILE = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'visit-summary.ts',
);

/**
 * The members of a `const` list, in declaration order.
 *
 * Comments are stripped first, because a doc comment on a member is ordinary
 * here and an apostrophe in one would otherwise be read as the start of a
 * quoted member - the trap `table-visit-parity.spec.ts` hit on issue #1110.
 */
const listIn = (file: string, name: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const declaration = new RegExp(`${name}[^=]*= \\[([\\s\\S]*?)\\]`).exec(
    source,
  );

  if (!declaration) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  const members = declaration[1]
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

  return [...members.matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

/** The value of a `const NAME: Type = 'value'` declaration. */
const valueIn = (file: string, name: string): string => {
  const source = readFileSync(file, 'utf8');
  const declaration = new RegExp(`${name}[^=]*= '([^']+)'`).exec(source);

  if (!declaration) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  return declaration[1];
};

const BOTH = [FUNCTIONS_FILE, LIBRARY_FILE];

describe('visit summary parity', () => {
  /**
   * The address the trigger writes to and the guest reads from. A
   * disagreement here is a summary written where nothing looks for it.
   */
  it('stores summaries in the same collection on both sides', () => {
    expect(valueIn(FUNCTIONS_FILE, 'VISIT_SUMMARIES_COLLECTION')).toBe(
      valueIn(LIBRARY_FILE, 'VISIT_SUMMARIES_COLLECTION'),
    );
    expect(valueIn(LIBRARY_FILE, 'VISIT_SUMMARIES_COLLECTION')).toBe(
      'visitSummaries',
    );
  });

  it('agrees on why a summary cannot be read', () => {
    expect(listIn(FUNCTIONS_FILE, 'VISIT_SUMMARY_REFUSAL_REASONS')).toEqual(
      listIn(LIBRARY_FILE, 'VISIT_SUMMARY_REFUSAL_REASONS'),
    );
  });

  /**
   * Two, and the second is the retention rule: a member keeps their summaries
   * for as long as the account exists, an unregistered guest until the session
   * that produced them goes idle (`RD-TS-46`). A third reason appearing on one
   * side would be a rule one half of the product does not know about.
   */
  it('refuses a read for the two reasons that exist', () => {
    BOTH.forEach((file) =>
      expect(listIn(file, 'VISIT_SUMMARY_REFUSAL_REASONS')).toEqual([
        'notFound',
        'sessionExpired',
      ]),
    );
  });

  it('agrees on why a summary cannot be emailed', () => {
    expect(
      listIn(FUNCTIONS_FILE, 'VISIT_SUMMARY_EMAIL_REFUSAL_REASONS'),
    ).toEqual(listIn(LIBRARY_FILE, 'VISIT_SUMMARY_EMAIL_REFUSAL_REASONS'));
  });

  /**
   * `alreadySent` is the one that matters most: it is the bound that keeps a
   * callable which mails arbitrary addresses from being a spam relay
   * (`RD-TS-48`), and a copy that dropped it would be a screen that never
   * tells a guest their one send is gone.
   */
  it('refuses a send for the five reasons that exist', () => {
    BOTH.forEach((file) =>
      expect(listIn(file, 'VISIT_SUMMARY_EMAIL_REFUSAL_REASONS')).toEqual([
        'notFound',
        'sessionExpired',
        'alreadySent',
        'invalidAddress',
        'sendFailed',
      ]),
    );
  });
});
