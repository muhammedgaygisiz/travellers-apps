import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import { ROUTES } from './routes';
import { IonicRouteStrategy } from '@ionic/angular';
import { APP_TITLE, STORE_SERVICE } from 'utils';
import { PricesStoreService } from '@travellers-apps/prices/store/feature';

export const providePricesShell = () => [
  provideRouter(ROUTES, withPreloading(PreloadAllModules)),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: STORE_SERVICE, useClass: PricesStoreService },
  { provide: APP_TITLE, useValue: 'Prices' },
];
