import {
  PUBLIC_MENU_REFUSAL_REASONS,
  isPublicMenuResolved,
} from '../public-menu';
import type { PublicMenuResult } from '../public-menu';
import { isTableOrderingUnavailable } from '../table-session';
import type { StartTableSessionResult } from '../table-session';

/**
 * The two narrowings the public menu of issue #1102 rests on.
 *
 * `ts-jest` type-checks this file, so a result that grows a required field or a
 * union that stops discriminating fails to compile before any expectation runs.
 */
describe('public menu', () => {
  const resolved: PublicMenuResult = {
    ok: true,
    restaurant: { id: 'restaurant-1', name: 'Sakura Kitchen' },
    menu: { id: 'menu-1', categories: [], currency: 'JPY' },
  };

  const refused: PublicMenuResult = { ok: false, reason: 'menuMissing' };

  it('narrows a menu to its restaurant', () => {
    expect(isPublicMenuResolved(resolved)).toBe(true);

    if (isPublicMenuResolved(resolved)) {
      expect(resolved.restaurant.name).toBe('Sakura Kitchen');
    }
  });

  it('narrows a refusal to its reason', () => {
    expect(isPublicMenuResolved(refused)).toBe(false);

    if (!isPublicMenuResolved(refused)) {
      expect(refused.reason).toBe('menuMissing');
    }
  });

  /**
   * Nothing here is about ordering. A restaurant that takes no orders is the
   * case this endpoint exists for, not a case it refuses - so a reason list
   * that grew one would be the menu-only promise quietly withdrawn.
   */
  it('names no reason that is about ordering', () => {
    expect([...PUBLIC_MENU_REFUSAL_REASONS]).toEqual([
      'restaurantNotFound',
      'restaurantInactive',
      'menuMissing',
      'menuEmpty',
    ]);
  });
});

/**
 * The third outcome of starting a session, which issue #1102 introduced: a scan
 * that resolved to a restaurant taking no orders. A screen that gets this back
 * has a menu to offer; one that gets a refusal has nothing.
 */
describe('a session that cannot be started', () => {
  it('tells an ordering verdict apart from a refusal', () => {
    const unavailable: StartTableSessionResult = {
      ok: false,
      ordering: { available: false, reason: 'tableOrderingDisabled' },
    };
    const refusal: StartTableSessionResult = {
      ok: false,
      reason: 'restaurantClosed',
      nextStep: 'tryLater',
    };

    expect(isTableOrderingUnavailable(unavailable)).toBe(true);
    expect(isTableOrderingUnavailable(refusal)).toBe(false);
  });

  it('is false for a session that started', () => {
    const started: StartTableSessionResult = {
      ok: true,
      status: 'pending',
      session: {
        id: '8_table-12_guest',
        restaurantId: 'restaurant-1',
        tableId: 'table-12',
        guestUserId: 'guest',
        status: 'pending',
        startedAt: 1,
        lastActiveAt: 1,
        isAnonymousGuest: true,
      },
      context: {
        token: 'ABCDEFGHJKMNPQRSTVWXYZ0123',
        restaurant: { id: 'restaurant-1', name: 'Sakura Kitchen' },
        room: { id: 'room-1' },
        table: { id: 'table-12', label: '12', seats: 4 },
        menu: { id: 'menu-1' },
        ordering: { available: true },
      },
    };

    expect(isTableOrderingUnavailable(started)).toBe(false);
  });
});
