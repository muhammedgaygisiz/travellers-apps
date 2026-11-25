import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withDisabledInitialNavigation,
  withPreloading,
} from '@angular/router';
import { ROUTES } from './routes';
import { IonicRouteStrategy } from '@ionic/angular';
import {
  AFTER_LOGIN_PAGE,
  AFTER_LOGOUT_PAGE,
  APP_TITLE,
  Environment,
  provideAppTitleStrategy,
} from 'utils';
import { provideBiteTribeStore } from 'bite-tribe/store';
import { EnvironmentProviders, Provider } from '@angular/core';

export const provideBiteTribeCreatorShell = (
  environment: Environment,
): (EnvironmentProviders | Provider)[] => [
  // Initial navigation is disabled so the shared App Check startup gate in
  // `provideFirestoreUtils` controls when routing begins (see the consumer
  // shell for the rationale).
  provideRouter(
    ROUTES,
    withPreloading(PreloadAllModules),
    withDisabledInitialNavigation(),
  ),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: APP_TITLE, useValue: 'BiteTribe Creator' },
  // Every route sets the tab title, so "Login" does not outlive sign-in
  // (issue #1977).
  provideAppTitleStrategy('BiteTribe Creator'),
  // `REQUIRED_ROLES` is deliberately left unbound, as in the consumer app:
  // any signed-in account may create a BiteTrail (issue #2130, `RD-UR-4`).
  { provide: AFTER_LOGOUT_PAGE, useValue: '/start' },
  { provide: AFTER_LOGIN_PAGE, useValue: '/bite-trails' },
  provideBiteTribeStore(environment),
];
