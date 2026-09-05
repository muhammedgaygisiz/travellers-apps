import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard, NoAccessComponent, roleGuard } from 'ta-firestore';
import { PATH } from 'utils';

/**
 * Every authenticated route carries both guards.
 *
 * `authGuard` establishes that someone is signed in; `roleGuard('business')`
 * establishes that the account was granted business access by an operator.
 * Until issue #1469 only the first existed, which meant any BiteTribe account
 * could open this app and run the operational migrations in it.
 *
 * The gate is hard and there is no backfill: an account that could sign in
 * before the role existed cannot sign in now unless it has been granted the
 * role through the admin app. That is the intended behaviour, not an
 * oversight - see the rollout decision on the issue.
 *
 * `start`, the auth routes, and `no-access` are deliberately ungated. They are
 * where a visitor who fails those checks is sent, and gating them would send
 * that visitor to a page that rejects them for the same reason.
 */
export const ROUTES: Routes = withAuthRoutes([
  {
    path: 'start',
    loadComponent: () =>
      import('bite-tribe-business/start').then((m) => m.Start),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('bite-tribe-business/dashboard').then((m) => m.DashboardContainer),
    canActivate: [authGuard, roleGuard('business')],
  },
  {
    path: 'migrations',
    loadComponent: () =>
      import('bite-tribe-business/migrations').then(
        (m) => m.MigrationsContainer,
      ),
    canActivate: [authGuard, roleGuard('business')],
  },
  {
    path: 'create-bite-trail',
    loadComponent: () =>
      import('bite-tribe-business/create-bite-trail').then(
        (m) => m.CreateBiteTrailContainer,
      ),
    canActivate: [authGuard, roleGuard('business')],
  },
  {
    path: 'new-restaurant',
    loadComponent: () =>
      import('bite-tribe-business/restaurant').then(
        (m) => m.NewRestaurantContainer,
      ),
    canActivate: [authGuard, roleGuard('business')],
  },
  {
    path: 'restaurant/:restaurantId',
    loadComponent: () =>
      import('bite-tribe-business/restaurant').then(
        (m) => m.EditRestaurantContainer,
      ),
    canActivate: [authGuard, roleGuard('business')],
  },
  {
    path: 'restaurant/:restaurantId/menu/:menuId',
    loadComponent: () =>
      import('bite-tribe-business/edit-menu').then((m) => m.EditMenuContainer),
    canActivate: [authGuard, roleGuard('business')],
  },
  {
    path: PATH.NO_ACCESS,
    component: NoAccessComponent,
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
