import { Routes } from '@angular/router';
import { ForgotPasswordContainerComponent } from './integration/forgot-password/forgot-password-container.component';
import { LoginContainerComponent } from './integration/login/login-container.component';
import { RegistrationContainerComponent } from './integration/registration/registration-container.component';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    component: LoginContainerComponent,
    title: 'Login',
  },
  {
    path: 'registration',
    component: RegistrationContainerComponent,
    title: 'Registration',
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordContainerComponent,
    title: 'Forgot Password',
  },
];
