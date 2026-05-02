import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideBiteTribeBusinessShell } from './provide-bite-tribe-business-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig } from 'utils';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideBiteTribeBusinessShell(environment),
    provideZonelessChangeDetection(),
    provideIonicAngular(getIonicConfig()),
    provideTransloco({
      config: {
        availableLangs: ['en', 'pt'],
        defaultLang: 'en',
        fallbackLang: 'en',
      },
      loader: TranslocoHttpLoader,
    }),
  ],
});
