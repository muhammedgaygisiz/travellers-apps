import { Route } from '@angular/router';
import { authGuard } from 'ta-firestore';
import { ROUTES } from '../routes';

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

  it('keeps the operational migrations behind the gate', () => {
    const migrations = ROUTES.find((route) => route.path === 'migrations');

    expect(migrations?.canActivate).toHaveLength(2);
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
