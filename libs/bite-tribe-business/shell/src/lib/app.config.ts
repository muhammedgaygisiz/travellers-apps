import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideBiteTribeBusinessShell } from './provide-bite-tribe-business-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig } from 'utils';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideBiteTribeBusinessShell(environment),
    provideExperimentalZonelessChangeDetection(),
    // provideServiceWorker('ngsw-worker.js', {
    //   enabled: environment.production,
    //   // Register the ServiceWorker as soon as the application is stable
    //   // or after 30 seconds (whichever comes first).
    //   registrationStrategy: 'registerWhenStable:30000',
    // }),
    provideIonicAngular(getIonicConfig()),
  ],
});
