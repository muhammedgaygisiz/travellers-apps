import { Actions, createEffect, ofType } from '@ngrx/effects';
import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';
import { fromAuth } from 'ta-firestore';
import { NavController } from '@ionic/angular';
import { AFTER_LOGIN_PAGE } from 'utils';

@Injectable()
export class RouterEffects {
  private readonly actions$ = inject(Actions);
  private readonly navController = inject(NavController);
  private readonly pageAfterLogin = inject(AFTER_LOGIN_PAGE, {
    optional: true,
  });

  redirectToHome$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.loginSucceeded),
        tap(() => {
          this.navController.navigateRoot([this.pageAfterLogin]);
        })
      ),
    { dispatch: false }
  );
}
