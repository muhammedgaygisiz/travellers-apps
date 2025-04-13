import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withPreloading,
} from '@angular/router';
import { ROUTES } from './routes';
import { IonicRouteStrategy } from '@ionic/angular';
import { APP_TITLE, STORE_SERVICE } from 'utils';

export const provideBudgetPlannerShell = () => [
  provideRouter(ROUTES, withPreloading(PreloadAllModules)),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: STORE_SERVICE, useValue: {} },
  { provide: APP_TITLE, useValue: 'Budget Planner' },
];
