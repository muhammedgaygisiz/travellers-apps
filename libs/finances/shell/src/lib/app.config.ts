import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideFinancesShell } from './provide-finances-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig } from '@travellers-apps/utils-common';
import { provideFinancesStore } from 'finances/store';
import { provideTaFirestore } from 'ta-firestore';

const firebaseOptions = {
  apiKey: process.env['NX_APP_API_KEY'],
  authDomain: process.env['NX_APP_AUTH_DOMAIN'],
  projectId: process.env['NX_APP_PROJECT_ID'],
  storageBucket: process.env['NX_APP_STORAGE_BUCKET'],
  messagingSenderId: process.env['NX_APP_MESSAGINX_SENDER_ID'],
};

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideFinancesShell(),
    provideExperimentalZonelessChangeDetection(),
    provideIonicAngular(getIonicConfig()),
    provideFinancesStore(environment),
    provideTaFirestore(firebaseOptions),
  ],
});
