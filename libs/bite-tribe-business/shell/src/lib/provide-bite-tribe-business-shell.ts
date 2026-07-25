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
} from 'utils';
import { provideBiteTribeStore } from 'bite-tribe/store';
import { EnvironmentProviders, Provider } from '@angular/core';

export const provideBiteTribeBusinessShell = (
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
  { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
  { provide: AFTER_LOGOUT_PAGE, useValue: '/start' },
  { provide: AFTER_LOGIN_PAGE, useValue: '/dashboard' },
  provideBiteTribeStore(environment),
];
