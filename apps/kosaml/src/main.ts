import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideKosamlStoreFeature } from '@travellers-apps/kosaml/store/feature';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideKosamlShell } from '@travellers-apps/kosaml/shell/feature';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideKosamlShell(),
    provideKosamlStoreFeature(environment),
  ],
});
