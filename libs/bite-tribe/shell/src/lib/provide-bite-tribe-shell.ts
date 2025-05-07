import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import { ROUTES } from './routes';
import { IonicRouteStrategy } from '@ionic/angular';
import { AFTER_LOGOUT_PAGE, APP_ICON, APP_TITLE, Environment } from 'utils';
import { provideBiteTribeStore } from 'bite-tribe/store';

export const provideBiteTribeShell = (environment: Environment) => [
  provideRouter(ROUTES, withPreloading(PreloadAllModules)),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: APP_TITLE, useValue: 'Bite Tribe' },
  { provide: APP_ICON, useValue: 'location-outline' },
  { provide: AFTER_LOGOUT_PAGE, useValue: '/start' },
  provideBiteTribeStore(environment),
];
