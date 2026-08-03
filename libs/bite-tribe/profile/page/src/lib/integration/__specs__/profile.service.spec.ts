import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ProfileService } from '../profile.service';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { LocalImagePickerService } from 'bite-tribe-common/bite';
import { NavController } from '@ionic/angular/standalone';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { EmailVerificationService } from 'bite-tribe/email-verification-data-access';
import { Bite, PublicUser } from 'model';

const emailVerificationMock = {
  promptVisible: jest.fn(() => false),
  resendRunning: jest.fn(() => false),
  trackPromptShown: jest.fn(),
  resend: jest.fn().mockResolvedValue(undefined),
};

const toastPresent = jest.fn().mockResolvedValue(undefined);
const toastControllerMock = {
  create: jest.fn().mockResolvedValue({ present: toastPresent }),
};

const translocoMock = {
  translate: jest.fn((key: string) => key),
};

class Mock {
  logout = jest.fn();
  navigateForward = jest.fn();
  submitLikeClick = jest.fn();
  submitFollowClick = jest.fn();
  savePublicProfile = jest.fn();
  submitUnfollowClick = jest.fn();
  claimDisplayName = jest.fn().mockResolvedValue({
    displayName: '',
    normalizedDisplayName: '',
  });
  myUser = jest.fn((): PublicUser | undefined => undefined);
  isAuthenticated = jest.fn(() => false);
}

const mockBiteDataAccessService = {
  findLocalImageForBite: jest.fn().mockResolvedValue(undefined),
  retryImageUpload: jest.fn().mockResolvedValue(undefined),
};

const mockLocalImagePicker = {
  pick: jest.fn().mockResolvedValue(undefined),
};

describe(ProfileService.name, () => {
  let service: ProfileService;
  let profileDataAccessService: ProfileDataAccessService;

  beforeEach(() => {
    emailVerificationMock.promptVisible.mockReturnValue(false);
    emailVerificationMock.trackPromptShown.mockReset();
    emailVerificationMock.resend.mockReset().mockResolvedValue(undefined);
    toastControllerMock.create.mockClear();
    toastPresent.mockClear();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: BiteDataAccessService,
          useValue: mockBiteDataAccessService,
        },
        {
          provide: LocalImagePickerService,
          useValue: mockLocalImagePicker,
        },
        ProfileService,
        NavController,
        { provide: ProfileDataAccessService, useClass: Mock },
        { provide: EmailVerificationService, useValue: emailVerificationMock },
        { provide: ToastController, useValue: toastControllerMock },
        { provide: TranslocoService, useValue: translocoMock },
        provideMockStore(),
      ],
    }).compileComponents();
    service = TestBed.inject(ProfileService);
    profileDataAccessService = TestBed.inject(ProfileDataAccessService);
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  describe('isMyProfileLoading', () => {
    it('should be loading while an authenticated user has no profile yet', () => {
      (profileDataAccessService.isAuthenticated as jest.Mock).mockReturnValue(
        true,
      );
      (profileDataAccessService.myUser as jest.Mock).mockReturnValue(undefined);

      expect(service.isMyProfileLoading()).toBe(true);
    });

    it('should not be loading once the profile arrived', () => {
      (profileDataAccessService.isAuthenticated as jest.Mock).mockReturnValue(
        true,
      );
      (profileDataAccessService.myUser as jest.Mock).mockReturnValue({
        displayName: 'Mo',
      } as PublicUser);

      expect(service.isMyProfileLoading()).toBe(false);
    });

    it('should not be loading when the user is not authenticated', () => {
      (profileDataAccessService.isAuthenticated as jest.Mock).mockReturnValue(
        false,
      );
      (profileDataAccessService.myUser as jest.Mock).mockReturnValue(undefined);

      expect(service.isMyProfileLoading()).toBe(false);
    });
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
      const bite = { id: 'bite123' } as unknown as Bite;
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.biteClicked(bite);
      expect(navigateSpy).toHaveBeenCalledWith(['bite', 'bite123']);
    });
  });

  describe('saveProfile', () => {
    it('should save the profile without claiming when the display name is unchanged', async () => {
      const publicUser = { id: 'user123' } as unknown as PublicUser;
      const savePublicProfileSpy = jest.spyOn(
        profileDataAccessService,
        'savePublicProfile',
      );
      const claimSpy = jest.spyOn(profileDataAccessService, 'claimDisplayName');

      await service.saveProfile(publicUser);

      expect(claimSpy).not.toHaveBeenCalled();
      expect(savePublicProfileSpy).toHaveBeenCalledWith(publicUser);
    });

    it('should claim a changed display name before saving', async () => {
      const publicUser = { displayName: 'NewName' } as unknown as PublicUser;
      const savePublicProfileSpy = jest.spyOn(
        profileDataAccessService,
        'savePublicProfile',
      );
      const claimSpy = jest.spyOn(profileDataAccessService, 'claimDisplayName');

      await service.saveProfile(publicUser);

      expect(claimSpy).toHaveBeenCalledWith('NewName');
      expect(savePublicProfileSpy).toHaveBeenCalledWith(publicUser);
    });

    it('should show a localized error and not save when the display name is taken', async () => {
      const publicUser = { displayName: 'Taken' } as unknown as PublicUser;
      jest
        .spyOn(profileDataAccessService, 'claimDisplayName')
        .mockRejectedValueOnce({ message: 'display_name_taken' });
      const savePublicProfileSpy = jest.spyOn(
        profileDataAccessService,
        'savePublicProfile',
      );

      await service.saveProfile(publicUser);

      expect(savePublicProfileSpy).not.toHaveBeenCalled();
      expect(translocoMock.translate).toHaveBeenCalledWith(
        'display-name-already-taken',
      );
      expect(toastControllerMock.create).toHaveBeenCalled();
      expect(toastPresent).toHaveBeenCalled();
    });
  });

  describe('followButtonClicked', () => {
    it('should call submitFollowClick on dataAccess with correct parameters', () => {
      const user = { id: 'user123' } as unknown as PublicUser;
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
      const user = { id: 'user123' } as unknown as PublicUser;
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

  describe('email verification', () => {
    it('should expose the shared prompt-visible signal', () => {
      expect(service.emailVerificationPromptVisible).toBe(
        emailVerificationMock.promptVisible,
      );
    });

    it('should expose the shared resend-running signal', () => {
      expect(service.emailVerificationResendRunning).toBe(
        emailVerificationMock.resendRunning,
      );
    });

    it('should delegate prompt tracking to the email verification service', () => {
      service.trackEmailVerificationPromptShown('profile_edit');

      expect(emailVerificationMock.trackPromptShown).toHaveBeenCalledWith(
        'profile_edit',
      );
    });

    it('should delegate resend to the email verification service', async () => {
      await service.resendEmailVerification('profile_edit');

      expect(emailVerificationMock.resend).toHaveBeenCalledWith('profile_edit');
    });
  });
});
