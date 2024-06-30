import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideFinancesShell } from 'finances/shell';

export const appConfig: ApplicationConfig = {
  providers: [
    provideFinancesShell(),
    provideZoneChangeDetection({ eventCoalescing: true }),
  ],
};
