import { inject, Injectable } from '@angular/core';
import { ReviewApiService } from './review-api.service';
import { RestaurantApiService } from './restaurant-api.service';
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
import { MenuApiService } from './menu-api.service';
import { LikeApiService } from './like-api.service';
import { BucketlistApiService } from './bucketlist-api.service';
import { ProfileApiService } from './profile-api.service';
import { BiteApiService } from './bite-api.service';
import { SettingsApiService } from './settings-api.service';
import { ExchangeRatesApiService } from './exchange-rates-api.service';

@Injectable({
  providedIn: 'root',
})
export class BiteTribeApiService {
  private readonly reviewApiService = inject(ReviewApiService);
  private readonly restaurantApiService = inject(RestaurantApiService);
  private readonly menuApiService = inject(MenuApiService);
  private readonly likeApiService = inject(LikeApiService);
  private readonly bucketlistApiService = inject(BucketlistApiService);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly biteApiService = inject(BiteApiService);
  private readonly settingsApiService = inject(SettingsApiService);
  private readonly exchangeRatesApiService = inject(ExchangeRatesApiService);

  allRestaurants$ = this.restaurantApiService.allRestaurants$;
  allMenus$ = this.menuApiService.allMenus$;
  allLikes$ = this.likeApiService.allLikes$;
  allBucketlists$ = this.bucketlistApiService.allBucketlists$;
  allBites$ = this.biteApiService.allBites$;
  publicProfile$ = this.profileApiService.publicProfile$;
  settings$ = this.settingsApiService.settings$;

  getExchangeRates() {
    return this.exchangeRatesApiService.getExchangeRates();
  }

  saveNewReview(payload: { review: string; biteId: string }) {
    this.reviewApiService.saveNewReview(payload);
  }

  reviewsByBiteId(biteId: string) {
    return this.reviewApiService.reviewsByBiteId(biteId);
  }

  saveSocialMediaLinksForRestaurant(restaurantId: string, links: Link[]) {
    this.restaurantApiService.saveSocialMediaLinksForRestaurant(
      restaurantId,
      links
    );
  }

  saveNewRestaurant(restaurant: Restaurant) {
    this.restaurantApiService.saveNewRestaurant(restaurant);
  }

  loadRestaurant(restaurantId: string) {
    return this.restaurantApiService.loadRestaurant(restaurantId);
  }

  saveMenu(menu: Menu) {
    this.menuApiService.saveMenu(menu);
  }

  loadMenu(menuId: string) {
    return this.menuApiService.loadMenu(menuId);
  }

  async removeLike(like: any) {
    return this.likeApiService.removeLike(like);
  }

  saveLike(like: { likeType: string; biteId: string; createdAt: string }) {
    this.likeApiService.saveLike(like);
  }

  createBucketList(bucketlistName: any) {
    return this.bucketlistApiService.createBucketList(bucketlistName);
  }

  removeBiteFromBucketlist(params: RemoveBiteFromBucketlistParams) {
    return this.bucketlistApiService.removeBiteFromBucketlist(params);
  }

  createBucketListAndSaveBiteIdToBucketList(
    params: CreateAndSaveToBucketListParams
  ) {
    return this.bucketlistApiService.createBucketListAndSaveBiteIdToBucketList(
      params
    );
  }

  saveBiteIdToBucketList(params: SaveToBucketListParams) {
    return this.bucketlistApiService.saveBiteIdToBucketList(params);
  }

  getUserByBiteId(bite: Bite | undefined) {
    return this.profileApiService.getUserByBiteId(bite);
  }

  deleteBite(bite: any) {
    this.biteApiService.deleteBite(bite);
  }

  saveTagsToExistingBite(payload: { newTags: string[]; id: string }) {
    this.biteApiService.saveTagsToExistingBite(payload);
  }

  saveEditedBite(bite: any) {
    this.biteApiService.saveEditedBite(bite);
  }

  saveNewBite(bite: any) {
    this.biteApiService.saveNewBite(bite);
  }

  deleteUser() {
    this.profileApiService.deleteUser();
  }

  updateUser(publicUser: PublicUser) {
    this.profileApiService.updateUser(publicUser);
  }

  saveUser() {
    this.profileApiService.saveUser(true);
  }

  saveSettings(settings: Settings) {
    this.settingsApiService.saveSettings(settings);
  }

  saveUserIfNotExisting() {
    this.profileApiService.saveUserIfNotExisting();
  }
}
