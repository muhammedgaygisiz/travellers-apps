import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePricesShell } from '@travellers-apps/prices/shell/feature';
import { providePricesStore } from '@travellers-apps/prices/store/feature';
import { environment } from '../environments/environment';
import { importProvidersFrom } from '@angular/core';
import { ServiceWorkerModule } from '@angular/service-worker';
import { provideFirestore } from '@travellers-apps/prices/firestore/feature';
import { provideNetworkStatus } from '@travellers-apps/common/networkstatus/feature';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from '@travellers-apps/utils-common';

const firebaseOptions = {
  apiKey: process.env['NX_APP_API_KEY'],
  authDomain: process.env['NX_APP_AUTH_DOMAIN'],
  projectId: process.env['NX_APP_PROJECT_ID'],
  storageBucket: process.env['NX_APP_STORAGE_BUCKET'],
  messagingSenderId: process.env['NX_APP_MESSAGINX_SENDER_ID'],
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    providePricesShell(),
    providePricesStore(environment),
    importProvidersFrom(
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: environment.production,
        // Register the ServiceWorker as soon as the application is stable
        // or after 30 seconds (whichever comes first).
        registrationStrategy: 'registerWhenStable:30000',
      })
    ),
    importProvidersFrom(provideFirestore(firebaseOptions)),
    provideNetworkStatus(),
    Geolocation,
    provideIonicAngular(getIonicConfig()),
  ],
};
