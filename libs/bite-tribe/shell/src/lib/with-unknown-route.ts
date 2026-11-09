import { Routes } from '@angular/router';
import { PATH } from 'utils';

/**
 * Appends the route that catches an unknown URL, such as `/bites` or a
 * mistyped link, and sends it to the start page. Without it the router
 * rejects the navigation with NG04002, which reaches the global error handler
 * and is reported as an `exception` like a crash (issue #1905).
 *
 * It goes last, after the auth routes, because the router stops at the first
 * route that matches.
 */
export const withUnknownRoute = (routes: Routes): Routes => [
  ...routes,
  { path: '**', redirectTo: PATH.START },
];
