import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Route,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Store } from '@ngrx/store';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { ToastService } from 'toast';
import { authGuard, AuthService } from 'ta-firestore';
import { BiteTribeRole } from 'utils';
import { ROUTES } from '../routes';

jest.mock('@capacitor-firebase/firestore');

/**
 * The gate is only as good as its weakest route, and a route is added by
 * copying the one above it. These assertions are written over the whole route
 * table rather than over a list of known paths, so a new business route that
 * forgets the role guard fails here instead of shipping an ungated operator
 * surface (issue #1469).
 */
const UNGATED_PATHS = ['start', 'login', 'registration', 'forgot-password', ''];

const isAuthenticated = (route: Route): boolean =>
  (route.canActivate ?? []).includes(authGuard);

describe('business ROUTES', () => {
  it('gates every authenticated route on the business role', () => {
    const ungated = ROUTES.filter(
      (route) => isAuthenticated(route) && (route.canActivate ?? []).length < 2,
    );

    expect(ungated.map((route) => route.path)).toEqual([]);
  });

  it('leaves only the entry and auth routes ungated', () => {
    const open = ROUTES.filter((route) => !route.canActivate).map(
      (route) => route.path,
    );

    expect(open.sort()).toEqual([...UNGATED_PATHS].sort());
  });

  // The BiteTribe-internal surfaces left for the admin app with issue #1473.
  // Asserted rather than assumed: a route re-added here would be behind the
  // `business` role, which every restaurant holds.
  it('routes nothing BiteTribe-internal', () => {
    const paths = ROUTES.map((route) => route.path);

    expect(paths).not.toContain('migrations');
    expect(paths).not.toContain('new-restaurant');
  });

  /**
   * The role guard is a closure, so the route table cannot say which roles it
   * admits — the assertions above only prove that a second guard is present.
   * These run it.
   *
   * The business app admits `business` **and** `staff`: a staff account holds
   * `staff` and not `business`, so a gate on `business` alone would sign it out
   * at the door with the generic login failure and nothing to tell it why
   * (issue #1075). An allow test passes just as happily with the deny case
   * broken, so both are here.
   */
  describe('which roles the gate admits', () => {
    let held: BiteTribeRole[];
    let endRejectedSession: jest.Mock;

    const roleGuardOf = (route: Route): CanActivateFn =>
      (route.canActivate ?? [])[1] as CanActivateFn;

    const firstGatedRoute = (): Route =>
      ROUTES.find((route) => isAuthenticated(route)) as Route;

    const run = (route: Route): Promise<boolean | UrlTree> =>
      TestBed.runInInjectionContext(
        () =>
          roleGuardOf(route)(
            {} as ActivatedRouteSnapshot,
            { url: '/dashboard' } as RouterStateSnapshot,
          ) as Promise<boolean | UrlTree>,
      );

    beforeEach(() => {
      held = [];
      endRejectedSession = jest.fn(async () => undefined);

      TestBed.configureTestingModule({
        providers: [
          {
            provide: AuthService,
            useValue: {
              getUser: (): { uid: string } => ({ uid: 'user-1' }),
              whenAuthStateRestored: (): Promise<void> => Promise.resolve(),
              hasAnyRole: async (
                roles: readonly BiteTribeRole[],
              ): Promise<boolean> => roles.some((role) => held.includes(role)),
              endRejectedSession,
            },
          },
          {
            provide: Router,
            useValue: {
              parseUrl: (url: string): UrlTree =>
                ({ url }) as unknown as UrlTree,
            },
          },
          { provide: Store, useValue: { dispatch: jest.fn() } },
        ],
      });
    });

    it('admits a business account', async () => {
      held = ['business'];

      await expect(run(firstGatedRoute())).resolves.toBe(true);
    });

    it('admits a staff account', async () => {
      held = ['staff'];

      await expect(run(firstGatedRoute())).resolves.toBe(true);
    });

    // An operator is not a restaurant. `admin` and `business` are separate
    // rather than a hierarchy, so holding `admin` is not business access.
    it('does not admit an operator account', async () => {
      held = ['admin'];

      await expect(run(firstGatedRoute())).resolves.toEqual({ url: '/login' });
      expect(endRejectedSession).toHaveBeenCalled();
    });

    it('does not admit an account holding no roles', async () => {
      held = [];

      await expect(run(firstGatedRoute())).resolves.toEqual({ url: '/login' });
    });

    // Written over every gated route rather than one, because a route is added
    // by copying the one above it and the copy is where a narrower gate lands.
    it('admits staff on every gated route, not just the first', async () => {
      held = ['staff'];

      const gated = ROUTES.filter((route) => isAuthenticated(route));
      const outcomes = await Promise.all(gated.map((route) => run(route)));

      expect(gated.length).toBeGreaterThan(1);
      expect(outcomes).toEqual(gated.map(() => true));
    });
  });

  /**
   * The role gate admits every restaurant to the app; the ownership gate
   * decides which restaurant it may open once inside. Only the routes that act
   * on one carry it, and they carry it by direct URL rather than by being
   * unlinked from the list (issue #1079).
   *
   * The staff route is here rather than under the role gate alone because
   * `Restaurant.ownerUserId` is the only thing that separates the owner from
   * its own staff: both hold a role the app admits, and only one of them may
   * hire (issue #1537).
   *
   * The floor-plan route is here for the same reason. [[Floor Plan]] gives
   * staff a read of the *published* plan and no write, and there is no
   * published state until issue #1088 — so until then the editor is the
   * owner's alone (issue #1082).
   *
   * Its QR-code sheet carries the same gate, and needs it more plainly than
   * the editor does: the page prints the live token of every table in the
   * restaurant, and a token is the one thing in this product that works
   * without an account (issue #1087).
   */
  describe('which restaurants the edit routes admit', () => {
    const EDIT_PATHS = [
      'restaurant/:restaurantId',
      'restaurant/:restaurantId/menu/:menuId',
      'restaurant/:restaurantId/staff',
      'restaurant/:restaurantId/floor-plan',
      'restaurant/:restaurantId/floor-plan/qr-codes',
    ];

    const ownerGuardOf = (route: Route): CanActivateFn =>
      (route.canActivate ?? [])[2] as CanActivateFn;

    const routeFor = (path: string): Route =>
      ROUTES.find((route) => route.path === path) as Route;

    const run = (path: string): Promise<boolean | UrlTree> =>
      TestBed.runInInjectionContext(
        () =>
          ownerGuardOf(routeFor(path))(
            {
              paramMap: { get: (): string => 'restaurant-1' },
            } as unknown as ActivatedRouteSnapshot,
            { url: `/${path}` } as RouterStateSnapshot,
          ) as Promise<boolean | UrlTree>,
      );

    const assignedTo = (ownerUserId: string): void => {
      jest.spyOn(FirebaseFirestore, 'getDocument').mockResolvedValue({
        snapshot: { id: 'restaurant-1', data: { ownerUserId } },
      } as unknown as Awaited<
        ReturnType<typeof FirebaseFirestore.getDocument>
      >);
    };

    beforeEach(() => {
      jest.clearAllMocks();

      TestBed.configureTestingModule({
        providers: [
          {
            provide: AuthService,
            useValue: {
              getUser: (): { uid: string } => ({ uid: 'user-1' }),
              whenAuthStateRestored: (): Promise<void> => Promise.resolve(),
            },
          },
          {
            provide: Router,
            useValue: {
              parseUrl: (url: string): UrlTree =>
                ({ url }) as unknown as UrlTree,
            },
          },
          { provide: ToastService, useValue: { present: jest.fn() } },
        ],
      });
    });

    it('guards exactly the routes that edit one restaurant', () => {
      const guarded = ROUTES.filter(
        (route) => (route.canActivate ?? []).length > 2,
      ).map((route) => route.path);

      expect(guarded.sort()).toEqual([...EDIT_PATHS].sort());
    });

    it.each(EDIT_PATHS)('admits the assigned account on %s', async (path) => {
      assignedTo('user-1');

      await expect(run(path)).resolves.toBe(true);
    });

    it.each(EDIT_PATHS)(
      'sends an account the restaurant is not assigned to back to its own list from %s',
      async (path) => {
        assignedTo('another-business-account');

        await expect(run(path)).resolves.toEqual({ url: '/restaurants' });
      },
    );
  });

  // Every lazy route names its component as a string on the imported module,
  // so a renamed or mistyped export type-checks and then resolves to
  // `undefined` at runtime — in the browser, on navigation, as a blank page.
  // Resolving them here is the only place that catches it.
  describe('lazy routes', () => {
    const lazyRoutes = ROUTES.filter((route) => route.loadComponent);

    // The business app still offers registration; only the admin app drops it.
    it('keeps the registration route', () => {
      expect(ROUTES.map((route) => route.path)).toContain('registration');
    });

    it('has lazy routes to check', () => {
      expect(lazyRoutes.length).toBeGreaterThan(0);
    });

    it.each(lazyRoutes.map((route) => [route.path, route] as const))(
      'resolves the component for %s',
      async (_path, route) => {
        const component = await route.loadComponent?.();

        expect(component).toBeDefined();
      },
    );
  });
});
