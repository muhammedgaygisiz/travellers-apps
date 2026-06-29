import { inject, Injectable } from '@angular/core';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { Bite, Like, PublicUser } from 'model';
import { PATH } from 'utils';
import { Location } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly dataAccess = inject(ProfileDataAccessService);
  private readonly navController = inject(NavController);
  private readonly location = inject(Location);

  isAuthenticated = this.dataAccess.isAuthenticated;
  myUser = this.dataAccess.myUser;
  user = this.dataAccess.user;
  userId = this.dataAccess.userId;
  bitesByUser = this.dataAccess.bitesByUser;
  biteTrailsByUser = this.dataAccess.biteTrailsByUser;
  myBites = this.dataAccess.myBites;
  myBiteTrails = this.dataAccess.myBiteTrails;
  isPublicProfile = this.dataAccess.isPublicProfile;
  profileMetadata = this.dataAccess.profileMetadata;

  logout(): void {
    this.dataAccess.logout();
  }

  gotoSettings(): void {
    this.navController.navigateForward(['settings']);
  }

  gotoMyBucketlists(): void {
    this.navController.navigateForward(['my-bucketlists']);
  }

  gotoMyBites(): void {
    this.navController.navigateForward(['my-bites']);
  }

  gotoEditProfile(): void {
    this.navController.navigateForward([PATH.EDIT_PROFILE]);
  }

  gotoMyProfileClicked(): void {
    this.navController.navigateForward(['my-profile']);
  }

  likeButtonClicked(likeClick: Like): void {
    this.dataAccess.submitLikeClick(likeClick);
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }

  saveProfile(publicUser: PublicUser): void {
    this.dataAccess.savePublicProfile(publicUser);

    this.location.back();
  }

  followButtonClicked(user: PublicUser): void {
    this.dataAccess.submitFollowClick(user);
  }

  unfollowButtonClicked(user: PublicUser): void {
    this.dataAccess.submitUnfollowClick(user);
  }

  gotoFollowers(userId: string): void {
    this.navController.navigateForward([PATH.FOLLOWERS, userId, 'followers']);
  }

  gotoFollowing(userId: string): void {
    this.navController.navigateForward([PATH.FOLLOWERS, userId, 'following']);
  }
}
