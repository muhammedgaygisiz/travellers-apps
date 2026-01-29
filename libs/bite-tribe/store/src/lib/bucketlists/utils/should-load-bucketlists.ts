import { filter, Observable, pipe, UnaryFunction } from 'rxjs';
import { BucketlistActions } from '../actions';
import { routerNavigatedAction } from '@ngrx/router-store';
import { PATH } from 'utils';

export const shouldLoadBucketlists = (): UnaryFunction<
  Observable<{ type: string; payload?: any }>,
  Observable<any>
> => {
  return pipe(
    filter((action) => {
      if (action.type === routerNavigatedAction.type) {
        const { payload } = action;
        const urlAfterRedirects = payload.event.urlAfterRedirects;
        return (
          (urlAfterRedirects.startsWith(`/${PATH.MY_BUCKETLISTS}`) &&
            urlAfterRedirects.endsWith(PATH.MY_BUCKETLISTS)) ||
          (urlAfterRedirects.startsWith(`/${PATH.BITE}`) &&
            !urlAfterRedirects.includes(`${PATH.RESTAURANT}`))
        );
      }

      if (action.type === BucketlistActions.removedBiteFromBucketlist.type) {
        return true;
      }

      if (action.type === BucketlistActions.savedBiteToBucketlist.type) {
        return true;
      }

      if (
        action.type === BucketlistActions.createdBucketlistAndSavedBiteToIt.type
      ) {
        return true;
      }

      return false;
    }),
  );
};
