import { Routes } from '@angular/router';
import { LoginContainerComponent } from './integration/login/login-container.component';
import { RegistrationContainerComponent } from './integration/registration/registration-container.component';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    component: LoginContainerComponent,
  },
  {
    path: 'registration',
    component: RegistrationContainerComponent,
  },
];
