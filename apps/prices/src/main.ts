import { enableProdMode, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideAnimations } from '@angular/platform-browser/animations';
import { environment } from './environments/environment';
import { providePricesShell } from '@travellers-apps/prices/shell/feature';
import { providePricesStoreFeatures } from '@travellers-apps/prices/store/feature';
import { provideFirestoreFeatures } from '@travellers-apps/prices/firestore/feature';
import { provideNetworkStatus } from '@travellers-apps/common/networkstatus/feature';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from '@travellers-apps/utils-common';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';
import { ServiceWorkerModule } from '@angular/service-worker';

if (process.env['NODE_ENV'] === 'production') {
  enableProdMode();
}

const firebaseOptions = {
  apiKey: process.env['NX_APP_API_KEY'],
  authDomain: process.env['NX_APP_AUTH_DOMAIN'],
  projectId: process.env['NX_APP_PROJECT_ID'],
  storageBucket: process.env['NX_APP_STORAGE_BUCKET'],
  messagingSenderId: process.env['NX_APP_MESSAGINX_SENDER_ID'],
};

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    providePricesShell(),
    providePricesStoreFeatures(environment),
    importProvidersFrom(
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: environment.production,
        // Register the ServiceWorker as soon as the application is stable
        // or after 30 seconds (whichever comes first).
        registrationStrategy: 'registerWhenStable:30000',
      })
    ),
    importProvidersFrom(provideFirestoreFeatures(firebaseOptions)),
    provideNetworkStatus(),
    Geolocation,
    provideIonicAngular(getIonicConfig()),
  ],
});
