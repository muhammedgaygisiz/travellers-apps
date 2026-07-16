import { Observable, pipe, tap, UnaryFunction } from 'rxjs';
import { initPushListeners } from 'push-notifications';
import { NavController, Platform } from '@ionic/angular';

/**
 * Wires push listeners after login. It deliberately does not ask for the OS
 * permission: the onboarding notification step owns that prompt so the user
 * hears why notifications matter first (epic #850, issue #1015).
 */
export const initPushNotifications = (
  platform: Platform,
  navController: NavController,
): UnaryFunction<Observable<string>, any> =>
  pipe(
    tap(
      async (uid: string) =>
        await initPushListeners(platform, uid, navController),
    ),
  );
