import { inject, Injectable } from '@angular/core';
import { ReviewApiService } from './review-api/review-api.service';
import { RestaurantApiService } from './restaurant-api/restaurant-api.service';
import {
  Bite,
  Bucketlist,
  CreateAndSaveToBucketListParams,
  Like,
  Link,
  Menu,
  PublicUser,
  RemoveBiteFromBucketlistParams,
  Restaurant,
  Review,
  SaveToBucketListParams,
  Settings,
} from 'model';
import { MenuApiService } from './menu-api/menu-api.service';
import { LikeApiService } from './like-api/like-api.service';
import { BucketlistApiService } from './bucketlist-api/bucketlist-api.service';
import { ProfileApiService } from './profile-api.service';
import { BiteApiService } from './bite-api/bite-api.service';
import { SettingsApiService } from './settings-api/settings-api.service';
import { ExchangeRatesApiService } from './exchange-rates-api.service';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BiteTribeApiService {
  private readonly biteApiService = inject(BiteApiService);
  private readonly likeApiService = inject(LikeApiService);
  private readonly reviewApiService = inject(ReviewApiService);
  private readonly restaurantApiService = inject(RestaurantApiService);
  private readonly menuApiService = inject(MenuApiService);
  private readonly bucketlistApiService = inject(BucketlistApiService);
  private readonly profileApiService = inject(ProfileApiService);
  private readonly settingsApiService = inject(SettingsApiService);
  private readonly exchangeRatesApiService = inject(ExchangeRatesApiService);

  publicProfile$ = this.profileApiService.publicProfile$;

  loadSettings(): Promise<Settings> {
    return this.settingsApiService.loadSettingsByUserId();
  }

  getExchangeRates(): Promise<Record<string, number>> {
    return this.exchangeRatesApiService.getExchangeRates();
  }

  saveNewReview(payload: { review: string; biteId: string }): void {
    this.reviewApiService.saveNewReview(payload);
  }

  reviewsByBiteId(biteId: string): Promise<Review[]> {
    return this.reviewApiService.reviewsByBiteId(biteId);
  }

  saveSocialMediaLinksForRestaurant(restaurantId: string, links: Link[]): void {
    this.restaurantApiService.saveSocialMediaLinksForRestaurant(
      restaurantId,
      links,
    );
  }

  saveNewRestaurant(restaurant: Restaurant): void {
    this.restaurantApiService.saveNewRestaurant(restaurant);
  }

  loadRestaurant(restaurantId: string): Promise<Restaurant | undefined> {
    return this.restaurantApiService.loadRestaurantById(restaurantId);
  }

  saveMenu(menu: Menu): void {
    this.menuApiService.saveMenu(menu);
  }

  loadMenu(menuId: string): Promise<Menu | undefined> {
    return this.menuApiService.loadMenu(menuId);
  }

  async removeLike(like: any): Promise<Like> {
    return this.likeApiService.removeLike(like);
  }

  saveLike(like: Like): Promise<Like | undefined> {
    return this.likeApiService.saveLike(like);
  }

  createBucketList(bucketlistName: any): Promise<void> {
    return this.bucketlistApiService.createBucketList(bucketlistName);
  }

  removeBiteFromBucketlist(
    params: RemoveBiteFromBucketlistParams,
  ): Promise<void> {
    return this.bucketlistApiService.removeBiteFromBucketlist(params);
  }

  createBucketListAndSaveBiteIdToBucketList(
    params: CreateAndSaveToBucketListParams,
  ): Promise<Bucketlist> {
    return this.bucketlistApiService.createBucketListAndSaveBiteIdToBucketList(
      params,
    );
  }

  saveBiteIdToBucketList(params: SaveToBucketListParams): Promise<Bucketlist> {
    return this.bucketlistApiService.saveBiteIdToBucketList(params);
  }

  async getUserByBiteId(bite: Bite | undefined): Promise<PublicUser | void> {
    return this.profileApiService.getUserByBiteId(bite);
  }

  async getUserById(biteCreatorId: string): Promise<PublicUser | void> {
    return this.profileApiService.getUserById(biteCreatorId);
  }

  saveEditedBite(bite: any): Promise<Bite> {
    return this.biteApiService.saveEditedBite(bite);
  }

  saveNewBite(bite: any): Promise<Bite> {
    return this.biteApiService.saveNewBite(bite);
  }

  updateUser(publicUser: PublicUser): Promise<PublicUser | undefined> {
    return this.profileApiService.updateUser(publicUser);
  }

  saveUser(): void {
    this.profileApiService.saveUser(true);
  }

  saveSettings(settings: Settings): void {
    this.settingsApiService.saveSettings(settings);
  }

  saveUserIfNotExisting(): void {
    this.profileApiService.saveUserIfNotExisting();
  }

  async followUser(user: PublicUser): Promise<void> {
    await this.profileApiService.followUser(user);
  }

  async unfollowUser(user: PublicUser): Promise<void> {
    await this.profileApiService.unfollowUser(user);
  }

  async bitesByPosition(position: GeolocationPosition): Promise<Bite[]> {
    return this.biteApiService.loadBitesByLocation(position);
  }

  async bitesByUser(userUid: string): Promise<Bite[]> {
    return this.biteApiService.loadBitesByUser(userUid);
  }

  async bitesByBucketlist(bucketlist: Bucketlist): Promise<Bite[]> {
    return this.biteApiService.loadBitesByBucketlist(bucketlist);
  }

  async deleteBite(bite: Bite): Promise<Bite> {
    return this.biteApiService.deleteBite(bite);
  }

  async loadLikesForBites(bites: Bite[]): Promise<Like[]> {
    return this.likeApiService.loadLikesForBites(bites);
  }

  restaurants(restaurantId: string): Promise<Restaurant | undefined> {
    return this.restaurantApiService.loadRestaurantById(restaurantId);
  }

  menus(menuId: string): Promise<Menu | undefined> {
    return this.menuApiService.loadMenu(menuId);
  }

  loadBucketlistsByUserId(uid: string): Promise<Bucketlist[]> {
    return this.bucketlistApiService.loadBucketlistsByUserId(uid);
  }

  latestBites$(number: number): Observable<Bite[]> {
    this.biteApiService.startlatestBitesListener(number);

    return this.biteApiService.latestBites$;
  }

  getTotalNumberOfUsers(): Observable<number> {
    return from(this.profileApiService.getTotalNumberOfUsers());
  }

  async fetchFollowMetadata(userId: string): Promise<{
    followers: number;
    following: number;
    isFollowedByMe: boolean;
  }> {
    const followers = await this.profileApiService.fetchFollowers(userId);
    const following = await this.profileApiService.fetchFollowing(userId);
    const isCurrentUserFollowing =
      await this.profileApiService.isCurrentUserFollowing(followers);

    return {
      followers: followers.length ?? 0,
      following: following.length ?? 0,
      isFollowedByMe: isCurrentUserFollowing,
    };
  }

  fetchFollowersWithDetails(userId: any): Promise<PublicUser[]> {
    return this.profileApiService.fetchFollowersWithDetails(userId);
  }

  fetchFollowingWithDetails(userId: any): Promise<PublicUser[]> {
    return this.profileApiService.fetchFollowingWithDetails(userId);
  }
}
