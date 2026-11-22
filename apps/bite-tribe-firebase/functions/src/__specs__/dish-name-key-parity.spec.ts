import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { dishNameKey } from '../functions/shared/utils/dish-name-key';
import { normalizePlaceName } from '../functions/shared/utils/restaurant-candidates';

/**
 * The dish-name key exists twice (GitHub issue #2216), for the reason
 * `currency-by-region-parity.spec.ts` gives: the Functions project cannot
 * import `libs/bite-tribe-common/model`. Verification groups Bites into menu
 * items by the Functions copy, and the business app suggests a dish for a Bite
 * by the library one, so a difference would suggest a different dish than the
 * one the Bite was grouped under.
 *
 * Both are read as text, because the library is outside this project's
 * `rootDir`.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const declarationIn = (file: string): string => {
  const source = readFileSync(file, 'utf8');
  const declaration = /export const dishNameKey[\s\S]*?\n};/.exec(source);

  if (!declaration) {
    throw new Error(`No dishNameKey declaration found in ${file}`);
  }

  return declaration[0].replace(/\s+/g, ' ');
};

describe('dish-name key parity', () => {
  it('declares the same dishNameKey in the library and in Functions', () => {
    expect(
      declarationIn(
        join(
          __dirname,
          '..',
          'functions',
          'shared',
          'utils',
          'dish-name-key.ts',
        ),
      ),
    ).toBe(
      declarationIn(
        join(
          WORKSPACE_ROOT,
          'libs',
          'bite-tribe-common',
          'model',
          'src',
          'lib',
          'dish-name-key.ts',
        ),
      ),
    );
  });

  /**
   * Initial Menus were grouped by `normalizePlaceName(name) || lowercase`
   * before the key had a name of its own; the same names must still group.
   */
  it.each([
    'Margherita',
    '  margherita ',
    'Crème brûlée',
    'Fish & Chips',
    'カレー',
    'Pad   Thai!',
  ])('keys %p as the Initial Menu always grouped it', (name) => {
    const trimmed = name.trim();

    expect(dishNameKey(name)).toBe(
      normalizePlaceName(trimmed) || trimmed.toLocaleLowerCase(),
    );
  });
});
