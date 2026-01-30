import { inject, Injectable, signal } from '@angular/core';
import { Login, StoreService } from 'utils';
import { fromAuth } from 'ta-firestore';
import { Store } from '@ngrx/store';
import { BiteActions } from './bites/actions';
import { saveNewReview } from './reviews/actions';
import {
  allTags,
  bite,
  bites,
  bitesBySelectedBucketlist,
  bitesByUser,
  cachedBite,
  mybites,
  nearbyRestaurants,
  sortedHomeBites,
  sortedMyBites,
  tagSuggestionsForEditingBite,
} from './bites/selectors';
import {
  restaurant,
  restaurants,
  restaurantToCreate,
} from './restaurants/selectors';
import { menu } from './menus/selectors';
import { MenuActions } from './menus/actions';
import { AppActions } from './app/actions';
import { reviews } from './reviews/selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import type {
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
  hasErrorLoadingGpsPosition,
  isBitesLoading,
  isDarkTheme,
  isFollowersLoading,
  isPublicProfile,
  isReloadingHome,
  preferredCurrency,
  profileMeatadata,
  publicUser,
  settings,
  totalNumberBites,
  totalNumberUsers,
  userHasSubscriptionTierOne,
} from './app/selectors';
import {
  bucketlistSorting,
  homeDistance,
  homeFilters,
  homeMaxPriceFilter,
  homeSorting,
  myBitesSorting,
} from './filtering-and-sorting/selectors';
import { removeLike, saveLike } from './likes/actions';
import {
  saveSocialMediaLinksForRestaurant,
  setRestaurantToCreate,
} from './restaurants/actions';
import { bitesByRestaurant } from './bites/bites-by-restaurant.selector';
import { BucketlistActions } from './bucketlists/actions';
import {
  bucketlists,
  selectedBucketlist,
  selectedBucketlistTitle,
  sortedBucketlists,
} from './bucketlists/selectors';
import { getActionByDocType } from './utils/get-action-by-doc-type';
import { FilteringAndSortingActions } from './filtering-and-sorting/actions';
import { followType } from './router/selectors';
import { userByUrlParam, userByUserIdInBite, users } from './users/selectors';

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
  nearbyRestaurants$ = this.store.select(nearbyRestaurants);
  tagSuggestionsForEditingBite$ = this.store.select(
    tagSuggestionsForEditingBite,
  );
  sortedHomeBites$ = this.store.select(sortedHomeBites);
  sortedBucketlists$ = this.store.select(sortedBucketlists);
  homeSorting$ = this.store.select(homeSorting);
  bucketlistSorting$ = this.store.select(bucketlistSorting);
  bite$ = this.store.select(bite);
  sortedMyBites$ = this.store.select(sortedMyBites);
  mybites$ = this.store.select(mybites);
  myBitesSorting$ = this.store.select(myBitesSorting);
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
  maxPriceHome$ = this.store.select(homeMaxPriceFilter);
  isReloadingHome$ = this.store.select(isReloadingHome);
  hasErrorLoadingGpsPosition$ = this.store.select(hasErrorLoadingGpsPosition);
  darkTheme$ = this.store.select(isDarkTheme);

  userId$ = this.store.select(fromAuth.selectUserId);
  user$ = this.store.select(fromAuth.selectUser);
  userHasSubscriptionTierOne$ = this.store.select(userHasSubscriptionTierOne);
  settings$ = this.store.select(settings);
  isPublicProfile$ = this.store.select(isPublicProfile);
  publicUser$ = this.store.select(publicUser);
  position$ = this.store.select(gpsPosition);
  cachedBite$ = this.store.select(cachedBite);
  selectedBucketlist$ = this.store.select(selectedBucketlist);
  selectedBucketlistTitle$ = this.store.select(selectedBucketlistTitle);
  isAuthenticated$ = this.store.select(fromAuth.selectIsAuthenticated);
  biteCreator$ = this.store.select(userByUserIdInBite);
  isBitesLoading$ = this.store.select(isBitesLoading);
  homeFilters$ = this.store.select(homeFilters);
  homeDistance$ = this.store.select(homeDistance);
  totalNumberBites$ = this.store.select(totalNumberBites);
  totalNumberUsers$ = this.store.select(totalNumberUsers);
  profileMeatadata$ = this.store.select(profileMeatadata);
  userByUrlParam$ = this.store.select(userByUrlParam);

  users$ = this.store.select(users);
  type$ = this.store.select(followType);
  isFollowersLoading$ = this.store.select(isFollowersLoading);

  bucketlist = toSignal(this.store.select(selectedBucketlist));
  user = toSignal(this.user$);
  biteCreator = toSignal(this.biteCreator$);
  followType = toSignal(this.type$);

  loginWithGoogleAccount(): void {
    this.store.dispatch(fromAuth.AuthActions.loginWithGoogleAccount());
  }

  loginWithAppleAccount(): void {
    this.store.dispatch(fromAuth.AuthActions.loginWithAppleAccount());
  }

  login(authCreds: Login): void {
    this.store.dispatch(fromAuth.AuthActions.login({ authCreds }));
  }

  register(registration: Login): void {
    this.store.dispatch(
      fromAuth.AuthActions.registerWithEmail({ registration }),
    );
  }

  confirmError(): void {
    throw new Error('Method not implemented.');
  }

  save(entity: any, docType: string): void {
    this.store.dispatch(getActionByDocType(docType, entity));
  }

  setEditingBite(bite: Partial<Bite>): void {
    this.store.dispatch(BiteActions.setEditingBite({ bite }));
  }

  logout(): void {
    this.store.dispatch(fromAuth.AuthActions.logout());
  }

  submitLikeOrDislikeClick(
    bite: Bite | undefined | null,
    userId: string,
    likeType: Like,
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

  submitLikeClick(event: Like): void {
    this.store?.dispatch(
      saveLike({
        like: {
          ...event,
          createdAt: new Date().toISOString(),
        },
      }),
    );
  }

  removeLike(event: Like): void {
    this.store?.dispatch(removeLike({ like: event }));
  }

  saveSettings(settings: Settings): void {
    this.store.dispatch(AppActions.saveSettings({ settings }));
  }

  savePublicProfile(profile: PublicUser): void {
    this.store.dispatch(AppActions.savePublicProfile({ profile }));
  }

  saveReview(newReview: { review: string; biteId: string }): void {
    this.store.dispatch(saveNewReview(newReview));
  }

  selectRestaurantToCreate(restaurant: Restaurant): void {
    this.store.dispatch(setRestaurantToCreate({ restaurant }));
  }

  saveMenu(menu: Menu): void {
    this.store.dispatch(MenuActions.saveMenu({ menu }));
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
    this.store.dispatch(
      BucketlistActions.saveBiteToBucketlist(saveToBucketlistParams),
    );
  }

  createAndSaveToBucketList(params: CreateAndSaveToBucketListParams): void {
    this.store.dispatch(
      BucketlistActions.createAndSaveBiteIdToBucketlist(params),
    );
  }

  removeBiteFromBucketlist(params: RemoveBiteFromBucketlistParams): void {
    this.store.dispatch(BucketlistActions.removeBiteFromBucketlist(params));
  }

  submitDeleteBite(bite: Bite): void {
    this.store.dispatch(BiteActions.deleteBite({ bite }));
  }

  createBucketList(bucketlistName: string): void {
    this.store.dispatch(BucketlistActions.createBucketlist({ bucketlistName }));
  }

  setHomeSorting(sorting: string): void {
    this.store.dispatch(FilteringAndSortingActions.setHomeSorting({ sorting }));
  }

  setMyBitesSorting(sorting: string): void {
    this.store.dispatch(
      FilteringAndSortingActions.setMyBitesSorting({ sorting }),
    );
  }

  setHomeFilters(filters: {
    tagFilters: string[];
    distanceFilter: string;
    priceFilter: number;
  }): void {
    this.store.dispatch(FilteringAndSortingActions.setHomeFilters({ filters }));
  }

  clearHomeFilters(): void {
    this.store.dispatch(FilteringAndSortingActions.clearHomeFilters());
  }

  reloadGPSPosition(): void {
    this.store.dispatch(AppActions.reloadGPSPosition());
  }

  clearGpsError(): void {
    this.store.dispatch(AppActions.clearGPSError());
  }

  setBucketlistSorting(sorting: string): void {
    this.store.dispatch(
      FilteringAndSortingActions.setBucketlistSorting({ sorting }),
    );
  }

  followUser(user: PublicUser): void {
    this.store.dispatch(AppActions.followUser({ user }));
  }

  unfollowUser(user: PublicUser): void {
    this.store.dispatch(AppActions.unfollowUser({ user }));
  }

  startLoadingFollowersData(): void {
    this.store.dispatch(AppActions.startLoadingFollowersData());
  }

  stopLoadingFollowersData(): void {
    this.store.dispatch(AppActions.stopLoadingFollowersData());
  }
}
