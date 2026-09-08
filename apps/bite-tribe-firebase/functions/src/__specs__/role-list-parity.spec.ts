import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The role list exists twice, and the duplication is deliberate rather than an
 * oversight.
 *
 * The Functions project compiles with its own `tsconfig.json` whose `rootDir`
 * is `src` and which carries none of the workspace path mappings, so it cannot
 * import `libs/common/utils`. Every shared constant in this project has the
 * same shape: `shared/roles.ts` repeats the role list, and
 * `bites/delete-bite-as-operator.ts` repeats `storagePathFromDownloadUrl`.
 *
 * A duplication nothing checks is a duplication that drifts. This spec is the
 * check: the two lists have to hold the same roles in the same order, so a
 * `staff` added to one and forgotten in the other fails the build rather than
 * shipping as a role the backend accepts and the client cannot name — or the
 * reverse, a role the admin app offers and every callable rejects as unknown.
 *
 * It reads both files as **text** rather than importing them.
 * `libs/common/utils` is outside this project's `rootDir` and resolves through
 * a path mapping this project does not have, so an import would not compile;
 * and the library barrel pulls in Angular. `callable-authorization.spec.ts` and
 * `google-maps-request-path.spec.ts` read source for the same class of reason.
 */

const WORKSPACE_ROOT = join(__dirname, '..', '..', '..', '..', '..');

const FUNCTIONS_ROLES = join(
  __dirname,
  '..',
  'functions',
  'shared',
  'roles.ts',
);

const LIBRARY_ROLES = join(
  WORKSPACE_ROOT,
  'libs',
  'common',
  'utils',
  'src',
  'lib',
  'user-role.ts',
);

/**
 * The `BITE_TRIBE_ROLES` members, in declaration order.
 *
 * Anchored on the constant rather than on any quoted string in the file, so a
 * role name mentioned in a comment or in an error message is not mistaken for
 * a member.
 */
const rolesIn = (file: string): string[] => {
  const source = readFileSync(file, 'utf8');
  const list = /BITE_TRIBE_ROLES = \[([^\]]*)\]/.exec(source);

  if (!list) {
    throw new Error(`No BITE_TRIBE_ROLES declaration found in ${file}`);
  }

  return [...list[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

/** The `ROLES_CLAIM` value, which has to be one key in both files. */
const claimKeyIn = (file: string): string | undefined =>
  /ROLES_CLAIM = '([^']+)'/.exec(readFileSync(file, 'utf8'))?.[1];

describe('role list parity', () => {
  it('finds a role list in both files', () => {
    expect(rolesIn(FUNCTIONS_ROLES).length).toBeGreaterThan(1);
    expect(rolesIn(LIBRARY_ROLES).length).toBeGreaterThan(1);
  });

  // Order as well as membership: `BiteTribeRole` is derived from the array, and
  // the admin app renders its role checkboxes straight from it, so the two
  // lists disagreeing on order would give the backend and the operator's form
  // different ideas of the same set.
  it('holds the same roles in the same order in both files', () => {
    expect(rolesIn(FUNCTIONS_ROLES)).toEqual(rolesIn(LIBRARY_ROLES));
  });

  it('carries the three roles that exist', () => {
    expect(rolesIn(FUNCTIONS_ROLES)).toEqual(['admin', 'business', 'staff']);
  });

  // A claim key that disagreed would be worse than a missing role: the backend
  // would write a claim the client never reads, and every role check would
  // silently answer "no roles" for an account that holds them.
  it('stores the roles under the same custom-claim key in both files', () => {
    expect(claimKeyIn(FUNCTIONS_ROLES)).toBe('roles');
    expect(claimKeyIn(LIBRARY_ROLES)).toBe('roles');
  });
});
