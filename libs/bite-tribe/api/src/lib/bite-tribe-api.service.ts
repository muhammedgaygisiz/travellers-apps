import { inject, Injectable } from '@angular/core';
import { ReviewApiService } from './review-api/review-api.service';
import { RestaurantApiService } from './restaurant-api/restaurant-api.service';
import {
  Address,
  Bite,
  BiteTrail,
  Bucketlist,
  CreateAndSaveToBucketListParams,
  CreateAndUploadImageCallbackParams,
  CreateBucketListFromBiteTrailParams,
  DaySchedule,
  Geopoint,
  GooglePlace,
  Like,
  Link,
  Menu,
  PlaceDetails,
  PublicUser,
  RemoveBiteFromBucketlistParams,
  Restaurant,
  Review,
  SaveToBucketListParams,
  Settings,
  WeekRange,
  WeeklyBites,
} from 'model';
import { MenuApiService } from './menu-api/menu-api.service';
import { LikeApiService } from './like-api/like-api.service';
import { BucketlistApiService } from './bucketlist-api/bucketlist-api.service';
import { ProfileApiService } from './profile-api.service';
import { BiteApiService } from './bite-api/bite-api.service';
import { SettingsApiService } from './settings-api/settings-api.service';
import { ExchangeRatesApiService } from './exchange-rates-api.service';
import { BiteTrailApiService } from './bite-trail-api/bite-trail-api.service';
import { Observable } from 'rxjs';

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
  private readonly biteTrailApiService = inject(BiteTrailApiService);

  publicProfile$ = this.profileApiService.publicProfile$;

  loadSettings(): Promise<Settings> {
    return this.settingsApiService.loadSettingsByUserId();
  }

  getExchangeRates(): Promise<Record<string, number>> {
    return this.exchangeRatesApiService.getExchangeRates();
  }

  saveNewReview(payload: {
    review: string;
    biteId: string;
  }): Promise<Review[]> {
    return this.reviewApiService.saveNewReview(payload);
  }

  reviewsByBiteId(biteId: string): Promise<Review[]> {
    return this.reviewApiService.reviewsByBiteId(biteId);
  }

  saveSocialMediaLinksForRestaurant(
    restaurantId: string,
    links: Link[],
  ): Promise<void> {
    return this.restaurantApiService.saveSocialMediaLinksForRestaurant(
      restaurantId,
      links,
    );
  }

  saveDescriptionForRestaurant(
    restaurantId: string,
    description: string,
  ): Promise<void> {
    return this.restaurantApiService.saveDescriptionForRestaurant(
      restaurantId,
      description,
    );
  }

  saveOpeningHoursForRestaurant(
    restaurantId: string,
    openingHours: DaySchedule[],
  ): Promise<void> {
    return this.restaurantApiService.saveOpeningHoursForRestaurant(
      restaurantId,
      openingHours,
    );
  }

  saveAddressForRestaurant(
    restaurantId: string,
    address: Address,
  ): Promise<void> {
    return this.restaurantApiService.saveAddressForRestaurant(
      restaurantId,
      address,
    );
  }

  savePositionForRestaurant(
    restaurantId: string,
    position: Geopoint,
  ): Promise<void> {
    return this.restaurantApiService.savePositionForRestaurant(
      restaurantId,
      position,
    );
  }

  saveNewRestaurant(restaurant: Restaurant): void {
    this.restaurantApiService.saveNewRestaurant(restaurant);
  }

  saveRestaurantImage(restaurantId: string, image: string): Promise<void> {
    return this.restaurantApiService.saveRestaurantImage(restaurantId, image);
  }

  createBiteTrail(
    trailData: Omit<
      BiteTrail,
      | 'id'
      | 'createdAt'
      | 'createdAtTimestamp'
      | 'updatedAt'
      | 'updatedAtTimestamp'
    >,
  ): Promise<void> {
    return this.biteTrailApiService.createBiteTrail(trailData);
  }

  loadRestaurant(restaurantId: string): Promise<Restaurant | undefined> {
    return this.restaurantApiService.loadRestaurantById(restaurantId);
  }

  createMenuForRestaurant(restaurantId: string): Promise<string> {
    return this.restaurantApiService.createMenuForRestaurant(restaurantId);
  }

  saveMenu(menu: Menu): void {
    this.menuApiService.saveMenu(menu);
  }

  loadMenu(menuId: string): Promise<Menu | undefined> {
    return this.menuApiService.loadMenu(menuId);
  }

  async removeLike(like: Like): Promise<Like> {
    return this.likeApiService.removeLike(like);
  }

  saveLike(like: Like): Promise<Like | undefined> {
    return this.likeApiService.saveLike(like);
  }

  createBucketList(bucketlistName: string): Promise<void> {
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

  saveEditedBite(bite: Bite): Promise<Bite> {
    return this.biteApiService.saveEditedBite(bite);
  }

  saveNewBite(biteWithoutImage: Omit<Bite, 'image'>): Promise<Bite> {
    return this.biteApiService.saveNewBite(biteWithoutImage);
  }

  uploadImage(
    bite: Bite,
    callbackFn: (p: CreateAndUploadImageCallbackParams) => void,
  ): Promise<void> {
    return this.biteApiService.uploadImage(bite, callbackFn);
  }

  uploadProfileImage(
    profile: PublicUser,
    callbackFn: (p: CreateAndUploadImageCallbackParams) => void,
  ): Promise<void> {
    return this.profileApiService.uploadImage(profile, callbackFn);
  }

  updateImagePathInBite(bite: Bite, imagePath: string): Promise<Bite> {
    return this.biteApiService.updateImagePathInBite(bite, imagePath);
  }

  updatePhotoUrlInUser(
    profile: PublicUser,
    photoUrl: string,
  ): Promise<PublicUser> {
    return this.profileApiService.updatePhotoUrlInUser(profile, photoUrl);
  }

  updateUser(publicUser: PublicUser): Promise<PublicUser> {
    return this.profileApiService.updateUser(publicUser);
  }

  saveUser(): void {
    this.profileApiService.saveUser(true);
  }

  markOnboardingComplete(version: number): Promise<void> {
    return this.profileApiService.markOnboardingComplete(version);
  }

  saveSettings(settings: Settings): Promise<void> {
    return this.settingsApiService.saveSettings(settings);
  }

  updateLastSeen(): Promise<void> {
    return this.profileApiService.updateLastSeen();
  }

  updateUserMetadata(): Promise<void> {
    return this.profileApiService.updateUserMetadata();
  }

  syncEmailVerificationStatus(): Promise<
    Pick<
      PublicUser,
      | 'emailVerified'
      | 'emailVerificationRequired'
      | 'emailVerificationProvider'
      | 'emailVerificationReminderCount'
      | 'emailVerificationLastSentAt'
      | 'emailVerificationLastSentAtTimestamp'
      | 'emailVerificationManualLastSentAt'
      | 'emailVerificationManualLastSentAtTimestamp'
    >
  > {
    return this.profileApiService.syncEmailVerificationStatus();
  }

  resendEmailVerification(): Promise<void> {
    return this.profileApiService.resendEmailVerification();
  }

  claimDisplayName(
    displayName: string,
  ): Promise<{ displayName: string; normalizedDisplayName: string }> {
    return this.profileApiService.claimDisplayName(displayName);
  }

  checkDisplayNameAvailability(
    displayName: string,
  ): Promise<{ available: boolean; normalizedDisplayName: string }> {
    return this.profileApiService.checkDisplayNameAvailability(displayName);
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

  async getCurrencyByPosition(
    position?: Geopoint,
  ): Promise<string | undefined> {
    return this.biteApiService.getCurrencyByPosition(position);
  }

  async bitesByUser(userUid: string): Promise<Bite[]> {
    return this.biteApiService.loadBitesByUser(userUid);
  }

  async weeklyBites(range?: WeekRange): Promise<WeeklyBites | undefined> {
    return this.biteApiService.loadWeeklyBites(range);
  }

  async searchPlaces(
    searchText: string,
    position?: Geopoint,
  ): Promise<GooglePlace[]> {
    return this.biteApiService.searchPlaces(searchText, position);
  }

  async searchNearbyPlaces(position: Geopoint): Promise<GooglePlace[]> {
    return this.biteApiService.searchNearbyPlaces(position);
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails | undefined> {
    return this.biteApiService.getPlaceDetails(placeId);
  }

  async biteById(biteId: string): Promise<Bite> {
    return this.biteApiService.loadBiteById(biteId);
  }

  async bitesByBucketlist(bucketlist: Bucketlist): Promise<Bite[]> {
    return this.biteApiService.loadBitesByBucketlist(bucketlist);
  }

  async deleteBite(bite: Bite): Promise<Bite> {
    return this.biteApiService.deleteBite(bite);
  }

  async loadLikesForBites(bites: Bite[], userId: string): Promise<Like[]> {
    return this.likeApiService.loadLikesForBites(bites, userId);
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

  deleteBucketlist(bucketlistId: string): Promise<void> {
    return this.bucketlistApiService.deleteBucketlist(bucketlistId);
  }

  updateBucketlistName(bucketlistId: string, name: string): Promise<void> {
    return this.bucketlistApiService.updateBucketlistName(bucketlistId, name);
  }

  updateBucketlistTriedOutStatus(params: {
    bucketlistId: string;
    biteId: string;
    checked: boolean;
  }): Promise<void> {
    return this.bucketlistApiService.updateBucketlistTriedOutStatus(params);
  }

  createBucketListFromBiteTrail(
    params: CreateBucketListFromBiteTrailParams,
  ): Promise<Bucketlist> {
    return this.bucketlistApiService.createBucketListFromBiteTrail(params);
  }

  latestBites$(number: number): Observable<Bite[]> {
    void this.biteApiService.startlatestBitesListener(number);

    return this.biteApiService.latestBites$;
  }

  async fetchFollowMetadata(userId: string): Promise<{
    followers: number;
    following: number;
    isFollowedByMe: boolean;
  }> {
    // Prefer the aggregate counts stored on the user document over loading the
    // whole followers/following subcollections, mirroring how `biteCount` is
    // preferred on the profile. The subcollections are only read when the
    // aggregates are missing (e.g. a user not yet backfilled).
    const user = await this.profileApiService.getUserById(userId);
    const followersCount = user?.followersCount;
    const followingCount = user?.followingCount;

    if (
      typeof followersCount === 'number' &&
      typeof followingCount === 'number'
    ) {
      const isFollowedByMe =
        await this.profileApiService.isFollowedByCurrentUser(userId);

      return {
        followers: followersCount,
        following: followingCount,
        isFollowedByMe,
      };
    }

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

  fetchFollowersWithDetails(userId: string): Promise<PublicUser[]> {
    return this.profileApiService.fetchFollowersWithDetails(userId);
  }

  fetchFollowingWithDetails(userId: string): Promise<PublicUser[]> {
    return this.profileApiService.fetchFollowingWithDetails(userId);
  }
}
