import { Actions, createEffect, ofType } from '@ngrx/effects';
import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';
import { fromAuth } from 'ta-firestore';
import { NavController } from '@ionic/angular';

@Injectable()
export class RouterEffects {
  private readonly actions$ = inject(Actions);
  private readonly navController = inject(NavController);

  redirectToHome$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(fromAuth.loginSucceeded),
        tap(() => {
          this.navController.navigateRoot(['/home']);
        })
      ),
    { dispatch: false }
  );
}
