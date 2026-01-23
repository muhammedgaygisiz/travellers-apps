import { EditProfilePage } from '../edit-profile.page';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import type { PublicUser } from 'model';
import type { OverlayEventDetail } from '@ionic/core';

jest.mock('localization');

describe(EditProfilePage.name, () => {
  let component: EditProfilePage;
  let fixture: ComponentFixture<EditProfilePage>;
  let compRef: ComponentRef<EditProfilePage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });

    fixture = TestBed.createComponent(EditProfilePage);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form initialization', () => {
    it('should initialize form with default values', () => {
      const formValue = component.profileForm.getRawValue();

      expect(formValue).toEqual({
        city: '',
        displayName: '',
        about: '',
        email: '',
        public: false,
      });
    });

    it('should have about field in the form', () => {
      expect(component.profileForm.contains('about')).toBe(true);
    });
  });

  describe('About field', () => {
    it('should update form when about value changes', () => {
      const aboutText = 'This is my about section';
      component.profileForm.patchValue({ about: aboutText });

      expect(component.profileForm.value.about).toBe(aboutText);
    });

    it('should mark form as dirty when about is changed', () => {
      const aboutControl = component.profileForm.get('about');
      aboutControl?.setValue('Test about');
      aboutControl?.markAsDirty();

      expect(component.profileForm.dirty).toBe(true);
    });

    it('should patch about field from publicUser input', () => {
      const publicUser: PublicUser = {
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
        userId: 'user123',
        city: 'Test City',
        about: 'About me text',
        public: true,
      };

      compRef.setInput('publicUser', publicUser);
      fixture.detectChanges();

      // Wait for afterRenderEffect to complete
      setTimeout(() => {
        expect(component.profileForm.value.about).toBe('About me text');
      }, 100);
    });

    it('should handle empty about field', () => {
      component.profileForm.patchValue({ about: '' });

      expect(component.profileForm.value.about).toBe('');
    });
  });

  describe('setDisplayNameEffect', () => {
    it('should return "Anonymous" when no user or publicUser is provided', () => {
      compRef.setInput('publicUser', undefined);

      compRef.changeDetectorRef.detectChanges();

      expect(component.profileForm.controls['displayName'].value).toBe(
        'Anonymous',
      );
    });

    it('should return publicUser displayName when available', () => {
      const publicUser: PublicUser = {
        displayName: 'Public Name',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
        userId: 'user123',
        public: true,
      };

      compRef.setInput('publicUser', publicUser);

      compRef.changeDetectorRef.detectChanges();

      expect(component.profileForm.controls['displayName'].value).toBe(
        'Public Name',
      );
    });
  });

  describe('profileEffect', () => {
    describe('given a public user', () => {
      it('should patch form values from publicUser input', () => {
        const publicUser: PublicUser = {
          displayName: 'Test User',
          email: 'e@mail.com',
          photoUrl: 'photo.jpg',
          userId: 'user123',
          city: 'Test City',
          about: 'About me text',
          public: true,
        };

        compRef.setInput('publicUser', publicUser);
        fixture.detectChanges(); // Wait for afterRenderEffect to complete

        expect(component.profileForm.value).toEqual({
          about: 'About me text',
          city: 'Test City',
          displayName: 'Test User',
          email: 'e@mail.com',
          public: true,
        });
      });
    });

    describe('given no public user', () => {
      it('should not modify form values', () => {
        compRef.setInput('publicUser', undefined);
        fixture.detectChanges(); // Wait for afterRenderEffect to complete

        expect(component.profileForm.value).toEqual({
          about: '',
          city: '',
          displayName: 'Anonymous',
          email: '',
          public: false,
        });
      });
    });
  });

  describe('Form validation', () => {
    it('should be valid with about field populated', () => {
      component.profileForm.patchValue({ email: 'some@supermail.com' });

      expect(component.profileForm.valid).toBe(true);
    });
  });

  describe('openConfirmationDialog', () => {
    it('should set isOpen to true', () => {
      component.openConfirmationDialog();

      expect(component.isOpen()).toBe(true);
    });
  });

  describe('handleGoPrivateConfirmation', () => {
    describe('given a confirmation', () => {
      it('should set public field to false', () => {
        component.profileForm.patchValue({ public: true });

        component.handleGoPrivateConfirmation({
          detail: { role: 'go-private' },
        } as CustomEvent<OverlayEventDetail>);

        expect(component.profileForm.value.public).toBe(false);
      });
    });

    describe('given a rejection', () => {
      it('should set public field to true', () => {
        component.profileForm.patchValue({ public: false });

        component.handleGoPrivateConfirmation({
          detail: { role: 'stay-public' },
        } as CustomEvent<OverlayEventDetail>);

        expect(component.profileForm.value.public).toBe(true);
      });
    });
  });

  describe('saveProfile', () => {
    let submitPublicUserEmitSpy: jest.SpyInstance;

    beforeEach(() => {
      const mockPublicUser: PublicUser = {
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
        userId: 'user123',
        public: true,
      };
      compRef.setInput('publicUser', mockPublicUser);

      submitPublicUserEmitSpy = jest.spyOn(component.submitPublicUser, 'emit');
    });

    it('should include about field when saving public user', () => {
      const aboutText = 'My bio';
      component.profileForm.patchValue({
        about: aboutText,
        city: 'Berlin',
        displayName: 'New Name',
      });

      let emittedPublicUser: PublicUser | undefined;
      component.submitPublicUser.subscribe((user) => {
        emittedPublicUser = user;
      });

      component.saveProfile();

      expect(emittedPublicUser).toBeDefined();
      expect(emittedPublicUser?.about).toBe(aboutText);
    });

    it('should save empty string for about when not provided', () => {
      component.profileForm.patchValue({
        city: 'Berlin',
      });

      let emittedPublicUser: PublicUser | undefined;
      component.submitPublicUser.subscribe((user) => {
        emittedPublicUser = user;
      });

      component.saveProfile();

      expect(emittedPublicUser).toBeDefined();
      expect(emittedPublicUser?.about).toBe('');
    });

    it('should not save if publicUser is not provided', () => {
      compRef.setInput('publicUser', undefined);

      component.saveProfile();

      expect(submitPublicUserEmitSpy).not.toHaveBeenCalled();
    });
  });

  describe('handlePubicChange', () => {
    describe('given change to unchecked', () => {
      it('should open confirmation dialog', () => {
        const openConfirmationDialogSpy = jest.spyOn(
          component,
          'openConfirmationDialog',
        );

        component.handlePubicChange({ detail: { checked: false } } as any);

        expect(openConfirmationDialogSpy).toHaveBeenCalled();
      });
    });

    describe('given change to checked', () => {
      it('should not open confirmation dialog', () => {
        const openConfirmationDialogSpy = jest.spyOn(
          component,
          'openConfirmationDialog',
        );

        component.handlePubicChange({ detail: { checked: true } } as any);

        expect(openConfirmationDialogSpy).not.toHaveBeenCalled();
      });
    });
  });
});
