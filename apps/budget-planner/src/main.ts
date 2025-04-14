import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from 'budget-planner-shell';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, appConfig(environment)).catch((err) =>
  console.error(err)
);
