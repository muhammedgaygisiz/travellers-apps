import {
  PreloadAllModules,
  provideRouter,
  withPreloading,
} from '@angular/router';
import { routes } from './routes';

export const provideKosamlShell = () =>
  provideRouter(routes, withPreloading(PreloadAllModules));
