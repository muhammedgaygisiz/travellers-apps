import { Environment, getMetaReducers, STORE_SERVICE } from 'utils';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { Action, provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import {
  AuthEffects,
  provideFirestoreState,
  provideFirestoreUtils,
} from 'ta-firestore';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import {
  provideRouterStore,
  routerCancelAction,
  routerNavigatedAction,
  routerNavigationAction,
  routerReducer,
  routerRequestAction,
} from '@ngrx/router-store';
import { BiteTribeStoreService } from './bite-tribe-store.service';
import { BiteEffects } from './bites/effects';
import { fromBites } from './bites';
import { ReviewEffects } from './reviews/effects';
import { fromReviews } from './reviews';
import { fromLikes } from './likes';
import { fromApp } from './app';
import { fromRestaurants } from './restaurants';
import { fromMenus } from './menus';
import { fromUsers } from './users';
import { AppEffect } from './app/effects';
import { RestaurantEffects } from './restaurants/effects';
import { LikeEffects } from './likes/effects';
import { MenuEffects } from './menus/effects';
import { FirebaseOptions } from 'firebase/app';
import { loadedRestaurantsFromApi } from './restaurants/actions';
import { BucketListEffect } from './bucketlists/effects';
import { fromBucketlists } from './bucketlists';
import { ServiceWorkerEffects } from './service-worker/effects';
import { fromFilteringAndSorting } from './filtering-and-sorting';
import { FilteringAndSortingEffects } from './filtering-and-sorting/effects';
import type { Restaurant } from 'model';

type ActionSanitizer = (action: Action, id: number) => Action;

interface SanitizableRestaurantState {
  ids: string[];
  entities: Record<string, Restaurant | undefined>;
}

interface SanitizableState {
  restaurants?: SanitizableRestaurantState;
  [key: string]: unknown;
}

/**
 * Whether this bundle is the consumer app rather than one of the two internal
 * ones.
 *
 * It gates product analytics and the effect set. An operator using the admin
 * app is not a BiteTribe user having an experience worth measuring, and
 * counting operator sessions as user sessions would quietly corrupt every
 * engagement metric derived from them - which is precisely why the business app
 * already opts out (issue #1469).
 */
const isConsumerApp = (environment: Environment): boolean =>
  !environment.isBusiness && !environment.isAdmin;

/**
 * Each app reads its own `authDomain` variable.
 *
 * All three currently resolve to the project's shared
 * `bite-tribe.firebaseapp.com` OAuth handler, so the three keys are one value
 * today. They are kept separate because `authDomain` is what Firebase builds
 * the Google and Apple redirect from: the day one app needs its own handler
 * domain — a custom domain, or a separate OAuth consent screen — it can be
 * pointed at one without moving the other two with it.
 */
const toAuthDomain = (environment: Environment): string | undefined => {
  if (environment.isAdmin) {
    return process.env['NX_APP_BITE_TRIBE_ADMIN_AUTH_DOMAIN'];
  }

  if (environment.isBusiness) {
    return process.env['NX_APP_BITE_TRIBE_BUSINESS_AUTH_DOMAIN'];
  }

  return process.env['NX_APP_BITE_TRIBE_AUTH_DOMAIN'];
};

const toFirebaseOptions = (environment: Environment): FirebaseOptions => ({
  apiKey: process.env['NX_APP_BITE_TRIBE_API_KEY'],
  authDomain: toAuthDomain(environment),
  projectId: process.env['NX_APP_BITE_TRIBE_PROJECT_ID'],
  storageBucket: process.env['NX_APP_BITE_TRIBE_STORAGE_BUCKET'],
  messagingSenderId: process.env['NX_APP_BITE_TRIBE_MESSAGING_SENDER_ID'],
  measurementId: process.env['NX_APP_BITE_TRIBE_MEASSUREMENT_ID'],
  appId: process.env['NX_APP_BITE_TRIBE_APP_ID'],
});

const isLoadedRestaurantsAction = (
  action: Action,
): action is ReturnType<typeof loadedRestaurantsFromApi> =>
  action.type === loadedRestaurantsFromApi.type;

const actionSanitizer: ActionSanitizer = (action) => {
  const isLoadedRestaurantsWithData =
    isLoadedRestaurantsAction(action) && action.restaurants.length > 0;

  if (isLoadedRestaurantsWithData) {
    return {
      ...action,
      restaurants: action.restaurants.map((restaurant) => ({
        ...restaurant,
        image: restaurant.image ? '...' : null,
      })),
    };
  }

  return action;
};

const isSanitizableState = (state: unknown): state is SanitizableState =>
  typeof state === 'object' && state !== null;

const stateSanitizer = (state: unknown): unknown => {
  if (!isSanitizableState(state)) {
    return state;
  }

  if (state.restaurants && state.restaurants.ids.length > 0) {
    return {
      ...state,
      restaurants: {
        ...state.restaurants,
        entities: state.restaurants.ids.map((id: string) => {
          const restaurant = state.restaurants?.entities[id];
          if (!restaurant) {
            return restaurant;
          }

          return {
            ...restaurant,
            image: restaurant.image ? '...' : restaurant.image, // Sanitize image data
          };
        }),
      },
    };
  }

  return { ...state };
};

export const provideBiteTribeStore = (
  environment: Environment,
): Array<Provider | EnvironmentProviders | []> => [
  { provide: STORE_SERVICE, useClass: BiteTribeStoreService },
  provideStore(
    { router: routerReducer },
    {
      metaReducers: getMetaReducers(environment),
      runtimeChecks: {
        strictActionImmutability: true,
        strictStateImmutability: true,
      },
    },
  ),
  !environment.production
    ? provideStoreDevtools({
        actionSanitizer,
        stateSanitizer,
        actionsBlocklist: [
          routerRequestAction.type,
          routerNavigationAction.type,
          routerCancelAction.type,
          routerNavigatedAction.type,
        ],
      })
    : [],
  provideRouterStore(),
  provideFirestoreState(),
  !isConsumerApp(environment)
    ? provideEffects(
        AuthEffects,
        RestaurantEffects,
        MenuEffects,
        AppEffect,
        BiteEffects,
      )
    : provideEffects(
        AuthEffects,
        BiteEffects,
        LikeEffects,
        ReviewEffects,
        AppEffect,
        RestaurantEffects,
        MenuEffects,
        BucketListEffect,
        ServiceWorkerEffects,
        FilteringAndSortingEffects,
      ),
  provideState(fromBites.key, fromBites.reducer),
  provideState(fromReviews.key, fromReviews.reducer),
  provideState(fromLikes.key, fromLikes.reducer),
  provideState(fromApp.key, fromApp.reducer),
  provideState(fromRestaurants.key, fromRestaurants.reducer),
  provideState(fromMenus.key, fromMenus.reducer),
  provideState(fromBucketlists.key, fromBucketlists.reducer),
  provideState(fromFilteringAndSorting.key, fromFilteringAndSorting.reducer),
  provideState(fromUsers.key, fromUsers.reducer),
  provideFirestoreUtils(
    toFirebaseOptions(environment),
    isConsumerApp(environment),
    environment.emulators,
    { production: environment.production },
  ),
];
