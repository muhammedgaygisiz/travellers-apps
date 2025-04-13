import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideKosamlStore } from '@travellers-apps/kosaml/store/feature';
import { Environment } from 'utils';
import { provideKosamlShell } from './provide-kosaml-shell';

export const appConfig = (environment: Environment): ApplicationConfig => ({
  providers: [
    provideAnimations(),
    provideKosamlShell(),
    provideKosamlStore(environment),
  ],
});
