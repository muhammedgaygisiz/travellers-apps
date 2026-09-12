import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The refusal a guest is shown exists twice, and the duplication is deliberate
 * (GitHub issue #1100).
 *
 * `table-ordering.ts` in `libs/bite-tribe-common/model` is the single
 * definition, so that the backend and the screen rendering a refused scan
 * cannot each hold their own idea of what a scan can be refused for. The
 * backend then cannot reach it: this project compiles with its own
 * `tsconfig.json`, whose `rootDir` is `src` and which carries none of the
 * workspace path mappings, and the deploy uploads `lib/` alone.
 *
 * `table-state-parity.spec.ts` and `role-list-parity.spec.ts` are the
 * precedent: copy the data, and make the copy checked instead of trusted.
 *
 * The drift here is silent and lands in front of a paying guest. A reason the
 * backend returns and the client has no sentence for renders as an empty
 * refusal screen - somebody standing at a table being told nothing at all,
 * which is exactly what "a distinct, actionable reason rather than a generic
 * error" was written to prevent. Both copies would keep passing their own tests
 * while it happened.
 *
 * It reads both files as **text** rather than importing them, for the same
 * reason the other two do: the library is outside this project's `rootDir` and
 * resolves through a path mapping this project does not have.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_TABLE_SCAN = join(
  __dirname,
  '..',
  'functions',
  'restaurants',
  'table-scan.ts',
);

const LIBRARY_TABLE_ORDERING = join(
  WORKSPACE_ROOT,
  'libs',
  'bite-tribe-common',
  'model',
  'src',
  'lib',
  'table-ordering.ts',
);

/**
 * The `TABLE_SCAN_REFUSAL_REASONS` members, in declaration order.
 *
 * Anchored on the constant rather than on any quoted string in the file: the
 * library copy documents each reason in prose above it, and a reason named in a
 * sentence is not a member.
 */
const reasonsIn = (file: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const list = /TABLE_SCAN_REFUSAL_REASONS = \[([\s\S]*?)\] as const/.exec(
    source,
  );

  if (!list) {
    throw new Error(
      `No TABLE_SCAN_REFUSAL_REASONS declaration found in ${file}`,
    );
  }

  return [...list[1].matchAll(/^\s*'([^']+)',/gm)].map((match) => match[1]);
};

/** The reason-to-next-step table, parsed out of the object literal. */
const nextStepsIn = (file: string): Record<string, string> => {
  const source = readFileSync(file, 'utf8');
  const body = /TABLE_SCAN_NEXT_STEPS[^=]*= \{([\s\S]*?)\} as const/.exec(
    source,
  );

  if (!body) {
    throw new Error(`No TABLE_SCAN_NEXT_STEPS declaration found in ${file}`);
  }

  return Object.fromEntries(
    [...body[1].matchAll(/(\w+): '([^']+)'/g)].map((row) => [row[1], row[2]]),
  );
};

describe('table scan parity', () => {
  it('finds a reason list in both files', () => {
    expect(reasonsIn(FUNCTIONS_TABLE_SCAN).length).toBeGreaterThan(1);
    expect(reasonsIn(LIBRARY_TABLE_ORDERING).length).toBeGreaterThan(1);
  });

  /**
   * Order as well as membership. The order of the members is the order the
   * checks run in, which is what decides *which* of several true refusals a
   * guest is shown - so the two copies disagreeing about it would be the two
   * copies disagreeing about the contract, not about a list.
   */
  it('holds the same reasons in the same order in both files', () => {
    expect(reasonsIn(FUNCTIONS_TABLE_SCAN)).toEqual(
      reasonsIn(LIBRARY_TABLE_ORDERING),
    );
  });

  it('carries the twelve reasons that exist', () => {
    expect(reasonsIn(LIBRARY_TABLE_ORDERING)).toEqual([
      'unknownToken',
      'restaurantNotFound',
      'restaurantInactive',
      'tableOrderingDisabled',
      'tableNotFound',
      'tableDisabled',
      'tokenSuperseded',
      'tokenRevoked',
      'orderingPaused',
      'restaurantClosed',
      'menuMissing',
      'menuUnavailable',
    ]);
  });

  /**
   * The next step is what the guest is told to *do*, so a copy that pairs it
   * differently sends them to look for a sticker that is not there, or tells
   * them to wait out a refusal that waiting cannot fix.
   */
  it('pairs every reason with the same next step in both files', () => {
    expect(nextStepsIn(FUNCTIONS_TABLE_SCAN)).toEqual(
      nextStepsIn(LIBRARY_TABLE_ORDERING),
    );
  });

  it('gives every reason a next step', () => {
    for (const file of [FUNCTIONS_TABLE_SCAN, LIBRARY_TABLE_ORDERING]) {
      expect(Object.keys(nextStepsIn(file)).sort()).toEqual(
        [...reasonsIn(file)].sort(),
      );
    }
  });

  it('names only the three next steps that exist', () => {
    const unknown = Object.values(nextStepsIn(FUNCTIONS_TABLE_SCAN)).filter(
      (step) => !['askStaff', 'tryLater', 'rescanCode'].includes(step),
    );

    expect(unknown).toEqual([]);
  });
});
