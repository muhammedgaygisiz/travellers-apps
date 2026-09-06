import { Routes } from '@angular/router';
import { AUTH_ROUTES, REGISTRATION_PATH } from './routes';

export interface AuthRoutesOptions {
  /**
   * Whether the app lets anyone create an account.
   *
   * `false` removes the registration route entirely rather than hiding a
   * button, because a route that exists is reachable: the admin app's
   * registration page was one address bar away, and rendered with the
   * consumer app's translation keys because the admin locale never carried
   * them (issue #1469).
   *
   * The login page reads the same answer off the router, so turning this off
   * also removes its Sign Up button. There is no second switch to forget.
   */
  registration?: boolean;
}

export const withAuthRoutes = (
  routes: Routes,
  { registration = true }: AuthRoutesOptions = {},
): Routes => [
  ...routes,
  ...AUTH_ROUTES.filter(
    (route) => registration || route.path !== REGISTRATION_PATH,
  ),
];
