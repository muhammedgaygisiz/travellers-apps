import { Environment, getMetaReducers, STORE_SERVICE } from 'utils';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import {
  AuthEffects,
  provideFirestoreState,
  provideFirestoreUtils,
} from 'ta-firestore';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideRouterStore, routerReducer } from '@ngrx/router-store';
import { BiteTribeStoreService } from './bite-tribe-store.service';
import { RouterEffects } from './router/effects';
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

const firebaseOptions = {
  apiKey: process.env['NX_APP_BITE_TRIBE_API_KEY'],
  authDomain: process.env['NX_APP_BITE_TRIBE_AUTH_DOMAIN'],
  projectId: process.env['NX_APP_BITE_TRIBE_PROJECT_ID'],
  storageBucket: process.env['NX_APP_BITE_TRIBE_STORAGE_BUCKET'],
  messagingSenderId: process.env['NX_APP_BITE_TRIBE_MESSAGINX_SENDER_ID'],
};

export const provideBiteTribeStore = (environment: Environment) => [
  { provide: STORE_SERVICE, useClass: BiteTribeStoreService },
  provideStore(
    { router: routerReducer },
    {
      metaReducers: getMetaReducers(environment),
      runtimeChecks: {
        strictActionImmutability: true,
        strictStateImmutability: true,
      },
    }
  ),
  !environment.production
    ? provideStoreDevtools({
        trace: true,
        traceLimit: 10,
      })
    : [],
  provideRouterStore(),
  provideFirestoreState(),
  provideEffects(
    AuthEffects,
    RouterEffects,
    BiteEffects,
    LikeEffects,
    ReviewEffects,
    AppEffect,
    RestaurantEffects,
    MenuEffects
  ),
  provideState(fromBites.key, fromBites.reducer),
  provideState(fromReviews.key, fromReviews.reducer),
  provideState(fromLikes.key, fromLikes.reducer),
  provideState(fromApp.key, fromApp.reducer),
  provideState(fromRestaurants.key, fromRestaurants.reducer),
  provideState(fromMenus.key, fromMenus.reducer),
  provideFirestoreUtils(firebaseOptions),
];
