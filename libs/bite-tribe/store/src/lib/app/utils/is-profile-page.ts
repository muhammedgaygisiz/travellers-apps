import { filter, Observable, pipe, UnaryFunction } from 'rxjs';
import { PATH } from 'utils';
import { routerNavigatedAction } from '@ngrx/router-store';

export const isProfilePage = (): UnaryFunction<
  Observable<any>,
  Observable<any>
> =>
  pipe(
    filter(({ type, payload }) => {
      const isRouterNavitation = type === routerNavigatedAction.type;
      if (isRouterNavitation) {
        const urlAfterRedirects = payload.event.urlAfterRedirects;
        return (
          urlAfterRedirects.includes(`/${PATH.PROFILE}/`) ||
          urlAfterRedirects === `/${PATH.MY_PROFILE}`
        );
      }

      return true;
    }),
  );
