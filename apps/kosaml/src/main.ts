import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { appConfig } from '@travellers-apps/kosaml/shell/feature';

bootstrapApplication(AppComponent, appConfig(environment));
