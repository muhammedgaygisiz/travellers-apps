import {
  PreloadAllModules,
  provideRouter,
  RouteReuseStrategy,
  withDisabledInitialNavigation,
  withPreloading,
} from '@angular/router';
import { ROUTES } from './routes';
import { IonicRouteStrategy } from '@ionic/angular';
import {
  AFTER_LOGIN_PAGE,
  AFTER_LOGOUT_PAGE,
  APP_TITLE,
  BEFORE_ROUTING_AFTER_SIGN_IN,
  Environment,
  SIGNED_IN_ACCOUNT,
  SignedInAccount,
} from 'utils';
import {
  BiteTribeStoreService,
  provideBiteTribeStore,
  SignInLanguageService,
} from 'bite-tribe/store';
import {
  computed,
  EnvironmentProviders,
  inject,
  Provider,
  Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

export const provideBiteTribeShell = (
  environment: Environment,
): (EnvironmentProviders | Provider)[] => [
  // Initial navigation is disabled so the App Check startup gate controls when
  // routing (and its Firebase-backed guards) begins. The startup initializer in
  // `provideFirestoreUtils` calls `router.initialNavigation()` once readiness is
  // proven; when enforcement blocks, navigation never starts and the retry gate
  // is shown instead. In non-enforced mode readiness is immediate, so ordering
  // is unchanged.
  provideRouter(
    ROUTES,
    withPreloading(PreloadAllModules),
    withDisabledInitialNavigation(),
  ),
  {
    provide: RouteReuseStrategy,
    useClass: IonicRouteStrategy,
  },
  { provide: APP_TITLE, useValue: 'Bite Tribe' },
  { provide: AFTER_LOGOUT_PAGE, useValue: '/start' },
  { provide: AFTER_LOGIN_PAGE, useValue: '/home' },
  {
    // Settles the app language against the account's before the sign-in
    // routes onwards, asking when the two differ (issue #2104).
    provide: BEFORE_ROUTING_AFTER_SIGN_IN,
    useFactory: (): (() => Promise<void>) => {
      const signInLanguage = inject(SignInLanguageService);

      return () => signInLanguage.reconcile();
    },
  },
  {
    // The signed-in profile the store already keeps for the app, handed to the
    // shared page chrome so the menu can name the account it belongs to. It is
    // the same record the profile page renders, so the menu cannot disagree
    // with it, and it is cleared with the session. See GitHub issue #1260.
    provide: SIGNED_IN_ACCOUNT,
    useFactory: (): Signal<SignedInAccount | undefined> => {
      const profile = toSignal(inject(BiteTribeStoreService).publicUser$);

      return computed(() => {
        const user = profile();

        // Before the profile has loaded there is no identity to show yet, and
        // an empty one would only put a blank line under the entry.
        if (!user?.displayName && !user?.photoUrl) {
          return undefined;
        }

        return {
          displayName: user.displayName ?? '',
          photoUrl: user.photoUrl ?? '',
        };
      });
    },
  },
  provideBiteTribeStore(environment),
];
