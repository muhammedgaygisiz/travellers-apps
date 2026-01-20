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
        return payload.event.urlAfterRedirects.includes(`/${PATH.PROFILE}/`);
      }

      return true;
    }),
  );
