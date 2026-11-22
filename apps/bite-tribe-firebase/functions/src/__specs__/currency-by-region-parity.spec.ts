import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The region-to-currency map exists twice, for the reason
 * `role-list-parity.spec.ts` gives for the role list: the Functions project
 * cannot import `libs/common/utils`. This spec is what keeps the copy honest
 * (GitHub issue #1511).
 *
 * Both maps are read as text rather than imported, because the library file is
 * outside this project's `rootDir` and its barrel pulls in Angular.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_MAP = join(
  __dirname,
  '..',
  'functions',
  'shared',
  'utils',
  'currency-by-region.ts',
);

const LIBRARY_UTILS = join(WORKSPACE_ROOT, 'libs', 'common', 'utils', 'src');

const LIBRARY_MAP = join(LIBRARY_UTILS, 'lib', 'get-currency-for-device.ts');

const LIBRARY_CURRENCIES = join(LIBRARY_UTILS, 'lib', 'currencies.ts');

/** The `CURRENCY_BY_REGION` entries, as `region -> currency`. */
const mapIn = (file: string): Record<string, string> => {
  const source = readFileSync(file, 'utf8');
  const body = /CURRENCY_BY_REGION[^=]*= \{([^}]*)\}/.exec(source);

  if (!body) {
    throw new Error(`No CURRENCY_BY_REGION declaration found in ${file}`);
  }

  return Object.fromEntries(
    [...body[1].matchAll(/([A-Z]{2}): '([A-Z]{3})'/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
};

/** The currency codes the apps can render, from `currencyCodes`. */
const renderableCurrencies = (): string[] =>
  [
    ...readFileSync(LIBRARY_CURRENCIES, 'utf8').matchAll(/code: '([A-Z]{3})'/g),
  ].map((match) => match[1]);

describe('region currency map parity', () => {
  it('finds a map in both files', () => {
    expect(Object.keys(mapIn(FUNCTIONS_MAP)).length).toBeGreaterThan(10);
    expect(Object.keys(mapIn(LIBRARY_MAP)).length).toBeGreaterThan(10);
  });

  it('maps every region to the same currency in both files', () => {
    expect(mapIn(FUNCTIONS_MAP)).toEqual(mapIn(LIBRARY_MAP));
  });

  // The device helper filters its answer through `currencyCodes`; the copy
  // cannot, so a currency the apps cannot render has to be caught here before
  // a derived menu states it.
  it('only names currencies the apps can render', () => {
    const renderable = renderableCurrencies();

    expect(renderable.length).toBeGreaterThan(10);
    Object.values(mapIn(FUNCTIONS_MAP)).forEach((currency) =>
      expect(renderable).toContain(currency),
    );
  });
});
