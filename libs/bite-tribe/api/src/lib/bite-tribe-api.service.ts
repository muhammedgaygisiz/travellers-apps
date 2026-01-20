import { inject, Injectable } from '@angular/core';
import { ReviewApiService } from './review-api.service';
import { RestaurantApiService } from './restaurant-api.service';
import type {
  Bite,
  Bucketlist,
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
import { BiteApiService } from './bite-api/bite-api.service';
import { SettingsApiService } from './settings-api.service';
import { ExchangeRatesApiService } from './exchange-rates-api.service';
import { from, Observable, tap } from 'rxjs';

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

  publicProfile$ = this.profileApiService.publicProfile$;
  settings$ = this.settingsApiService.settings$.pipe(
    tap((settings) => {
      const theme = settings?.theme;

      if (theme) {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.classList.toggle('light', theme === 'light');
      }
    }),
  );

  getExchangeRates(): Promise<Record<string, number>> {
    return this.exchangeRatesApiService.getExchangeRates();
  }

  saveNewReview(payload: { review: string; biteId: string }): void {
    this.reviewApiService.saveNewReview(payload);
  }

  reviewsByBiteId(biteId: string): Observable<any[]> {
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

  loadRestaurant(restaurantId: string): Observable<Restaurant | undefined> {
    return this.restaurantApiService.loadRestaurant(restaurantId);
  }

  saveMenu(menu: Menu): void {
    this.menuApiService.saveMenu(menu);
  }

  loadMenu(menuId: string): Observable<Menu | undefined> {
    return this.menuApiService.loadMenu(menuId);
  }

  async removeLike(like: any): Promise<any> {
    return this.likeApiService.removeLike(like);
  }

  saveLike(like: {
    likeType: string;
    biteId: string;
    createdAt: string;
  }): void {
    this.likeApiService.saveLike(like);
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
  ): Promise<void> {
    return this.bucketlistApiService.createBucketListAndSaveBiteIdToBucketList(
      params,
    );
  }

  saveBiteIdToBucketList(params: SaveToBucketListParams): Promise<void> {
    return this.bucketlistApiService.saveBiteIdToBucketList(params);
  }

  getUserByBiteId(bite: Bite | undefined): Observable<any> {
    return this.profileApiService.getUserByBiteId(bite);
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

  likes$(): Observable<any[]> {
    this.likeApiService.startListener();

    return this.likeApiService.likes$;
  }

  restaurants$(): Observable<any[]> {
    this.restaurantApiService.startListener();

    return this.restaurantApiService.restaurants$;
  }

  menus$(): Observable<any[]> {
    this.menuApiService.startListener();

    return this.menuApiService.menus$;
  }

  bucketlists$(): Observable<any[]> {
    this.bucketlistApiService.startListener();

    return this.bucketlistApiService.bucketlists$;
  }

  latestBites$(number: number): Observable<Bite[]> {
    this.biteApiService.startlatestBitesListener(number);

    return this.biteApiService.latestBites$;
  }

  getTotalNumberOfBites(): Observable<number> {
    return from(this.biteApiService.getTotalNumberOfBites());
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
}
