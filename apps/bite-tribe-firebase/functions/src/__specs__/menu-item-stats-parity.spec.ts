import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The menu-item aggregate exists twice, and the duplication is deliberate
 * (GitHub issue #1113).
 *
 * The wall `table-visit-parity.spec.ts` describes: this project compiles with
 * its own `tsconfig.json` and cannot import the library the model belongs in.
 *
 * What drifts worst here is the **collection name**, because the two sides
 * address the document from different directions: the trigger has a Bite in
 * hand and writes it, and the menu screen has a restaurant and reads it. A
 * disagreement is a counter nothing ever shows.
 *
 * The arithmetic is checked rather than compared, because the two files spell
 * it differently on purpose - the backend increments and the library derives -
 * so a text comparison would fail on a difference that is the point.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_FILE = join(
  __dirname,
  '..',
  'functions',
  'restaurants',
  'menu-item-stats.ts',
);

const LIBRARY_FILE = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'menu-item-stats.ts',
);

/** The value of a `const NAME = 'value'` declaration. */
const valueIn = (file: string, name: string): string => {
  const source = readFileSync(file, 'utf8');
  const declaration = new RegExp(`${name}[^=]*= '([^']+)'`).exec(source);

  if (!declaration) {
    throw new Error(`No ${name} declaration found in ${file}`);
  }

  return declaration[1];
};

/** The fields an interface declares, in order. */
const fieldsIn = (file: string, name: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const declaration = new RegExp(
    `export interface ${name} \\{([\\s\\S]*?)\\n\\}`,
  ).exec(source);

  if (!declaration) {
    throw new Error(`No ${name} interface found in ${file}`);
  }

  return [
    ...declaration[1]
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .matchAll(/^\s*(?:readonly\s+)?([A-Za-z0-9_$]+)\??:/gm),
  ].map((match) => match[1]);
};

describe('menu item stats parity', () => {
  it('stores the aggregate in the same collection on both sides', () => {
    expect(valueIn(FUNCTIONS_FILE, 'MENU_ITEM_STATS_COLLECTION')).toBe(
      valueIn(LIBRARY_FILE, 'MENU_ITEM_STATS_COLLECTION'),
    );
    expect(valueIn(LIBRARY_FILE, 'MENU_ITEM_STATS_COLLECTION')).toBe(
      'menuItemStats',
    );
  });

  /**
   * The shape the trigger writes and the screen reads. A field one side does
   * not know about is a field the other writes into a void.
   */
  it('agrees on the fields the aggregate carries', () => {
    expect(fieldsIn(FUNCTIONS_FILE, 'MenuItemStats')).toEqual(
      fieldsIn(LIBRARY_FILE, 'MenuItemStats'),
    );
  });

  /**
   * Two counts and a sum, and each one earns its place. The sum is what makes
   * the average maintainable by increment rather than by reading every Bite of
   * a dish; the two counts are kept apart because `Bite.rating` is optional
   * and "seven Bites, rated by four of them" is the honest sentence.
   */
  it('keeps the two counts and the sum', () => {
    [FUNCTIONS_FILE, LIBRARY_FILE].forEach((file) =>
      expect(fieldsIn(file, 'MenuItemStats')).toEqual([
        'id',
        'restaurantId',
        'biteCount',
        'ratingCount',
        'ratingSum',
        'updatedAt',
      ]),
    );
  });
});
