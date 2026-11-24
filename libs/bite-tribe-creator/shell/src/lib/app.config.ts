import {
  ApplicationConfig,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideBiteTribeCreatorShell } from './provide-bite-tribe-creator-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig, loadAppRelease } from 'utils';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideBiteTribeCreatorShell(environment),
    provideZonelessChangeDetection(),
    // The creator app renders the same shared app menu, so it resolves the
    // release the same way (issue #1303).
    provideAppInitializer(() => {
      void loadAppRelease();
    }),
    provideIonicAngular(getIonicConfig()),
    // English only for now, like the business app. The consumer app's other
    // locales follow once the app has more than its first two pages; see
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
