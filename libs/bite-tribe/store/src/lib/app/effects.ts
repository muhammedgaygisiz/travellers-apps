import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import {
  errorLoadingGpsPosition,
  goPrivate,
  goPublic,
  loadedGpsPosition,
  loadedSettingsFromApi,
  savePublicProfile,
  saveSettings,
  setPublicProfile,
} from './actions';
import { catchError, filter, map, of, switchMap, tap } from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { Platform } from '@ionic/angular';
import { BiteTribeApiService } from 'bite-tribe/api';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class AppEffect {
  private readonly actions$ = inject(Actions);
  private readonly platform = inject(Platform);
  private readonly api = inject(BiteTribeApiService);

  loadSettingsFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.api.settings$),
      map((settings) => loadedSettingsFromApi({ settings }))
    );
  });

  loadPublicProfile$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.loadedUser),
      filter((payload) => !!payload.user),
      switchMap(() => this.api.publicProfile$),
      map((profile) => setPublicProfile({ profile }))
    );
  });

  getCurrentPosition$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.loadedUser),
      filter((payload) => !!payload.user),
      switchMap(() => getCurrentPosition(this.platform)),
      map((currentPosition) =>
        loadedGpsPosition({ position: currentPosition })
      ),
      catchError((error) => {
        console.log(error);
        return of(errorLoadingGpsPosition({ error }));
      })
    );
  });

  saveSettingsToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveSettings),
        tap(({ settings }) => {
          this.api.saveSettings(settings);
        })
      );
    },
    { dispatch: false }
  );

  goPublicEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(goPublic),
        tap(() => {
          this.api.saveUser();
        })
      );
    },
    { dispatch: false }
  );

  saveProfileToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(savePublicProfile),
        tap(({ publicUser }) => {
          this.api.updateUser(publicUser);
        })
      );
    },
    { dispatch: false }
  );

  goPrivateEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(goPrivate),
        tap(() => {
          this.api.deleteUser();
        })
      );
    },
    { dispatch: false }
  );
}
