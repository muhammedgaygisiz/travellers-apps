import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const startGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const authState = authService.authState();

  if (authState?.user) {
    return router.parseUrl('/home');
  }

  return true;
};
