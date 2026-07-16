import { CanActivateFn, Routes } from '@angular/router';
import { onboardingGuard } from './onboarding.guard';

/**
 * Appends {@link onboardingGuard} to every route already protected by the given
 * auth guard, so the onboarding entry gate covers the whole authenticated
 * surface without repeating the guard on each route definition.
 *
 * Routes without the auth guard (public pages, the onboarding route itself) are
 * left untouched.
 */
export const gateAuthenticatedRoutes = (
  routes: Routes,
  authGuard: CanActivateFn,
): Routes =>
  routes.map((route) =>
    route.canActivate?.includes(authGuard)
      ? { ...route, canActivate: [...route.canActivate, onboardingGuard] }
      : route,
  );
