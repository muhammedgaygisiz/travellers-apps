import {
  ApplicationConfig,
  isDevMode,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideBiteTribeShell } from './provide-bite-tribe-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig } from 'utils';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideBiteTribeShell(environment),
    provideZonelessChangeDetection(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideIonicAngular(getIonicConfig()),
    provideTransloco({
      config: {
        defaultLang: 'en',
        fallbackLang: 'en',
      },
      loader: TranslocoHttpLoader,
    }),
  ],
});
