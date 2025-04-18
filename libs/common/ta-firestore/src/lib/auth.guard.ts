import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { tap } from 'rxjs';
import { NavController } from '@ionic/angular';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const navController = inject(NavController);

  return authService.isLoggedIn$.pipe(
    tap((isLoggedIn) => {
      if (!isLoggedIn) {
        console.log('#mo authGuard redirect to login');
        navController.navigateRoot(['login']);
      }

      return true;
    })
  );
};
