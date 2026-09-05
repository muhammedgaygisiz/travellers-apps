import {
  ApplicationConfig,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideBiteTribeAdminShell } from './provide-bite-tribe-admin-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig, loadAppRelease } from 'utils';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideBiteTribeAdminShell(environment),
    provideZonelessChangeDetection(),
    // The admin app renders the same shared app menu, so it resolves the
    // release the same way (issue #1303).
    provideAppInitializer(() => {
      void loadAppRelease();
    }),
    provideIonicAngular(getIonicConfig()),
    // English only, and deliberately so. The admin app has exactly one
    // audience — BiteTribe operators — and translating an internal tool would
    // add four locale lists to keep in step for no reader. See
    // `Implementation - Localization`.
    provideTransloco({
      config: {
        availableLangs: ['en'],
        defaultLang: 'en',
        fallbackLang: 'en',
      },
      loader: TranslocoHttpLoader,
    }),
  ],
});
