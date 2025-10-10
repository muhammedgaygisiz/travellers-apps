import { Environment, getMetaReducers, STORE_SERVICE } from 'utils';
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
import { AppEffect } from './app/effects';
import { RestaurantEffects } from './restaurants/effects';
import { LikeEffects } from './likes/effects';
import { MenuEffects } from './menus/effects';
import { FirebaseOptions } from 'firebase/app';
import { loadedBitesFromApi } from './bites/actions';
import { loadedRestaurantsFromApi } from './restaurants/actions';
import { BucketListEffect } from './bucketlists/effects';
import { fromBucketlists } from './bucketlists';

const toFirebaseOptions = (environment: Environment): FirebaseOptions => ({
  apiKey: process.env['NX_APP_BITE_TRIBE_API_KEY'],
  authDomain: environment.isBusiness
    ? process.env['NX_APP_BITE_TRIBE_BUSINESS_AUTH_DOMAIN']
    : process.env['NX_APP_BITE_TRIBE_AUTH_DOMAIN'],
  projectId: process.env['NX_APP_BITE_TRIBE_PROJECT_ID'],
  storageBucket: process.env['NX_APP_BITE_TRIBE_STORAGE_BUCKET'],
  messagingSenderId: process.env['NX_APP_BITE_TRIBE_MESSAGINX_SENDER_ID'],
  measurementId: process.env['NX_APP_BITE_TRIBE_MEASSUREMENT_ID'],
  appId: process.env['NX_APP_BITE_TRIBE_APP_ID'],
});

const actionSanitizer: any = (action: Action) => {
  const isLoadedBitesWithData =
    action.type === loadedBitesFromApi.type && (action as any).bites.length > 0;

  if (isLoadedBitesWithData) {
    return {
      ...action,
      bites: (action as any).bites.map((bite: any) => ({
        ...bite,
        image: bite.image ? '...' : null,
      })),
    };
  }

  const isLoadedRestaurantsWithData =
    action.type === loadedRestaurantsFromApi.type &&
    (action as any).restaurants.length > 0;

  if (isLoadedRestaurantsWithData) {
    return {
      ...action,
      restaurants: (action as any).restaurants.map((restaurant: any) => ({
        ...restaurant,
        image: restaurant.image ? '...' : null,
      })),
    };
  }

  return action;
};

const stateSanitizer: any = (state: any) => {
  let sanitizedState = { ...state };

  if (state.bites?.ids.length > 0) {
    sanitizedState = {
      ...state,
      bites: {
        ...state.bites,
        entities: state.bites.ids.map((id: string) => {
          const bite = state.bites.entities[id];
          return {
            ...bite,
            image: bite.image ? '...' : bite.image, // Sanitize image data
          };
        }),
      },
    };

    return sanitizedState;
  }

  if (state.restaurants?.ids.length > 0) {
    sanitizedState = {
      ...state,
      restaurants: {
        ...state.restaurants,
        entities: state.restaurants.ids.map((id: string) => {
          const restaurant = state.restaurants.entities[id];
          return {
            ...restaurant,
            image: restaurant.image ? '...' : restaurant.image, // Sanitize image data
          };
        }),
      },
    };

    return sanitizedState;
  }

  return sanitizedState;
};

export const provideBiteTribeStore = (environment: Environment): any => [
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
  environment.isBusiness
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
      ),
  provideState(fromBites.key, fromBites.reducer),
  provideState(fromReviews.key, fromReviews.reducer),
  provideState(fromLikes.key, fromLikes.reducer),
  provideState(fromApp.key, fromApp.reducer),
  provideState(fromRestaurants.key, fromRestaurants.reducer),
  provideState(fromMenus.key, fromMenus.reducer),
  provideState(fromBucketlists.key, fromBucketlists.reducer),
  provideFirestoreUtils(
    toFirebaseOptions(environment),
    !environment.isBusiness,
  ),
];
