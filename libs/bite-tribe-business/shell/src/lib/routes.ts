import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard, roleGuard } from 'ta-firestore';

/**
 * Every authenticated route carries both guards.
 *
 * `authGuard` establishes that someone is signed in;
 * `roleGuard('business', 'staff')` establishes that the account was granted
 * business access by an operator, or was put on a restaurant as staff. The two
 * are alternatives, not a hierarchy: a staff account holds `staff` and *not*
 * `business`, so naming only `business` here would sign it out at the door
 * (issue #1075). What a staff account may then *do* is narrower, and that is
 * issue #1078's and #1079's to enforce - this gate is the door, not the rules.
 * Until issue #1469 only the first existed, which meant any BiteTribe account
 * could open this app and run the operational migrations in it. Those
 * migrations, restaurant-candidate verification and the unmatched Bite places
 * left for the admin app with issue #1473, so what is behind this gate is now
 * only what a restaurant does to its own data.
 *
 * The gate is hard and there is no backfill: an account that could sign in
 * before the role existed cannot sign in now unless it has been granted the
 * role through the admin app. That is the intended behaviour, not an
 * oversight - see the rollout decision on the issue.
 *
 * `start` and the auth routes stay ungated: they are where a visitor who fails
 * those checks is sent.
 *
 * Sign-in itself refuses an account without the role, so these guards are the
 * backstop for a restored session or a revoked role rather than the primary
 * gate. A rejected account is signed out and returned to the login page with a
 * generic failure — never told which role it lacks.
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
    canActivate: [authGuard, roleGuard('business', 'staff')],
  },
  {
    path: 'bite-trails',
    loadComponent: () =>
      import('bite-tribe-business/dashboard').then(
        (m) => m.BiteTrailsContainer,
      ),
    canActivate: [authGuard, roleGuard('business', 'staff')],
  },
  {
    path: 'restaurants',
    loadComponent: () =>
      import('bite-tribe-business/dashboard').then(
        (m) => m.RestaurantsContainer,
      ),
    canActivate: [authGuard, roleGuard('business', 'staff')],
  },
  {
    path: 'create-bite-trail',
    loadComponent: () =>
      import('bite-tribe-business/create-bite-trail').then(
        (m) => m.CreateBiteTrailContainer,
      ),
    canActivate: [authGuard, roleGuard('business', 'staff')],
  },
  {
    path: 'restaurant/:restaurantId',
    loadComponent: () =>
      import('bite-tribe-business/restaurant').then(
        (m) => m.EditRestaurantContainer,
      ),
    canActivate: [authGuard, roleGuard('business', 'staff')],
  },
  {
    path: 'restaurant/:restaurantId/menu/:menuId',
    loadComponent: () =>
      import('bite-tribe-business/edit-menu').then((m) => m.EditMenuContainer),
    canActivate: [authGuard, roleGuard('business', 'staff')],
  },
  {
    path: '',
    redirectTo: 'start',
    pathMatch: 'full',
  },
]);
