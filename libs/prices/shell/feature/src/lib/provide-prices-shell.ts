import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import { ROUTES } from './routes';
import { IonicRouteStrategy } from '@ionic/angular';
import { APP_TITLE, Environment, STORE_SERVICE } from 'utils';
import {
  PricesStoreService,
  providePricesStore,
} from '@travellers-apps/prices/store/feature';
import { EnvironmentProviders, Provider } from '@angular/core';

export const providePricesShell = (
  environment: Environment
): (EnvironmentProviders | Provider)[] => [
  provideRouter(ROUTES, withPreloading(PreloadAllModules)),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: STORE_SERVICE, useClass: PricesStoreService },
  { provide: APP_TITLE, useValue: 'Prices' },
  providePricesStore(environment),
];
