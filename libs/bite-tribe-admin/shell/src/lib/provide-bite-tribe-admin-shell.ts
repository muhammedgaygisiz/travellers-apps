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
  REQUIRED_ROLES,
} from 'utils';
import { provideBiteTribeStore } from 'bite-tribe/store';
import { EnvironmentProviders, Provider } from '@angular/core';

export const provideBiteTribeAdminShell = (
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
  { provide: APP_TITLE, useValue: 'BiteTribe Admin' },
  // Sign-in refuses any account that does not hold this role, and reports
  // the refusal as a generic login failure. The consumer app leaves the
  // token unbound, which is what keeps it ungated (issue #1469).
  { provide: REQUIRED_ROLES, useValue: ['admin'] },
  { provide: AFTER_LOGOUT_PAGE, useValue: '/start' },
  { provide: AFTER_LOGIN_PAGE, useValue: '/dashboard' },
  provideBiteTribeStore(environment),
];
