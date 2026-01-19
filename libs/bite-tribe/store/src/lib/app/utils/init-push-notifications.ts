import { Observable, pipe, tap, UnaryFunction } from 'rxjs';
import { initPush } from 'push-notifications';

export const initPushNotifications = (): UnaryFunction<
  Observable<any>,
  any
> => {
  return pipe(tap(() => initPush()));
};
