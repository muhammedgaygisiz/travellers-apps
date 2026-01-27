import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { routerNavigatedAction } from '@ngrx/router-store';
import { UserActions } from './actions';
import { catchError, filter, from, map, of, switchMap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { bite } from '../bites/selectors';
import { userId } from '../router/selectors';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { PATH } from 'utils';

@Injectable()
export class UserEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly store = inject(Store);
  private readonly storeService = inject(BiteTribeStoreService);

  bite = toSignal(this.store.select(bite));
  userId = toSignal(this.store.select(userId));

  loadUserFromBite$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction, UserActions.savedPublicProfile),
      filter((action) => {
        if (action.type === routerNavigatedAction.type) {
          return action.payload.event.urlAfterRedirects.includes('/bite/');
        }

        return action.type === UserActions.savedPublicProfile.type;
      }),
      switchMap(() => {
        const bite = this.bite();

        if (bite) {
          return from(this.api.getUserByBiteId(bite)).pipe(
            catchError(() => of(undefined)),
          );
        }

        const userId = this.userId();

        if (userId) {
          return from(this.api.getUserById(userId)).pipe(
            catchError(() => of(undefined)),
          );
        }

        return of(undefined);
      }),
      map((user) => {
        if (user) {
          return UserActions.loadedBiteCreator({ user });
        }

        return UserActions.noUserForBite();
      }),
    );
  });

  loadFollowers$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) => {
        return payload.event.urlAfterRedirects.includes(`/${PATH.FOLLOWERS}`);
      }),
      switchMap(() => {
        const userId = this.userId();
        const type = this.storeService.followType();

        if (!userId) {
          return of(UserActions.noUserIDProvided());
        }

        if (type === 'followers') {
          return from(this.api.fetchFollowersWithDetails(userId)).pipe(
            map((users) => UserActions.loadedFollowers({ users })),
            catchError(() => of(UserActions.errorLoadingFollowers())),
          );
        } else {
          return from(this.api.fetchFollowingWithDetails(userId)).pipe(
            map((users) => UserActions.loadedFollowings({ users })),
            catchError(() => of(UserActions.errorLoadingFollowings())),
          );
        }
      }),
    );
  });
}
