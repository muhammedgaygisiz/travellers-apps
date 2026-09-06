import { isBiteTribeRole, rolesFromClaims } from '../user-role';

describe('isBiteTribeRole', () => {
  it.each(['admin', 'business'])('accepts the known role %s', (role) => {
    expect(isBiteTribeRole(role)).toBe(true);
  });

  it.each([['owner'], ['Admin'], [''], [null], [undefined], [1], [['admin']]])(
    'rejects %p',
    (value) => {
      expect(isBiteTribeRole(value)).toBe(false);
    },
  );
});

describe('rolesFromClaims', () => {
  it('reads the roles a token carries', () => {
    expect(rolesFromClaims({ roles: ['admin', 'business'] })).toEqual([
      'admin',
      'business',
    ]);
  });

  // An account that has never been granted a role carries no `roles` key, and
  // that is the common case, not an error.
  it.each([
    ['an account with no roles claim', {}],
    ['an undefined payload', undefined],
    ['a null payload', null],
  ])('reports no roles for %s', (_case, claims) => {
    expect(rolesFromClaims(claims)).toEqual([]);
  });

  // The payload is whatever was signed into the token. A shape change must not
  // reach a route guard as an exception.
  it.each([
    ['a string', 'admin'],
    ['an object', { admin: true }],
    ['a number', 1],
  ])('reports no roles when the claim is %s', (_case, roles) => {
    expect(rolesFromClaims({ roles })).toEqual([]);
  });

  it('drops entries that are not known roles', () => {
    expect(rolesFromClaims({ roles: ['admin', 'superuser', 7, null] })).toEqual(
      ['admin'],
    );
  });

  it('ignores other claims in the same payload', () => {
    expect(
      rolesFromClaims({ roles: ['business'], sub: 'user-1', iss: 'firebase' }),
    ).toEqual(['business']);
  });
});
