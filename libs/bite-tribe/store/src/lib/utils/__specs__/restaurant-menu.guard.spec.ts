import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { BiteTribeApiService } from 'bite-tribe/api';
import { AuthService } from 'ta-firestore';
import type { Restaurant } from 'model';
import {
  menuIdOfRestaurant,
  publicMenuMemberGuard,
  restaurantMenuGuard,
} from '../restaurant-menu.guard';

const RESTAURANT_ID = 'restaurant-1';
const MENU_ID = 'menu-1';

const restaurantWith = (menuId?: string): Restaurant =>
  ({ id: RESTAURANT_ID, menuId }) as Restaurant;

const snapshotWith = (params: Record<string, string>): ActivatedRouteSnapshot =>
  ({
    paramMap: { get: (key: string) => params[key] ?? null },
  }) as unknown as ActivatedRouteSnapshot;

describe('menuIdOfRestaurant', () => {
  it('takes a bare id as it stands', () => {
    expect(menuIdOfRestaurant(restaurantWith(MENU_ID))).toBe(MENU_ID);
  });

  /**
   * `Restaurant.menuId` has held both shapes over the collection's life. A
   * reader that opened `menus/{the whole path}` would ask for a document that
   * is not there, which reads as "this restaurant has no menu" - the wrong
   * sentence, on a restaurant that has one.
   */
  it('takes the last segment of a path-shaped id', () => {
    expect(menuIdOfRestaurant(restaurantWith(`menus/${MENU_ID}`))).toBe(
      MENU_ID,
    );
    expect(menuIdOfRestaurant(restaurantWith(`/menus/${MENU_ID}/`))).toBe(
      MENU_ID,
    );
  });

  it('has nothing to give for a restaurant without a menu', () => {
    expect(menuIdOfRestaurant(restaurantWith())).toBeUndefined();
    expect(menuIdOfRestaurant(restaurantWith(''))).toBeUndefined();
    expect(menuIdOfRestaurant(undefined)).toBeUndefined();
  });
});

describe('restaurantMenuGuard', () => {
  let loadRestaurant: jest.Mock;
  let parseUrl: jest.Mock;

  const runGuard = (
    params: Record<string, string> = { restaurantId: RESTAURANT_ID },
  ): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(
      () =>
        restaurantMenuGuard(snapshotWith(params), {} as never) as Promise<
          boolean | UrlTree
        >,
    );

  beforeEach(() => {
    jest.clearAllMocks();

    loadRestaurant = jest.fn(async () => restaurantWith(MENU_ID));
    parseUrl = jest.fn((url: string) => ({ url }) as unknown as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: BiteTribeApiService, useValue: { loadRestaurant } },
        { provide: Router, useValue: { parseUrl } },
      ],
    });
  });

  it('sends the reader to the address the menu page is keyed on', async () => {
    await runGuard();

    expect(loadRestaurant).toHaveBeenCalledWith(RESTAURANT_ID);
    expect(parseUrl).toHaveBeenCalledWith(
      `/restaurant/${RESTAURANT_ID}/menu/${MENU_ID}`,
    );
  });

  it('normalises a path-shaped menu id on the way', async () => {
    loadRestaurant.mockResolvedValue(restaurantWith(`menus/${MENU_ID}`));

    await runGuard();

    expect(parseUrl).toHaveBeenCalledWith(
      `/restaurant/${RESTAURANT_ID}/menu/${MENU_ID}`,
    );
  });

  /**
   * The branch that must not bounce. The public page's own guard only
   * redirects back here when the restaurant *has* a menu, so a restaurant
   * without one settles on the page that says so.
   */
  it('falls through to the public page when there is no menu', async () => {
    loadRestaurant.mockResolvedValue(restaurantWith());

    await runGuard();

    expect(parseUrl).toHaveBeenCalledWith(`/m/${RESTAURANT_ID}`);
  });

  it('falls through to the public page when there is no restaurant', async () => {
    loadRestaurant.mockResolvedValue(undefined);

    await runGuard();

    expect(parseUrl).toHaveBeenCalledWith(`/m/${RESTAURANT_ID}`);
  });

  it('reads nothing for a route naming no restaurant', async () => {
    await runGuard({});

    expect(loadRestaurant).not.toHaveBeenCalled();
    expect(parseUrl).toHaveBeenCalledWith('/home');
  });
});

