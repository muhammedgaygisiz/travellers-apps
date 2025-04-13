import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './routes';

export const withAuthRoutes = (routes: Routes): Routes => [
  ...routes,
  ...AUTH_ROUTES,
];
