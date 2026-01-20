import { map, Observable, pipe, UnaryFunction } from 'rxjs';
import { User } from '@capacitor-firebase/authentication';

export const withUserFromAction = (): UnaryFunction<
  Observable<{ user: User }>,
  Observable<string>
> => {
  return pipe(
    map((action) => {
      const userUid = action.user?.uid;

      if (!userUid) {
        console.warn('User UID is undefined');
        return '';
      }

      return userUid;
    }),
  );
};
