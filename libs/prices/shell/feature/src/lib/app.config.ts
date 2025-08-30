import {
  ApplicationConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePricesShell } from './provide-prices-shell';
import { provideServiceWorker } from '@angular/service-worker';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig } from 'utils';
import { provideLocalization } from 'localization';
import { provideHttpClient } from '@angular/common/http';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    providePricesShell(environment),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    Geolocation,
    provideIonicAngular(getIonicConfig()),
    provideHttpClient(),
    provideLocalization(environment.i18n),
  ],
});
