import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Who may be shown a Bite is decided twice, and the duplication is deliberate
 * (GitHub issue #1717).
 *
 * `bite-listability.ts` in `libs/bite-tribe-common/model` is the single
 * definition: the client applies it to a bucket list it resolves itself and to
 * the save that would add a Bite to one. The callables apply the copy in
 * `functions/shared/utils` to the feed, the searches, the weekly page and the
 * share link. The backend cannot reach the library, for the reason
 * `table-session-parity.spec.ts` gives, so the copy is checked instead of
 * trusted.
 *
 * What drifts silently is a Bite shown on one surface and hidden on another -
 * a bucket list offering a card the feed refuses, or a save rejected for a Bite
 * the feed happily lists. Neither fails a test on its own side.
 *
 * Read as **text** rather than imported, like every other parity spec here.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_LISTABILITY = join(
  __dirname,
  '..',
  'functions',
  'shared',
  'utils',
  'bite-listability.ts',
);

const LIBRARY_LISTABILITY = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'bite-listability.ts',
);

const BOTH = [FUNCTIONS_LISTABILITY, LIBRARY_LISTABILITY];

const listableStatusOf = (file: string): string => {
  const source = readFileSync(file, 'utf8');
  const value = /LISTABLE_IMAGE_STATUS = '([^']+)'/.exec(source);

  if (!value) {
    throw new Error(`No LISTABLE_IMAGE_STATUS declaration found in ${file}`);
  }

  return value[1];
};

/** The declaration of one exported arrow, whitespace collapsed. */
const declarationOf = (file: string, name: string): string => {
  const source = readFileSync(file, 'utf8');
  const declaration = new RegExp(
    `export const ${name} = ([\\s\\S]*?);\\n`,
  ).exec(source);

  if (!declaration) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  return declaration[1]
    .replace(/\s+/g, ' ')
    .replace(/,\s*\)/g, ')')
    .trim();
};

describe('bite listability parity', () => {
  it('lists only uploaded Bites in both files', () => {
    for (const file of BOTH) {
      expect(listableStatusOf(file)).toBe('uploaded');
    }
  });

  it.each(['isListableBite', 'isBiteVisibleTo'])(
    'declares %s identically in both files',
    (name) => {
      expect(declarationOf(FUNCTIONS_LISTABILITY, name)).toBe(
        declarationOf(LIBRARY_LISTABILITY, name),
      );
    },
  );
});
