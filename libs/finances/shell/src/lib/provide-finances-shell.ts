import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import { ROUTES } from './routes';
import { IonicRouteStrategy } from '@ionic/angular';
import { APP_TITLE, STORE_SERVICE } from 'utils';
import { FinancesStoreService } from 'finances/store';

export const provideFinancesShell = () => [
  provideRouter(ROUTES, withPreloading(PreloadAllModules)),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: STORE_SERVICE, useClass: FinancesStoreService },
  { provide: APP_TITLE, useValue: 'Finances' },
];
