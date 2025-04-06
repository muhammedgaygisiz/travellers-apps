import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePricesShell } from '@travellers-apps/prices/shell/feature';
import { providePricesStore } from '@travellers-apps/prices/store/feature';
import { environment } from '../environments/environment';
import { provideServiceWorker } from '@angular/service-worker';
import { provideNetworkStatus } from '@travellers-apps/common/networkstatus/feature';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from '@travellers-apps/utils-common';
import { provideLocalization } from '@travellers-apps/prices/localization';
import { provideHttpClient } from '@angular/common/http';
import { provideTaFirestore } from 'ta-firestore';

const firebaseOptions = {
  apiKey: process.env['NX_APP_API_KEY'],
  authDomain: process.env['NX_APP_AUTH_DOMAIN'],
  projectId: process.env['NX_APP_PROJECT_ID'],
  storageBucket: process.env['NX_APP_STORAGE_BUCKET'],
  messagingSenderId: process.env['NX_APP_MESSAGINX_SENDER_ID'],
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideAnimations(),
    providePricesShell(),
    providePricesStore(environment),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideTaFirestore(firebaseOptions),
    provideNetworkStatus(),
    Geolocation,
    provideIonicAngular(getIonicConfig()),
    provideHttpClient(),
    provideLocalization(environment.i18n),
  ],
};
