import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import { ROUTES } from './routes';
import { IonicRouteStrategy } from '@ionic/angular';
import { APP_TITLE, Environment } from 'utils';

export const provideBiteTribeShell = (
  // eslint-disable-next-line no-unused-vars
  environment: Environment
) => [
  provideRouter(ROUTES, withPreloading(PreloadAllModules)),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: APP_TITLE, useValue: 'Bite Tribe' },
  // provideBiteTribeStore(environment),
];