describe('publicMenuMemberGuard', () => {
  let getMember: jest.Mock;
  let whenAuthStateRestored: jest.Mock;
  let loadRestaurant: jest.Mock;
  let parseUrl: jest.Mock;

  const runGuard = (
    params: Record<string, string> = { publicRestaurantId: RESTAURANT_ID },
  ): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(
      () =>
        publicMenuMemberGuard(snapshotWith(params), {} as never) as Promise<
          boolean | UrlTree
        >,
    );

  beforeEach(() => {
    jest.clearAllMocks();

    getMember = jest.fn(() => undefined);
    whenAuthStateRestored = jest.fn(async () => undefined);
    loadRestaurant = jest.fn(async () => restaurantWith(MENU_ID));
    parseUrl = jest.fn((url: string) => ({ url }) as unknown as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: { getMember, whenAuthStateRestored },
        },
        { provide: BiteTribeApiService, useValue: { loadRestaurant } },
        { provide: Router, useValue: { parseUrl } },
      ],
    });
  });

  it('hands a member the app’s own menu page', async () => {
    getMember.mockReturnValue({ uid: 'member-1' });

    await runGuard();

    expect(parseUrl).toHaveBeenCalledWith(
      `/restaurant/${RESTAURANT_ID}/menu/${MENU_ID}`,
    );
  });

  /**
   * The whole premise of the printed code: the reader has no account and may
   * never want one. A guard that refused them, or sent them anywhere but the
   * public page, would be the sign-in wall this route exists to remove.
   */
  it('lets a reader with no account through to the public page', async () => {
    expect(await runGuard()).toBe(true);
    expect(loadRestaurant).not.toHaveBeenCalled();
  });

  /**
   * An anonymous table session is not a member. The in-app menu route carries
   * `authGuard`, which refuses that session, so redirecting a table guest
   * there would bounce them to `/start`.
   */
  it('lets an anonymous table guest through to the public page', async () => {
    // `getMember` is what tells the two apart; an anonymous session answers it
    // with nothing, exactly as a signed-out visitor does.
    expect(await runGuard()).toBe(true);
  });

  it('waits for a persisted session before judging a cold start', async () => {
    let restored: () => void = () => undefined;
    whenAuthStateRestored.mockReturnValue(
      new Promise<void>((resolve) => {
        restored = resolve;
      }),
    );
    getMember.mockReturnValueOnce(undefined).mockReturnValue({ uid: 'm' });

    const result = runGuard();
    restored();

    await result;

    expect(whenAuthStateRestored).toHaveBeenCalled();
    expect(parseUrl).toHaveBeenCalledWith(
      `/restaurant/${RESTAURANT_ID}/menu/${MENU_ID}`,
    );
  });

  /**
   * The branch that keeps the two guards from bouncing off each other: with no
   * menu to send them to, the member reads the public page's refusal rather
   * than being redirected to a route that would redirect back.
   */
  it('leaves a member on the public page when there is no menu', async () => {
    getMember.mockReturnValue({ uid: 'member-1' });
    loadRestaurant.mockResolvedValue(restaurantWith());

    expect(await runGuard()).toBe(true);
    expect(parseUrl).not.toHaveBeenCalled();
  });

  it('reads nothing for a route naming no restaurant', async () => {
    getMember.mockReturnValue({ uid: 'member-1' });

    expect(await runGuard({})).toBe(true);
    expect(loadRestaurant).not.toHaveBeenCalled();
  });
});
