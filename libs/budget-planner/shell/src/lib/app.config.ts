import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideBudgetPlannerShell } from './provide-budget-planner-shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { Environment, getIonicConfig } from 'utils';
// import { provideTaFirestore } from 'ta-firestore';

// const firebaseOptions = {
//   apiKey: process.env['NX_APP_API_KEY'],
//   authDomain: process.env['NX_APP_AUTH_DOMAIN'],
//   projectId: process.env['NX_APP_PROJECT_ID'],
//   storageBucket: process.env['NX_APP_STORAGE_BUCKET'],
//   messagingSenderId: process.env['NX_APP_MESSAGINX_SENDER_ID'],
// };

export const appConfig = (
  // eslint-disable-next-line no-unused-vars
  environment: Environment
): ApplicationConfig => ({
  providers: [
    provideBudgetPlannerShell(),
    provideExperimentalZonelessChangeDetection(),
    // provideServiceWorker('ngsw-worker.js', {
    //   enabled: environment.production,
    //   // Register the ServiceWorker as soon as the application is stable
    //   // or after 30 seconds (whichever comes first).
    //   registrationStrategy: 'registerWhenStable:30000',
    // }),
    provideIonicAngular(getIonicConfig()),
    //     provideTaFirestore(firebaseOptions),
  ],
});
