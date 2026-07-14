import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ProfileService } from '../profile.service';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { NavController } from '@ionic/angular/standalone';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';

class Mock {
  logout = jest.fn();
  navigateForward = jest.fn();
  submitLikeClick = jest.fn();
  submitFollowClick = jest.fn();
  savePublicProfile = jest.fn();
  submitUnfollowClick = jest.fn();
  emailVerificationPromptVisible = jest.fn(() => false);
  resendEmailVerification = jest.fn().mockResolvedValue(undefined);
}

class AnalyticsMock {
  logEvent = jest.fn();
}

class ToastControllerMock {
  create = jest.fn().mockResolvedValue({ present: jest.fn() });
}

class TranslocoMock {
  translate = jest.fn((key: string) => key);
}

describe(ProfileService.name, () => {
  let service: ProfileService;
  let profileDataAccessService: ProfileDataAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        NavController,
        { provide: ProfileDataAccessService, useClass: Mock },
        { provide: AnalyticsService, useClass: AnalyticsMock },
        { provide: ToastController, useClass: ToastControllerMock },
        { provide: TranslocoService, useClass: TranslocoMock },
        provideMockStore(),
      ],
    }).compileComponents();
    service = TestBed.inject(ProfileService);
    profileDataAccessService = TestBed.inject(ProfileDataAccessService);
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  describe('logout', () => {
    it('should call logout on dataAccess', () => {
      const logoutSpy = jest.spyOn(profileDataAccessService, 'logout');
      service.logout();
      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  describe('goToSettings', () => {
    it('should navigate to settings', () => {
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.gotoSettings();
      expect(navigateSpy).toHaveBeenCalledWith(['settings']);
    });
  });

  describe('gotoMyBucketlists', () => {
    it('should navigate to my-bucketlists', () => {
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.gotoMyBucketlists();
      expect(navigateSpy).toHaveBeenCalledWith(['my-bucketlists']);
    });
  });

  describe('gotoMyBites', () => {
    it('should navigate to my-bites', () => {
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.gotoMyBites();
      expect(navigateSpy).toHaveBeenCalledWith(['my-bites']);
    });
  });

  describe('gotoEditProfile', () => {
    it('should navigate to edit-profile', () => {
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.gotoEditProfile();
      expect(navigateSpy).toHaveBeenCalledWith(['edit-profile']);
    });
  });

  describe('gotoMyProfileClicked', () => {
    it('should navigate to my-profile', () => {
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.gotoMyProfileClicked();
      expect(navigateSpy).toHaveBeenCalledWith(['my-profile']);
    });
  });

  describe('likeButtonClicked', () => {
    it('should call submitLikeClick on dataAccess with correct parameters', () => {
      const likeClick = { likeType: 'like', biteId: '123' };
      const submitLikeClickSpy = jest.spyOn(
        profileDataAccessService,
        'submitLikeClick',
      );
      service.likeButtonClicked(likeClick);
      expect(submitLikeClickSpy).toHaveBeenCalledWith(likeClick);
    });
  });

  describe('biteClicked', () => {
    it('should navigate to the correct bite', () => {
      const bite = { id: 'bite123' } as any;
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.biteClicked(bite);
      expect(navigateSpy).toHaveBeenCalledWith(['bite', 'bite123']);
    });
  });

  describe('saveProfile', () => {
    it('should call savePublicProfile on dataAccess with correct parameters', () => {
      const publicUser = { id: 'user123' } as any;
      const savePublicProfileSpy = jest.spyOn(
        profileDataAccessService,
        'savePublicProfile',
      );
      service.saveProfile(publicUser);
      expect(savePublicProfileSpy).toHaveBeenCalledWith(publicUser);
    });
  });

  describe('followButtonClicked', () => {
    it('should call submitFollowClick on dataAccess with correct parameters', () => {
      const user = { id: 'user123' } as any;
      const submitFollowClickSpy = jest.spyOn(
        profileDataAccessService,
        'submitFollowClick',
      );
      service.followButtonClicked(user);
      expect(submitFollowClickSpy).toHaveBeenCalledWith(user);
    });
  });

  describe('unfollowButtonClicked', () => {
    it('should call submitUnfollowClick on dataAccess with correct parameters', () => {
      const user = { id: 'user123' } as any;
      const submitUnfollowClickSpy = jest.spyOn(
        profileDataAccessService,
        'submitUnfollowClick',
      );
      service.unfollowButtonClicked(user);
      expect(submitUnfollowClickSpy).toHaveBeenCalledWith(user);
    });
  });

  describe('gotoFollowers', () => {
    it('should navigate to the correct followers page', () => {
      const userId = 'user123';
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.gotoFollowers(userId);
      expect(navigateSpy).toHaveBeenCalledWith([
        'followers',
        userId,
        'followers',
      ]);
    });
  });

  describe('gotoFollowing', () => {
    it('should navigate to the correct following page', () => {
      const userId = 'user123';
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.gotoFollowing(userId);
      expect(navigateSpy).toHaveBeenCalledWith([
        'followers',
        userId,
        'following',
      ]);
    });
  });

  describe('email verification prompt analytics', () => {
    it('should log prompt shown when the prompt is visible', () => {
      jest
        .spyOn(profileDataAccessService, 'emailVerificationPromptVisible')
        .mockReturnValue(true);
      const analytics = TestBed.inject(AnalyticsService);

      service.trackEmailVerificationPromptShown('profile_edit');

      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationPromptShown,
        { surface: 'profile_edit' },
      );
    });

    it('should send resend analytics around the backend call', async () => {
      const analytics = TestBed.inject(AnalyticsService);

      await service.resendEmailVerification('profile_edit');

      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationResendTapped,
        { surface: 'profile_edit' },
      );
      expect(analytics.logEvent).toHaveBeenCalledWith(
        AnalyticsEvent.EmailVerificationResendSucceeded,
        { surface: 'profile_edit' },
      );
    });
  });
});
