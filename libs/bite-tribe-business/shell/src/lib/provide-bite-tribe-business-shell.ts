import { ROUTES } from './routes';

import {
  AFTER_LOGIN_PAGE,
  AFTER_LOGOUT_PAGE,
  APP_ICON,
  APP_TITLE,
  Environment,
} from 'utils';
import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import { provideBiteTribeStore } from 'bite-tribe/store';
import { IonicRouteStrategy } from '@ionic/angular';
import { EnvironmentProviders, Provider } from '@angular/core';

export const provideBiteTribeBusinessShell = (
  environment: Environment
): (EnvironmentProviders | Provider)[] => [
  provideRouter(ROUTES, withPreloading(PreloadAllModules)),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: APP_TITLE, useValue: 'Bite Tribe Business' },
  { provide: APP_ICON, useValue: 'location-outline' },
  { provide: AFTER_LOGOUT_PAGE, useValue: '/start' },
  { provide: AFTER_LOGIN_PAGE, useValue: '/dashboard' },
  provideBiteTribeStore(environment),
];
