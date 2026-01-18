import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ProfileService } from '../profile.service';
import { ProfileDataAccessService } from 'bite-tribe/profile-data-access';
import { NavController } from '@ionic/angular/standalone';

class Mock {
  logout = (): null => null;
  navigateForward = (): null => null;
  submitLikeClick = (): null => null;
  submitFollowClick = (): null => null;
  savePublicProfile = (): null => null;
}

describe('ProfileService', () => {
  let service: ProfileService;
  let profileDataAccessService: ProfileDataAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProfileService,
        NavController,
        { provide: ProfileDataAccessService, useClass: Mock },
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

  describe('restaurantClicked', () => {
    it('should navigate to the correct restaurant by ID', () => {
      const bite = {
        id: 'bite123',
        restaurantId: '/restaurants/resto456',
      } as any;
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.restaurantClicked(bite);
      expect(navigateSpy).toHaveBeenCalledWith([
        'bite',
        'bite123',
        'restaurant',
        'resto456',
      ]);
    });

    it('should navigate to the correct restaurant by place name', () => {
      const bite = { id: 'bite123', place: 'Some Place' } as any;
      const navigateSpy = jest
        .spyOn(service['navController'], 'navigateForward')
        .mockImplementation();
      service.restaurantClicked(bite);
      expect(navigateSpy).toHaveBeenCalledWith([
        'bite',
        'bite123',
        'restaurant',
        encodeURIComponent('Some Place'),
      ]);
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
});
