import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfileComponent } from '../profile.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';

jest.mock('localization');

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let compRef: ComponentRef<ProfileComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('biteCount', () => {
    it('should return 0 if bites is undefined', () => {
      compRef.setInput('bites', undefined);

      expect(component.biteCount()).toBe(0);
    });

    it('should return the length of bites if bites is defined', () => {
      const bitesArray = [{}, {}, {}];
      compRef.setInput('bites', bitesArray);

      expect(component.biteCount()).toBe(bitesArray.length);
    });
  });

  describe('badgeColor', () => {
    it('should return "green" if biteCount is between 50 and 99', () => {
      compRef.setInput('bites', new Array(75));

      expect(component.badgeColor()).toBe('green');
    });

    it('should return "bronze" if biteCount is between 100 and 999', () => {
      compRef.setInput('bites', new Array(150));

      expect(component.badgeColor()).toBe('bronze');
    });

    it('should return "silver" if biteCount is between 1000 and 10000', () => {
      compRef.setInput('bites', new Array(1001));

      expect(component.badgeColor()).toBe('silver');
    });

    it('should return "gold" if biteCount is 10000 or more', () => {
      compRef.setInput('bites', new Array(10001));

      expect(component.badgeColor()).toBe('gold');
    });

    it('should return empty if biteCount is less than 50', () => {
      compRef.setInput('bites', new Array(30));

      expect(component.badgeColor()).toBe('');
    });
  });

  describe('isUnfollowedUser', () => {
    const userMock = { userId: 'user1', allowFollow: true } as any;
    beforeEach(() => {
      compRef.setInput('user', userMock);
      compRef.setInput('userId', userMock.userId);
    });

    it('should return false if current user is me', () => {
      expect(component.isUnfollowedUser()).toBe(false);
    });

    it('should return true if current user in not me', () => {
      compRef.setInput('userId', 'user2');
      expect(component.isUnfollowedUser()).toBe(true);
    });

    it('should return false if profile owner in not defined', () => {
      compRef.setInput('user', undefined);
      expect(component.isUnfollowedUser()).toBe(false);
    });

    it('should return false if profile owners userId in not defined', () => {
      compRef.setInput('user', {} as any);
      expect(component.isUnfollowedUser()).toBe(false);
    });

    it('should return false if allowFollow is false', () => {
      compRef.setInput('user', { userId: 'user1', allowFollow: false } as any);
      compRef.setInput('userId', 'user2');
      expect(component.isUnfollowedUser()).toBe(false);
    });

    it('should return false if allowFollow is undefined', () => {
      compRef.setInput('user', { userId: 'user1' } as any);
      compRef.setInput('userId', 'user2');
      expect(component.isUnfollowedUser()).toBe(false);
    });
  });

  describe('validPhotoUrl', () => {
    beforeEach(() => {
      compRef.setInput('user', { photoUrl: 'http://localhost:4200' } as any);
      component.imageLoadErrored.set(false);
    });

    it('should return true if photoUrl is provided and loaded correctly', () => {
      expect(component.validPhotoUrl()).toBe(true);
    });

    it('should return false if photoUrl is missing', () => {
      compRef.setInput('user', {} as any);
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

  describe('onFollow', () => {
    it('should emit followClick with user when user is defined', () => {
      const userMock = { userId: 'user1' } as any;
      compRef.setInput('user', userMock);
      const followClickSpy = jest.spyOn(component.followButtonClick, 'emit');

      component.onFollow();

      expect(followClickSpy).toHaveBeenCalledWith(userMock);
    });

    it('should not emit followClick when user is undefined', () => {
      compRef.setInput('user', undefined);
      const followClickSpy = jest.spyOn(component.followButtonClick, 'emit');

      component.onFollow();

      expect(followClickSpy).not.toHaveBeenCalled();
    });
  });
});
