import { CanActivateFn, Routes } from '@angular/router';
import { gateAuthenticatedRoutes } from '../gate-authenticated-routes';
import { onboardingGuard } from '../onboarding.guard';

const authGuard: CanActivateFn = () => true;
const otherGuard: CanActivateFn = () => true;

describe('gateAuthenticatedRoutes', () => {
  it('appends the onboarding guard to routes protected by the auth guard', () => {
    const routes: Routes = [{ path: 'home', canActivate: [authGuard] }];

    const gated = gateAuthenticatedRoutes(routes, authGuard);

    expect(gated[0].canActivate).toEqual([authGuard, onboardingGuard]);
  });

  it('preserves guard order so the auth guard still runs first', () => {
    const routes: Routes = [
      { path: 'new-bite', canActivate: [authGuard, otherGuard] },
    ];

    const gated = gateAuthenticatedRoutes(routes, authGuard);

    expect(gated[0].canActivate).toEqual([
      authGuard,
      otherGuard,
      onboardingGuard,
    ]);
  });

  it('leaves routes without the auth guard untouched', () => {
    const routes: Routes = [
      { path: 'start', canActivate: [otherGuard] },
      { path: '', redirectTo: 'start', pathMatch: 'full' },
    ];

    const gated = gateAuthenticatedRoutes(routes, authGuard);

    expect(gated[0].canActivate).toEqual([otherGuard]);
    expect(gated[1].canActivate).toBeUndefined();
  });

  it('does not mutate the original routes', () => {
    const routes: Routes = [{ path: 'home', canActivate: [authGuard] }];

    gateAuthenticatedRoutes(routes, authGuard);

    expect(routes[0].canActivate).toEqual([authGuard]);
  });
});
