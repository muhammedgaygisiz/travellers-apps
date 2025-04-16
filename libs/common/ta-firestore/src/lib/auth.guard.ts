import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { tap } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);

  return authService.isLoggedIn$().pipe(
    tap((isLoggedIn) => {
      console.log('#mo authGuard isLoggedIn', isLoggedIn);
    })
  );
};
