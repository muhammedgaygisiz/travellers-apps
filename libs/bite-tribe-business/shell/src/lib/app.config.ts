import {
  ApplicationConfig,
  provideAppInitializer,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideBiteTribeBusinessShell } from './provide-bite-tribe-business-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig, loadAppRelease } from 'utils';
import { provideTransloco } from '@jsverse/transloco';
import { TranslocoHttpLoader } from './transloco-loader';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideBiteTribeBusinessShell(environment),
    provideZonelessChangeDetection(),
    // The business app renders the same shared app menu, so it resolves the
    // release the same way (issue #1303).
    provideAppInitializer(() => {
      void loadAppRelease();
    }),
    provideIonicAngular(getIonicConfig()),
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
