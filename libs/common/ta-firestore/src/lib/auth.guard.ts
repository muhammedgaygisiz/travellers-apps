import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.authStateChange$.pipe(
    map((authState) => {
      // console.debug('#mo auth authState', authState);
      if (!authState) {
        return router.parseUrl('/start');
      }

      return true;
    })
  );
};
