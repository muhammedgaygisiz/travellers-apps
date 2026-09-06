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
