import { Observable, pipe, tap, UnaryFunction } from 'rxjs';
import { initPush } from 'push-notifications';
import { NavController, Platform } from '@ionic/angular';

export const initPushNotifications = (
  platform: Platform,
  navController: NavController,
): UnaryFunction<Observable<string>, any> =>
  pipe(
    tap(async (uid: string) => await initPush(platform, uid, navController)),
  );
