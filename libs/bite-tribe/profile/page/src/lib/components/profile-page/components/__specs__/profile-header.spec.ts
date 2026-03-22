import { ProfileHeader } from '../profile-header';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { PublicUser } from 'model';

describe(ProfileHeader.name, () => {
  let component: ProfileHeader;
  let fixture: ComponentFixture<ProfileHeader>;
  let compRef: ComponentRef<ProfileHeader>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileHeader);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
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
});
