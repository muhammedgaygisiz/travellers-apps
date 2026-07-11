import { inject, Injectable } from '@angular/core';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { NavController } from '@ionic/angular/standalone';
import type { PageMenuTarget } from 'common/ui/page';
import type { Bite, LikeClick, PublicUser } from 'model';
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

  onMenuNavigate(target: PageMenuTarget): void {
    switch (target) {
      case 'settings':
        this.gotoSettings();
        break;
      case 'profile':
        this.gotoMyProfileClicked();
        break;
      case 'my-bites':
        this.gotoMyBites();
        break;
      case 'my-bucketlists':
        this.gotoMyBucketlists();
        break;
    }
  }

  likeButtonClicked(likeClick: LikeClick): void {
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
