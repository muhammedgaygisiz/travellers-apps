import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideFinancesShell } from './provide-finances-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig } from 'utils';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideFinancesShell(environment),
    provideExperimentalZonelessChangeDetection(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideIonicAngular(getIonicConfig()),
  ],
});
