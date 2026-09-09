jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

import {
  BITE_TRIBE_ROLES,
  BiteTribeRole,
  ROLES_CLAIM,
  hasRole,
  isBiteTribeRole,
  requireAdmin,
  requireBusiness,
  requireRole,
  rolesOf,
} from '../roles';

const CALLER_UID = 'caller-uid';

interface TestRequest {
  auth?: { uid: string; token: Record<string, unknown> };
}

const callerWith = (roles: unknown): TestRequest => ({
  auth: { uid: CALLER_UID, token: { [ROLES_CLAIM]: roles } },
});

const as = (request: TestRequest): Parameters<typeof requireRole>[0] =>
  request as Parameters<typeof requireRole>[0];

const codeOf = (act: () => unknown): string => {
  try {
    act();
  } catch (error) {
    return (error as { code: string }).code;
  }

  throw new Error('Expected a rejection, but the guard returned.');
};

describe('the role set', () => {
  it('holds the three roles BiteTribe grants', () => {
    expect(BITE_TRIBE_ROLES).toEqual(['admin', 'business', 'staff']);
  });

  it.each([...BITE_TRIBE_ROLES])('recognises %p as a role', (role) => {
    expect(isBiteTribeRole(role)).toBe(true);
  });

  it.each([['owner'], ['Admin'], [''], [null], [42], [['admin']]])(
    'does not recognise %p',
    (value) => {
      expect(isBiteTribeRole(value)).toBe(false);
    },
  );
});

describe('rolesOf', () => {
  it('reads the roles out of a verified token', () => {
    expect(rolesOf(as(callerWith(['admin', 'staff'])))).toEqual([
      'admin',
      'staff',
    ]);
  });

  // A token is verified, not sanitised: a claim written by an older backend, or
  // a role since removed from the product, must not reach a caller as a role.
  it('drops a value that is not a role', () => {
    expect(rolesOf(as(callerWith(['admin', 'owner', 7])))).toEqual(['admin']);
  });

  it.each([[undefined], [null], ['admin'], [{}]])(
    'reads %p as no roles rather than throwing',
    (claim) => {
      expect(rolesOf(as(callerWith(claim)))).toEqual([]);
    },
  );

  it('reads a request with no session as no roles', () => {
    expect(rolesOf(as({}))).toEqual([]);
  });
});

describe('requireRole', () => {
  // The two failures are separated on purpose: `unauthenticated` means "sign
  // in", `permission-denied` means "signing in will not help".
  it('rejects a caller with no session as unauthenticated', () => {
    expect(codeOf(() => requireRole(as({}), 'business'))).toBe(
      'unauthenticated',
    );
  });

  it('rejects a signed-in caller without the role as permission-denied', () => {
    expect(
      codeOf(() => requireRole(as(callerWith(['staff'])), 'business')),
    ).toBe('permission-denied');
  });

  it('returns the caller uid when the role is held', () => {
    expect(requireRole(as(callerWith(['business'])), 'business')).toBe(
      CALLER_UID,
    );
  });

  it('accepts a caller holding the role among others', () => {
    expect(requireRole(as(callerWith(['admin', 'business'])), 'business')).toBe(
      CALLER_UID,
    );
  });

  it.each([...BITE_TRIBE_ROLES])('guards %p', (role: BiteTribeRole) => {
    expect(requireRole(as(callerWith([role])), role)).toBe(CALLER_UID);
    expect(codeOf(() => requireRole(as(callerWith([])), role))).toBe(
      'permission-denied',
    );
  });

  // The message names the role, unlike the login refusal, which is generic so a
  // rejected account cannot learn which role guards the app.
  it('names the role it required', () => {
    try {
      requireRole(as(callerWith([])), 'staff');
    } catch (error) {
      expect((error as Error).message).toContain('staff');
    }
  });
});

describe('requireAdmin and requireBusiness', () => {
  it('requireAdmin admits only an admin', () => {
    expect(requireAdmin(as(callerWith(['admin'])))).toBe(CALLER_UID);
    expect(codeOf(() => requireAdmin(as(callerWith(['business']))))).toBe(
      'permission-denied',
    );
  });

  // A restaurant holds `business`; an operator does not get restaurant
  // maintenance rights by holding `admin`, because the two are not a hierarchy.
  it('requireBusiness admits only a business account', () => {
    expect(requireBusiness(as(callerWith(['business'])))).toBe(CALLER_UID);
    expect(codeOf(() => requireBusiness(as(callerWith(['admin']))))).toBe(
      'permission-denied',
    );
  });

  it('requireBusiness does not admit staff', () => {
    expect(codeOf(() => requireBusiness(as(callerWith(['staff']))))).toBe(
      'permission-denied',
    );
  });

  it('both reject a caller with no session before looking at roles', () => {
    expect(codeOf(() => requireAdmin(as({})))).toBe('unauthenticated');
    expect(codeOf(() => requireBusiness(as({})))).toBe('unauthenticated');
  });
});

describe('hasRole', () => {
  it('answers without throwing for a caller with no session', () => {
    expect(hasRole(as({}), 'admin')).toBe(false);
  });

  it('is true only for a role the token carries', () => {
    const caller = as(callerWith(['staff']));

    expect(hasRole(caller, 'staff')).toBe(true);
    expect(hasRole(caller, 'business')).toBe(false);
  });
});
