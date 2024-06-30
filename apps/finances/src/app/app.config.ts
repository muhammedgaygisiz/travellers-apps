import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideFinancesShell } from 'finances/shell';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from '@travellers-apps/utils-common';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFinancesShell(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideIonicAngular(getIonicConfig()),
  ],
};
