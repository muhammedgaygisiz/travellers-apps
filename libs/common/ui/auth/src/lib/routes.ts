import { Route, Routes } from '@angular/router';
import { ForgotPasswordContainerComponent } from './integration/forgot-password/forgot-password-container.component';
import { LoginContainerComponent } from './integration/login/login-container.component';
import { RegistrationContainerComponent } from './integration/registration/registration-container.component';

/**
 * The path the registration page is registered under.
 *
 * Exported because the login page decides whether to offer Sign Up by asking
 * the router whether this route exists, rather than by carrying a second flag
 * that could disagree with the routing. See {@link withAuthRoutes}.
 */
export const REGISTRATION_PATH = 'registration';

export const REGISTRATION_ROUTE: Route = {
  path: REGISTRATION_PATH,
  component: RegistrationContainerComponent,
  title: 'Registration',
};

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    component: LoginContainerComponent,
    title: 'Login',
  },
  REGISTRATION_ROUTE,
  {
    path: 'forgot-password',
    component: ForgotPasswordContainerComponent,
    title: 'Forgot Password',
  },
];
