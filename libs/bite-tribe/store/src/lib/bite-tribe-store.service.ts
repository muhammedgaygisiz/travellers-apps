import { inject, Injectable, signal } from '@angular/core';
import { Login, StoreService } from 'utils';
import { fromAuth } from 'ta-firestore';
import { createAction, props, Store } from '@ngrx/store';
import { BiteActions } from './bites/actions';
import { saveNewReview } from './reviews/actions';
import {
  allTags,
  bite,
  biteCreator,
  bites,
  bitesBySelectedBucketlist,
  bitesByUser,
  cachedBite,
  isReloadingBites,
  mybites,
  sortedHomeBites,
} from './bites/selectors';
import {
  restaurant,
  restaurants,
  restaurantToCreate,
} from './restaurants/selectors';
import { menu } from './menus/selectors';
import { saveMenu } from './menus/actions';
import {
  clearHomeFilters,
  goPrivate,
  goPublic,
  savePublicProfile,
  saveSettings,
  setHomeFilters,
  setHomeSorting,
} from './app/actions';
import { reviews } from './reviews/selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Bite,
  CreateAndSaveToBucketListParams,
  Like,
  Link,
  Menu,
  PublicUser,
  RemoveBiteFromBucketlistParams,
  Restaurant,
  SaveToBucketListParams,
  Settings,
} from 'model';
import {
  currency,
  exchangeRates,
  gpsPosition,
  homeDistance,
  homeFilters,
  homeSorting,
  isBitesLoading,
  isDarkTheme,
  isPublicProfile,
  maxPriceHome,
  preferredCurrency,
  publicUser,
  settings,
} from './app/selectors';
import { removeLike, saveLike } from './likes/actions';
import {
  saveNewRestaurant,
  saveSocialMediaLinksForRestaurant,
  setRestaurantToCreate,
} from './restaurants/actions';
import { bitesByRestaurant } from './bites/bites-by-restaurant.selector';
import {
  createAndSaveBiteIdToBucketList,
  createBucketList,
  removeBiteFromBucketlist,
  saveBiteIdToBucketList,
} from './bucketlists/actions';
import {
  bucketlists,
  selectedBucketlist,
  selectedBucketlistTitle,
} from './bucketlists/selectors';
import { fromBites } from './bites';

const unknownEntity = createAction(
  '[Unknown Entity]',
  props<{ docType: string }>(),
);

const getActionByDocType = (docType: string, entity: any): any => {
  switch (docType) {
    case 'bite': {
      if (entity.id) {
        return BiteActions.saveExistingBite({ bite: entity });
      }

      return BiteActions.saveNewBite({ bite: entity });
    }
    case 'restaurant': {
      return saveNewRestaurant({ restaurant: entity });
    }
    default: {
      return unknownEntity({ docType });
    }
  }
};

@Injectable({
  providedIn: 'root',
})
export class BiteTribeStoreService implements StoreService {
  store = inject(Store);

  loginFailed = toSignal(this.store.select(fromAuth.selectLoginFailed), {
    initialValue: false,
  });

  registrationError = signal('Not implemented yet.');

  bites$ = this.store.select(bites);
  sortedHomeBites$ = this.store.select(sortedHomeBites);
  homeSorting$ = this.store.select(homeSorting);
  bite$ = this.store.select(bite);
  mybites$ = this.store.select(mybites);
  bitesByUser$ = this.store.select(bitesByUser);
  bitesBySelectedBucketlist$ = this.store.select(bitesBySelectedBucketlist);
  allTags$ = this.store.select(allTags);
  bitesByRestaurant$ = this.store.select(bitesByRestaurant);
  restaurant$ = this.store.select(restaurant);
  restaurants$ = this.store.select(restaurants);
  menu$ = this.store.select(menu);
  reviews$ = this.store.select(reviews);
  bucketlists$ = this.store.select(bucketlists);
  currencyFromSettings$ = this.store.select(currency);
  restaurantToCreate$ = this.store.select(restaurantToCreate);
  exchangeRates$ = this.store.select(exchangeRates);
  preferedCurrency$ = this.store.select(preferredCurrency);
  maxPriceHome$ = this.store.select(maxPriceHome);
  isReloadingBites$ = this.store.select(isReloadingBites);
  darkTheme$ = this.store.select(isDarkTheme);

