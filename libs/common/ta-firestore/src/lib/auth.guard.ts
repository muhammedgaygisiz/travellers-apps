import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { debounceTime, map, startWith } from 'rxjs';
import { isBiteDetailsPage } from 'utils';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isBitePage = isBiteDetailsPage();
  const authState = authService.authState();

  if (isBitePage && authState?.user) {
    return true;
  }

  if (isBitePage && !authState?.user) {
    return authService.authStateChange$.pipe(
      startWith(null),
      // Wait for 2 second to see if the user is logged in
      debounceTime(2000),
      map((authState) => {
        if (authState?.user) {
          return true;
        } else {
          return router.parseUrl('/start');
        }
      }),
    );
  }

  if (!authState?.user) {
    return router.parseUrl('/start');
  }

  return true;
};
