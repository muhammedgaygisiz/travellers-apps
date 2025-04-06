import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideFinancesShell } from 'finances/shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from '@travellers-apps/utils-common';
import { provideFinancesStore } from 'finances/store';
import { environment } from '../environments/environment';
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
    provideFinancesShell(),
    provideExperimentalZonelessChangeDetection(),
    provideIonicAngular(getIonicConfig()),
    provideFinancesStore(environment),
    provideTaFirestore(firebaseOptions),
  ],
};
