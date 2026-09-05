import { Routes } from '@angular/router';
import { withAuthRoutes } from 'auth';
import { authGuard, NoAccessComponent, roleGuard } from 'ta-firestore';
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
 * `start`, the auth routes, and `no-access` are deliberately ungated. They are
 * where a visitor who fails those checks is sent, and gating them would send
 * that visitor to a page that rejects them for the same reason.
 */
export const ROUTES: Routes = withAuthRoutes([
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
    path: PATH.NO_ACCESS,
    component: NoAccessComponent,
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
]);
