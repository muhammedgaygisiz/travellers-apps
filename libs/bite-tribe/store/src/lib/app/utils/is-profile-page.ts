import { filter, Observable, pipe, UnaryFunction } from 'rxjs';
import { PATH } from 'utils';
import { routerNavigatedAction } from '@ngrx/router-store';
import type { Action } from '@ngrx/store';

const isRouterNavigatedAction = (
  action: Action,
): action is ReturnType<typeof routerNavigatedAction> =>
  action.type === routerNavigatedAction.type;

export const isProfilePage = (): UnaryFunction<
  Observable<Action>,
  Observable<Action>
> =>
  pipe(
    filter((action) => {
      if (isRouterNavigatedAction(action)) {
        const urlAfterRedirects = action.payload.event.urlAfterRedirects;
        return (
          urlAfterRedirects.includes(`/${PATH.PROFILE}/`) ||
          urlAfterRedirects === `/${PATH.MY_PROFILE}`
        );
      }

      return true;
    }),
  );
