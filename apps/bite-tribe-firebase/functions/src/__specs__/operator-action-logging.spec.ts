import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Cloud Logging is the audit trail for operator actions, by decision: there is
 * no in-app record and none is planned at this scale (epic #1471). A trail read
 * three different ways is not a trail, so issue #1477 gave every operator
 * action one shape in `shared/operator-log.ts`.
 *
 * A shape nothing enforces lasts until the next callable. This spec is the
 * enforcement: an operator callable that does not log through the helper, or
 * that hand-rolls the fields the helper owns, fails the build rather than
 * passing review unnoticed.
 *
 * It deliberately walks the source rather than importing anything it checks,
 * including `OPERATOR_ACTIONS`. Every one of these modules reaches
 * `firebase-functions/https`, which loads `firebase-admin`, which pulls in
 * ESM-only `jose` — so an import here would mean mocking the Admin SDK to run a
 * spec that never calls it. `callable-authorization.spec.ts` reads the source
 * for the same reason.
 */

/**
 * Operator endpoints that read and change nothing.
 *
 * A read leaves nothing to audit, and logging one would bury the writes: the
 * admin app lists accounts on every page of user management, so an entry per
 * call would out-number every real operator action in the trail.
 *
 * Adding a name here is the claim that the endpoint performs no operator
 * action. Anything that writes, spends or sends belongs in the trail instead.
 */
const READ_ONLY_OPERATOR_ENDPOINTS = [
  'listUsersWithRoles',
  'listRestaurantStaff',
];

/**
 * The actor and target names the callables logged before the helper existed:
 * `callerUid`/`callerRoles` in the role and tier callables, `requestedBy` in
 * the review migration, `uid` in the two migrations, `targetUid` in both user
 * callables. Three names for the actor across eight callables is what issue
 * \#1477 removed.
 *
 * They are the helper's fields now. A callable that puts one in an object of
 * its own is building a second audit shape by hand, so only the key position is
 * rejected — `const callerUid = requireAdmin(request)` is still the clearest
 * name for that local, and `targetId: targetUid` still reads correctly where
 * the target genuinely is an account.
 */
const HAND_ROLLED_AUDIT_FIELDS = [
  'callerRoles',
  'callerUid',
  'requestedBy',
  'targetUid',
];

/**
 * The field used as an object key, either as shorthand or written out.
 *
 * The lookbehind keeps `${targetUid}` in a template literal out of it: a
 * message that interpolates the uid is not a second audit shape.
 */
const usedAsKey = (field: string, source: string): boolean =>
  new RegExp(`(?<!\\$)[{,]\\s*${field}\\s*[,}]`).test(source) ||
  new RegExp(`\\b${field}\\s*:`).test(source);

const FUNCTIONS_ROOT = join(__dirname, '..', 'functions');
const OPERATOR_LOG_MODULE = join(FUNCTIONS_ROOT, 'shared', 'operator-log.ts');

interface Endpoint {
  name: string;
  file: string;
}

const listTypeScriptFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      return entry === '__specs__' ? [] : listTypeScriptFiles(path);
    }

    return entry.endsWith('.ts') ? [path] : [];
  });

const findEndpoints = (file: string): Endpoint[] => {
  const source = readFileSync(file, 'utf8').replace(/\s+/g, ' ');
  const pattern =
    /export const ([A-Za-z0-9_$]+) *= *(?:onAppCheck|onCall|onRequest) *[<(]/g;

  return [...source.matchAll(pattern)].map((match) => ({
    name: match[1],
    file,
  }));
};

const sourceOf = (file: string): string => readFileSync(file, 'utf8');

/** The `OPERATOR_ACTIONS` members, read off the helper rather than imported. */
const declaredActions = (): string[] => {
  const list = /OPERATOR_ACTIONS = \[([^\]]*)\]/.exec(
    sourceOf(OPERATOR_LOG_MODULE),
  );

  return [...(list?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1]);
};

/**
 * The guards that make an endpoint privileged enough to belong in the trail.
 *
 * `requireAdmin` was the only one when issue #1477 wrote this. Issue #1537
 * added the second: the two staff callables change what an account may do
 * exactly as `setUserRoles` does, and they are performed by a restaurant owner
 * rather than by an operator — so leaving them out would put the one privileged
 * action a non-operator can take outside the only record of it.
 *
 * Issue #1086 added the third. It is the same guard as the second, reached
 * through the shared `requireRestaurantAuthority` rather than written inline,
 * and an endpoint that calls it is exactly as privileged as one that did not.
 * Leaving it out would have silently dropped the staff callables out of this
 * list the moment their guard moved.
 */
const PRIVILEGED_GUARDS = [
  'requireAdmin(',
  'requireAnyRole(',
  'requireRestaurantAuthority(',
];

describe('operator action logging', () => {
  const sources = listTypeScriptFiles(FUNCTIONS_ROOT);
  const operatorEndpoints = sources
    .flatMap(findEndpoints)
    .filter((endpoint) =>
      PRIVILEGED_GUARDS.some((guard) =>
        sourceOf(endpoint.file).includes(guard),
      ),
    );

  it('finds the operator endpoints in the functions source', () => {
    expect(operatorEndpoints.length).toBeGreaterThan(5);
  });

  it('logs every operator action through the shared helper', () => {
    const unlogged = operatorEndpoints
      .filter(
        (endpoint) => !READ_ONLY_OPERATOR_ENDPOINTS.includes(endpoint.name),
      )
      .filter(
        (endpoint) => !sourceOf(endpoint.file).includes('logOperatorAction('),
      )
      .map((endpoint) => endpoint.name);

    expect(unlogged).toEqual([]);
  });

  it('names no read-only endpoint that is not an operator endpoint', () => {
    const existing = new Set(
      operatorEndpoints.map((endpoint) => endpoint.name),
    );
    const stale = READ_ONLY_OPERATOR_ENDPOINTS.filter(
      (name) => !existing.has(name),
    );

    expect(stale).toEqual([]);
  });

  it('lets no callable write the audit fields the helper owns', () => {
    const handRolled = sources
      .filter((file) => file !== OPERATOR_LOG_MODULE)
      .flatMap((file) => {
        const source = sourceOf(file);

        return HAND_ROLLED_AUDIT_FIELDS.filter((field) =>
          usedAsKey(field, source),
        ).map((field) => `${file}: ${field}`);
      });

    expect(handRolled).toEqual([]);
  });

  it('names no action that no longer exists', () => {
    const outsideTheHelper = sources
      .filter((file) => file !== OPERATOR_LOG_MODULE)
      .map(sourceOf)
      .join('\n');
    const stale = declaredActions().filter(
      (action) => !outsideTheHelper.includes(`'${action}'`),
    );

    expect(stale).toEqual([]);
  });
});
