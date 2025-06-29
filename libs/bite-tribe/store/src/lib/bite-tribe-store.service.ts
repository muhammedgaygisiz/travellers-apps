import { inject, Injectable, signal } from '@angular/core';
import { Login, StoreService } from 'utils';
import { fromAuth } from 'ta-firestore';
import { createAction, props, Store } from '@ngrx/store';
import {
  cacheBite,
  saveExistingBite,
  saveNewBite,
  saveTags,
  deleteBite,
} from './bites/actions';
import { saveNewReview } from './reviews/actions';
import { bite, bites, cachedBite, biteCreator } from './bites/selectors';
import {
  restaurant,
  restaurants,
  restaurantToCreate,
} from './restaurants/selectors';
import { menu } from './menus/selectors';
import { saveMenu } from './menus/actions';
import {
  goPrivate,
  goPublic,
  savePublicProfile,
  saveSettings,
} from './app/actions';
import { reviews } from './reviews/selectors';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Bite,
  CreateAndSaveToBucketListParams,
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
  gpsPosition,
  isBitesLoading,
  isPublicProfile,
  settings,
  publicUser,
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
  saveBiteIdToBucketList,
  removeBiteFromBucketlist,
  createBucketList,
} from './bucketlists/actions';
import { bucketlists, selectedBucketlist } from './bucketlists/selectors';

const unknownEntity = createAction(
  '[Unknown Entity]',
  props<{ docType: string }>()
);

const getActionByDocType = (docType: string, entity: any) => {
  switch (docType) {
    case 'bite': {
      if (entity.id) {
        return saveExistingBite({ bite: entity });
      }

      return saveNewBite({ bite: entity });
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
  bite$ = this.store.select(bite);
  bitesByRestaurant$ = this.store.select(bitesByRestaurant);
  restaurant$ = this.store.select(restaurant);
  restaurants$ = this.store.select(restaurants);
  menu$ = this.store.select(menu);
  reviews$ = this.store.select(reviews);
  bucketlists$ = this.store.select(bucketlists);
  currencyFromSettings$ = this.store.select(currency);
  restaurantToCreate$ = this.store.select(restaurantToCreate);

  userId$ = this.store.select(fromAuth.selectUserId);
  user$ = this.store.select(fromAuth.selectUser);
  settings$ = this.store.select(settings);
  isPublicProfile$ = this.store.select(isPublicProfile);
  publicUser$ = this.store.select(publicUser);
  position$ = this.store.select(gpsPosition);
  cachedBite$ = this.store.select(cachedBite);
  selectedBucketlist$ = this.store.select(selectedBucketlist);
  isAuthenticated$ = this.store.select(fromAuth.selectIsAuthenticated);
  biteCreator$ = this.store.select(biteCreator);
  isBitesLoading$ = this.store.select(isBitesLoading);

  loginWithGoogleAccount(): void {
    this.store.dispatch(fromAuth.loginWithGoogleAccount());
  }

  loginWithAppleAccount(): void {
    this.store.dispatch(fromAuth.loginWithAppleAccount());
  }

  loginWithFacebookAccount(): void {
    this.store.dispatch(fromAuth.loginWithFacebookAccount());
  }

  login(authCreds: Login): void {
    this.store?.dispatch(fromAuth.login({ authCreds }));
  }

  register(registration: Login): void {
    this.store?.dispatch(fromAuth.register({ registration }));
  }

  confirmError(): void {
    throw new Error('Method not implemented.');
  }

  save(entity: any, docType: string): void {
    this.store?.dispatch(getActionByDocType(docType, entity));
  }

  saveTags(newTagsArray: string[], id: string) {
    this.store.dispatch(
      saveTags({
        newTags: newTagsArray,
        id,
      })
    );
  }

  logout() {
    this.store?.dispatch(fromAuth.logout());
  }

  submitLikeClick(event: { likeType: string; biteId: string }) {
    this.store?.dispatch(
      saveLike({
        ...event,
        createdAt: new Date().toISOString(),
      })
    );
  }

  removeLike(event: { likeType: string; biteId: string }) {
    this.store?.dispatch(removeLike({ like: event }));
  }

  saveSettings(settings: Settings) {
    this.store.dispatch(saveSettings({ settings }));
  }

  savePublicProfile(publicUser: PublicUser) {
    this.store.dispatch(savePublicProfile({ publicUser }));
  }

  saveReview(newReview: { review: string; biteId: string }) {
    this.store.dispatch(saveNewReview(newReview));
  }

  selectRestaurantToCreate(restaurant: Restaurant) {
    this.store.dispatch(setRestaurantToCreate({ restaurant }));
  }

  saveMenu(menu: Menu) {
    this.store.dispatch(saveMenu({ menu }));
  }

  prepareBiteFromMenuItem(bite: Partial<Bite>) {
    this.store.dispatch(cacheBite({ bite }));
  }

  saveSocialMediaLinks(restaurantId: string, links: Link[]) {
    this.store.dispatch(
      saveSocialMediaLinksForRestaurant({
        restaurantId,
        links,
      })
    );
  }

  saveToBucketList(saveToBucketlistParams: SaveToBucketListParams) {
    this.store.dispatch(saveBiteIdToBucketList(saveToBucketlistParams));
  }

  createAndSaveToBucketList(params: CreateAndSaveToBucketListParams) {
    this.store.dispatch(createAndSaveBiteIdToBucketList(params));
  }

  removeBiteFromBucketlist(params: RemoveBiteFromBucketlistParams) {
    this.store.dispatch(removeBiteFromBucketlist(params));
  }

  submitDeleteBite(bite: Bite) {
    this.store.dispatch(deleteBite({ bite }));
  }

  createBucketList(bucketlistName: string) {
    this.store.dispatch(createBucketList({ bucketlistName }));
  }

  goPublic() {
    this.store.dispatch(goPublic());
  }

  goPrivate() {
    this.store.dispatch(goPrivate());
  }
}
