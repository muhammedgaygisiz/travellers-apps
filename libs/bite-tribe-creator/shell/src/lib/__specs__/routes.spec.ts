import { Route } from '@angular/router';
import { authGuard, startGuard } from 'ta-firestore';
import { ROUTES } from '../routes';

/**
 * Written over the whole route table rather than over a list of known paths,
 * so a route added later with a role guard - or without the auth guard - fails
 * here rather than shipping (issue #2130).
 */
const UNGATED_PATHS = ['login', 'registration', 'forgot-password', ''];

describe('creator ROUTES', () => {
  // Any signed-in account may create a BiteTrail (`RD-UR-4`), which is also
  // what `firestore.rules` admits. A second guard on a route would be a role
  // gate the rules do not have.
  it('gates every authenticated route on sign-in alone', () => {
    const authenticated = ROUTES.filter((route) => route.canActivate).filter(
      (route) => route.path !== 'start',
    );

    expect(authenticated.length).toBeGreaterThan(0);
    for (const route of authenticated) {
      expect(route.canActivate).toEqual([authGuard]);
    }
  });

  it('leaves only the entry and auth routes ungated', () => {
    const open = ROUTES.filter((route) => !route.canActivate).map(
      (route) => route.path,
    );

    expect(open.sort()).toEqual([...UNGATED_PATHS].sort());
  });

  it('sends a signed-in account from the start page and nobody else', () => {
    const start = ROUTES.find((route) => route.path === 'start');

    expect(start?.canActivate).toEqual([startGuard]);
  });

  it('sends the root at the account’s BiteTrails', () => {
    const root = ROUTES.find((route) => route.path === '');

    expect(root?.redirectTo).toBe('bite-trails');
  });

  it('routes the BiteTrail list and its create page', () => {
    expect(ROUTES.map((route) => route.path)).toEqual(
      expect.arrayContaining(['bite-trails', 'create-bite-trail']),
    );
  });

  // Every lazy route names its component as a string on the imported module,
  // so a renamed export type-checks and then resolves to `undefined` at
  // runtime, as a blank page. Resolving them here is what catches it.
  describe('lazy routes', () => {
    const lazyRoutes = ROUTES.filter((route) => route.loadComponent);

    it('has lazy routes to check', () => {
      expect(lazyRoutes.length).toBeGreaterThan(0);
    });

    it.each(lazyRoutes.map((route) => [route.path, route] as const))(
      'resolves the component for %s',
      async (_path, route: Route) => {
        const component = await route.loadComponent?.();

        expect(component).toBeDefined();
      },
    );
  });

  /** Every page names itself in the tab (GitHub issue #1977). */
  it('gives every routed page a title', () => {
    const untitled = ROUTES.filter(
      (route) =>
        !route.redirectTo &&
        route.path !== 'start' &&
        route.path !== '**' &&
        !route.title,
    ).map((route) => route.path);

    expect(untitled).toEqual([]);
  });
});
