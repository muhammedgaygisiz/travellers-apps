import { filter, Observable, pipe, UnaryFunction } from 'rxjs';
import { BucketlistActions } from '../actions';
import { routerNavigatedAction } from '@ngrx/router-store';
import { PATH } from 'utils';
import type { Action } from '@ngrx/store';

const isRouterNavigatedAction = (
  action: Action,
): action is ReturnType<typeof routerNavigatedAction> =>
  action.type === routerNavigatedAction.type;

export const shouldLoadBucketlists = (): UnaryFunction<
  Observable<Action>,
  Observable<Action>
> => {
  return pipe(
    filter((action) => {
      if (isRouterNavigatedAction(action)) {
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

      if (action.type === BucketlistActions.deletedBucketlist.type) {
        return true;
      }

      if (action.type === BucketlistActions.updatedBucketlistName.type) {
        return true;
      }

      if (action.type === BucketlistActions.createdBucketlist.type) {
        return true;
      }

      if (
        action.type === BucketlistActions.setBiteTriedOutStatusSucceeded.type
      ) {
        return true;
      }

      return false;
    }),
  );
};
