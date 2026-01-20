import { filter, Observable, pipe, UnaryFunction } from 'rxjs';
import { User } from '@capacitor-firebase/authentication';

export const stopIfUserIsUndefined = (): UnaryFunction<
  Observable<{ user: User }>,
  Observable<{ user: User }>
> => pipe(filter((v: { user: User }) => !!v.user));
