import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard, roleGuard } from 'ta-firestore';
import { PATH } from 'utils';

/**
 * Every authenticated route carries both guards.
 *
 * `authGuard` establishes that someone is signed in and keeps the requested
 * URL alive across a cold load; `roleGuard('admin')` establishes that it is an
 * operator. They are not redundant and one does not imply the other: Angular
 * activates a route's guards concurrently rather than in sequence, so
 * `roleGuard` re-answers the session question itself and the pair simply agree
 * on the outcome (issue #1469).
 *
 * `start` and the auth routes stay ungated: they are where a visitor who fails
 * those checks is sent.
 *
 * Sign-in itself refuses an account without the role, so these guards are the
 * backstop for a restored session or a revoked role rather than the primary
 * gate. A rejected account is signed out and returned to the login page with a
 * generic failure — never told which role it lacks.
 */
export const ROUTES: Routes = withAuthRoutes(
  [
    {
      path: PATH.START,
      loadComponent: () =>
        import('bite-tribe-admin/start').then((m) => m.AdminStart),
    },
    {
      path: 'dashboard',
      loadComponent: () =>
        import('bite-tribe-admin/dashboard').then((m) => m.AdminDashboard),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: 'user-management',
      loadComponent: () =>
        import('bite-tribe-admin/user-management').then(
          (m) => m.UserManagementContainer,
        ),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: 'restaurant-candidates',
      loadComponent: () =>
        import('bite-tribe-admin/restaurants').then(
          (m) => m.RestaurantCandidatesContainer,
        ),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: 'bite-places',
      loadComponent: () =>
        import('bite-tribe-admin/restaurants').then(
          (m) => m.BitePlacesContainer,
        ),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: 'new-restaurant',
      loadComponent: () =>
        import('bite-tribe-admin/restaurants').then(
          (m) => m.NewRestaurantContainer,
        ),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: 'new-version-notification',
      loadComponent: () =>
        import('bite-tribe-admin/migrations').then(
          (m) => m.NewVersionNotificationContainer,
        ),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: 'review-timestamps-backfill',
      loadComponent: () =>
        import('bite-tribe-admin/migrations').then(
          (m) => m.ReviewTimestampsBackfillContainer,
        ),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: 'bite-address-backfill',
      loadComponent: () =>
        import('bite-tribe-admin/migrations').then(
          (m) => m.BiteAddressBackfillContainer,
        ),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: 'restaurant-clustering',
      loadComponent: () =>
        import('bite-tribe-admin/migrations').then(
          (m) => m.RestaurantClusteringContainer,
        ),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: 'image-migration',
      loadComponent: () =>
        import('bite-tribe-admin/migrations').then(
          (m) => m.ImageMigrationContainer,
        ),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: 'geohash-migration',
      loadComponent: () =>
        import('bite-tribe-admin/migrations').then(
          (m) => m.GeohashMigrationContainer,
        ),
      canActivate: [authGuard, roleGuard('admin')],
    },
    {
      path: '',
      redirectTo: 'dashboard',
      pathMatch: 'full',
    },
  ],
  // Operator accounts are granted, never self-served. A registration page here
  // would create accounts that the very next sign-in refuses, and it rendered
  // with the consumer app's translation keys because the admin locale never
  // carried them. Dropping the route also removes the login page's Sign Up
  // button, which reads its answer off the router.
  { registration: false },
);
