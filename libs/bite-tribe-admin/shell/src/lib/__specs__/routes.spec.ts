import { Route } from '@angular/router';
import { authGuard } from 'ta-firestore';
import { PATH } from 'utils';
import { ROUTES } from '../routes';

/**
 * Written over the whole route table rather than over a list of known paths,
 * so an operator surface added later without the admin gate fails here rather
 * than shipping open (issue #1469).
 */
// No `registration`: the admin app drops that route entirely.
const UNGATED_PATHS = [PATH.START, 'login', 'forgot-password', ''];

const isAuthenticated = (route: Route): boolean =>
  (route.canActivate ?? []).includes(authGuard);

describe('admin ROUTES', () => {
  it('gates every authenticated route on the admin role', () => {
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

  // The admin app has no marketing surface, so a signed-in operator lands on
  // the tool rather than on a welcome page.
  it('sends the root at the dashboard', () => {
    const root = ROUTES.find((route) => route.path === '');

    expect(root?.redirectTo).toBe('dashboard');
  });

  // Every lazy route names its component as a string on the imported module,
  // so a renamed or mistyped export type-checks and then resolves to
  // `undefined` at runtime — in the browser, on navigation, as a blank page.
  // Resolving them here is the only place that catches it.
  describe('lazy routes', () => {
    const lazyRoutes = ROUTES.filter((route) => route.loadComponent);

    // Operator accounts are granted, never self-served, so the page that would
    // create one must not exist. Hiding the button is not enough: the route was
    // one address bar away, and rendered with translation keys the admin locale
    // does not carry.
    it('registers no registration route', () => {
      expect(ROUTES.map((route) => route.path)).not.toContain('registration');
    });

    it('keeps the login and forgot-password routes', () => {
      const paths = ROUTES.map((route) => route.path);

      expect(paths).toContain('login');
      expect(paths).toContain('forgot-password');
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
