import { ApplicationConfig } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideKosamlShell } from '@travellers-apps/kosaml/shell/feature';
import { provideKosamlStore } from '@travellers-apps/kosaml/store/feature';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideKosamlShell(),
    provideKosamlStore(environment),
  ],
};
