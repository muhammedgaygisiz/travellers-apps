import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import { ROUTES } from './routes';
import { IonicRouteStrategy } from '@ionic/angular';
import { APP_TITLE, Environment, STORE_SERVICE } from 'utils';
import { FinancesStoreService, provideFinancesStore } from 'finances/store';
import { EnvironmentProviders, Provider } from '@angular/core';

export const provideFinancesShell = (
  environment: Environment
): (EnvironmentProviders | Provider)[] => [
  provideRouter(ROUTES, withPreloading(PreloadAllModules)),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: STORE_SERVICE, useClass: FinancesStoreService },
  { provide: APP_TITLE, useValue: 'Finances' },
  provideFinancesStore(environment),
];
