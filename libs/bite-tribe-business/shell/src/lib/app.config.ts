import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideBiteTribeBusinessShell } from './provide-bite-tribe-business-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig } from 'utils';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideBiteTribeBusinessShell(environment),
    provideZonelessChangeDetection(),
    provideIonicAngular(getIonicConfig()),
  ],
});
