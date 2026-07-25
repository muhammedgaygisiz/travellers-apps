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

export const provideBiteTribeShell = (
  environment: Environment,
): (EnvironmentProviders | Provider)[] => [
  // Initial navigation is disabled so the App Check startup gate controls when
  // routing (and its Firebase-backed guards) begins. The startup initializer in
  // `provideFirestoreUtils` calls `router.initialNavigation()` once readiness is
  // proven; when enforcement blocks, navigation never starts and the retry gate
  // is shown instead. In non-enforced mode readiness is immediate, so ordering
  // is unchanged.
  provideRouter(
    ROUTES,
    withPreloading(PreloadAllModules),
    withDisabledInitialNavigation(),
  ),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: APP_TITLE, useValue: 'Bite Tribe' },
  { provide: AFTER_LOGOUT_PAGE, useValue: '/start' },
  { provide: AFTER_LOGIN_PAGE, useValue: '/home' },
  provideBiteTribeStore(environment),
];
