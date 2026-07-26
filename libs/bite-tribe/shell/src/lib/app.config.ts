import {
  ApplicationConfig,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideBiteTribeShell } from './provide-bite-tribe-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig } from 'utils';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';
import {
  disableServiceWorkerOnNative,
  isServiceWorkerEnabled,
} from './service-worker';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideBiteTribeShell(environment),
    provideZonelessChangeDetection(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: isServiceWorkerEnabled(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    // Cleans up a worker left behind by an earlier native build. Not awaited:
    // startup must not wait for - or fail on - the cleanup.
    provideAppInitializer(() => {
      void disableServiceWorkerOnNative();
    }),
    provideIonicAngular(getIonicConfig()),
    provideTransloco({
      config: {
        availableLangs: [
          'en',
          'de',
          'fr',
          'tr',
          'es',
          'it',
          'ar',
          'am',
          'id',
          'pt',
          'th',
        ],
        defaultLang: 'en',
        fallbackLang: 'en',
      },
      loader: TranslocoHttpLoader,
    }),
  ],
});