  userId$ = this.store.select(fromAuth.selectUserId);
  user$ = this.store.select(fromAuth.selectUser);
  settings$ = this.store.select(settings);
  isPublicProfile$ = this.store.select(isPublicProfile);
  publicUser$ = this.store.select(publicUser);
  position$ = this.store.select(gpsPosition);
  cachedBite$ = this.store.select(cachedBite);
  selectedBucketlist$ = this.store.select(selectedBucketlist);
  selectedBucketlistTitle$ = this.store.select(selectedBucketlistTitle);
  isAuthenticated$ = this.store.select(fromAuth.selectIsAuthenticated);
  biteCreator$ = this.store.select(biteCreator);
  isBitesLoading$ = this.store.select(isBitesLoading);
  homeFilters$ = this.store.select(homeFilters);
  homeDistance$ = this.store.select(homeDistance);

  loginWithGoogleAccount(): void {
    this.store.dispatch(fromAuth.loginWithGoogleAccount());
  }

  loginWithAppleAccount(): void {
    this.store.dispatch(fromAuth.loginWithAppleAccount());
  }

  login(authCreds: Login): void {
    this.store.dispatch(fromAuth.login({ authCreds }));
  }

  register(registration: Login): void {
    this.store.dispatch(fromAuth.register({ registration }));
  }

  confirmError(): void {
    throw new Error('Method not implemented.');
  }

  save(entity: any, docType: string): void {
    this.store.dispatch(getActionByDocType(docType, entity));
  }

  saveTags(newTagsArray: string[], id: string): void {
    this.store.dispatch(
      BiteActions.saveNewTags({
        newTags: newTagsArray,
        id,
      }),
    );
  }

  logout(): void {
    this.store.dispatch(fromAuth.logout());
  }

  submitLikeOrDislikeClick(
    bite: Bite | undefined | null,
    userId: string,
    likeType: { likeType: string; biteId: string },
  ): void {
    const likeFromUser = bite?.likes?.find(
      (like: Like) =>
        like.userId === userId && like.likeType === likeType.likeType,
    );

    if (likeFromUser) {
      this.removeLike(likeType);
      return;
    }

    this.submitLikeClick(likeType);
  }

  submitLikeClick(event: { likeType: string; biteId: string }): void {
    this.store?.dispatch(
      saveLike({
        ...event,
        createdAt: new Date().toISOString(),
      }),
    );
  }

  removeLike(event: { likeType: string; biteId: string }): void {
    this.store?.dispatch(removeLike({ like: event }));
  }

  saveSettings(settings: Settings): void {
    this.store.dispatch(saveSettings({ settings }));
  }

  savePublicProfile(publicUser: PublicUser): void {
    this.store.dispatch(savePublicProfile({ publicUser }));
  }

  saveReview(newReview: { review: string; biteId: string }): void {
    this.store.dispatch(saveNewReview(newReview));
  }

  selectRestaurantToCreate(restaurant: Restaurant): void {
    this.store.dispatch(setRestaurantToCreate({ restaurant }));
  }

  saveMenu(menu: Menu): void {
    this.store.dispatch(saveMenu({ menu }));
  }

  prepareBiteFromMenuItem(bite: Partial<Bite>): void {
    this.store.dispatch(BiteActions.cacheBite({ bite }));
  }

  saveSocialMediaLinks(restaurantId: string, links: Link[]): void {
    this.store.dispatch(
      saveSocialMediaLinksForRestaurant({
        restaurantId,
        links,
      }),
    );
  }

  saveToBucketList(saveToBucketlistParams: SaveToBucketListParams): void {
    this.store.dispatch(saveBiteIdToBucketList(saveToBucketlistParams));
  }

  createAndSaveToBucketList(params: CreateAndSaveToBucketListParams): void {
    this.store.dispatch(createAndSaveBiteIdToBucketList(params));
  }

  removeBiteFromBucketlist(params: RemoveBiteFromBucketlistParams): void {
    this.store.dispatch(removeBiteFromBucketlist(params));
  }

  submitDeleteBite(bite: Bite): void {
    this.store.dispatch(BiteActions.deleteBite({ bite }));
  }

  createBucketList(bucketlistName: string): void {
    this.store.dispatch(createBucketList({ bucketlistName }));
  }

  goPublic(): void {
    this.store.dispatch(goPublic());
  }

  goPrivate(): void {
    this.store.dispatch(goPrivate());
  }

  setHomeSorting(sorting: string): void {
    this.store.dispatch(setHomeSorting({ sorting }));
  }

  setHomeFilters(filters: {
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }): void {
    this.store.dispatch(setHomeFilters({ filters }));
  }

  clearHomeFilters(): void {
    this.store.dispatch(clearHomeFilters());
  }

  reloadBites(): void {
    this.store.dispatch(fromBites.reloadBites());
  }
}
