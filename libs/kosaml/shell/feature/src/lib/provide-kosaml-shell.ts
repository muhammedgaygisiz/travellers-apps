import {
  PreloadAllModules,
  provideRouter,
  withPreloading,
} from '@angular/router';
import { routes } from './routes';
import { EnvironmentProviders } from '@angular/core';

export const provideKosamlShell = (): EnvironmentProviders =>
  provideRouter(routes, withPreloading(PreloadAllModules));
