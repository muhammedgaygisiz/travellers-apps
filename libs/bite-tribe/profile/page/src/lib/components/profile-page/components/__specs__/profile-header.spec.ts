import { ProfileHeader } from '../profile-header';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { PublicUser } from 'model';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(ProfileHeader.name, () => {
  let component: ProfileHeader;
  let fixture: ComponentFixture<ProfileHeader>;
  let compRef: ComponentRef<ProfileHeader>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });
    fixture = TestBed.createComponent(ProfileHeader);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
  });

  /** GitHub issue #1953. */
  describe('photo upload status', () => {
    const owner = (photoStatus?: PublicUser['photoStatus']): PublicUser =>
      ({ userId: 'me', photoUrl: 'old.jpg', photoStatus }) as PublicUser;

    it('blurs the new photo under the status on the own profile', () => {
      compRef.setInput('user', owner('failed'));
      compRef.setInput('showPhotoStatus', true);
      compRef.setInput('pendingPhoto', 'data:new');

      expect(component.photoInFlight()).toBe(true);
      expect(component.statusPhoto()).toBe('data:new');
    });

    it('falls back to the previous photo when this device has no new one', () => {
      compRef.setInput('user', owner('pending'));
      compRef.setInput('showPhotoStatus', true);

      expect(component.photoInFlight()).toBe(true);
      expect(component.statusPhoto()).toBeUndefined();
    });

    it("shows nothing of it on somebody else's profile", () => {
      compRef.setInput('user', owner('failed'));
      compRef.setInput('pendingPhoto', 'data:new');

      expect(component.photoInFlight()).toBe(false);
      expect(component.statusPhoto()).toBeUndefined();
    });

    it('shows nothing once the photo landed', () => {
      compRef.setInput('user', owner('uploaded'));
      compRef.setInput('showPhotoStatus', true);
      compRef.setInput('pendingPhoto', 'data:new');

      expect(component.photoInFlight()).toBe(false);
    });
  });

  describe('badgeColor', () => {
    it('should return "green" if biteCount is between 50 and 99', () => {
      compRef.setInput('biteCount', 75);

      expect(component.badgeColor()).toBe('green');
    });

    it('should return "bronze" if biteCount is between 100 and 999', () => {
      compRef.setInput('biteCount', 150);

      expect(component.badgeColor()).toBe('bronze');
    });

    it('should return "silver" if biteCount is between 1000 and 10000', () => {
      compRef.setInput('biteCount', 1001);

      expect(component.badgeColor()).toBe('silver');
    });

    it('should return "gold" if biteCount is 10000 or more', () => {
      compRef.setInput('biteCount', 10001);

      expect(component.badgeColor()).toBe('gold');
    });

    it('should return empty if biteCount is less than 50', () => {
      compRef.setInput('biteCount', 30);

      expect(component.badgeColor()).toBe('');
    });
  });

  describe('validPhotoUrl', () => {
    beforeEach(() => {
      compRef.setInput('user', {
        photoUrl: 'http://localhost:4200',
      } as PublicUser);
      component.imageLoadErrored.set(false);
    });

    it('should return true if photoUrl is provided and loaded correctly', () => {
      expect(component.validPhotoUrl()).toBe(true);
    });

    it('should return false if photoUrl is missing', () => {
      compRef.setInput('user', {} as PublicUser);
      expect(component.validPhotoUrl()).toBe(false);
    });

    it('should return false if user is missing', () => {
      compRef.setInput('user', undefined);
      expect(component.validPhotoUrl()).toBe(false);
    });

    it('should return false if image load has errored', () => {
      component.imageLoadErrored.set(true);
      expect(component.validPhotoUrl()).toBe(false);
    });
  });

  describe('onImageError', () => {
    it('should set imageLoadErrored to true', () => {
      component.imageLoadErrored.set(false);
      component.onImageError();
      expect(component.imageLoadErrored()).toBe(true);
    });
  });

  describe('handleFollowingClick', () => {
    it('should emit followingClick with userId', () => {
      jest.spyOn(component.followingClick, 'emit');
      compRef.setInput('user', { userId: '123' } as PublicUser);
      compRef.setInput('followingCount', 1);

      component.handleFollowingClick();

      expect(component.followingClick.emit).toHaveBeenCalledWith('123');
    });

    it('should not emit followingClick if followingCount is 0', () => {
      jest.spyOn(component.followingClick, 'emit');
      compRef.setInput('user', { userId: '123' } as PublicUser);
      compRef.setInput('followingCount', 0);

      component.handleFollowingClick();

      expect(component.followingClick.emit).not.toHaveBeenCalled();
    });

    it('should not emit followingClick if userId is missing', () => {
      jest.spyOn(component.followingClick, 'emit');
      compRef.setInput('user', {} as PublicUser);
      compRef.setInput('followingCount', 1);

      component.handleFollowingClick();

      expect(component.followingClick.emit).not.toHaveBeenCalled();
    });

    it('should not render followingCount as clickable if it is 0', () => {
      compRef.setInput('followingCount', 0);

      fixture.detectChanges();

      const clickableCount = fixture.nativeElement.querySelector(
        '.clickable',
      ) as HTMLElement | null;

      expect(clickableCount).toBeNull();
    });
  });

  describe('handleFollowersClick', () => {
    it('should emit followersClick with userId', () => {
      jest.spyOn(component.followersClick, 'emit');
      compRef.setInput('user', { userId: '123' } as PublicUser);
      compRef.setInput('followerCount', 1);

      component.handleFollowersClick();

      expect(component.followersClick.emit).toHaveBeenCalledWith('123');
    });

    it('should not emit followersClick if followerCount is 0', () => {
      jest.spyOn(component.followersClick, 'emit');
      compRef.setInput('user', { userId: '123' } as PublicUser);
      compRef.setInput('followerCount', 0);

      component.handleFollowersClick();

      expect(component.followersClick.emit).not.toHaveBeenCalled();
    });

    it('should not emit followersClick if userId is missing', () => {
      jest.spyOn(component.followersClick, 'emit');
      compRef.setInput('user', {} as PublicUser);
      compRef.setInput('followerCount', 1);

      component.handleFollowersClick();

      expect(component.followersClick.emit).not.toHaveBeenCalled();
    });
  });
});
