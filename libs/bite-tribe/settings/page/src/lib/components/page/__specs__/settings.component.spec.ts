import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageSettings } from '../settings.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { PublicUser, Settings } from 'model';

jest.mock('localization');

describe('PageSettings', () => {
  let component: PageSettings;
  let fixture: ComponentFixture<PageSettings>;
  let compRef: ComponentRef<PageSettings>;

  beforeEach(() => {
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    TestBed.configureTestingModule({
      providers: [provideIonicAngular(getIonicConfig())],
    });
    fixture = TestBed.createComponent(PageSettings);
    component = fixture.componentInstance;
    compRef = fixture.componentRef;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form initialization', () => {
    it('should initialize form with default values', () => {
      const formValue = component.settingsForm.getRawValue();

      expect(formValue).toEqual({
        pushNotifications: false,
        emailUpdates: false,
        theme: 'light',
        currency: 'EUR',
        nearby: 2000,
        city: '',
        displayName: 'Anonymous',
        about: '',
      });
    });

    it('should have about field in the form', () => {
      expect(component.settingsForm.contains('about')).toBe(true);
    });

    it('should mark form as pristine initially', () => {
      expect(component.settingsForm.pristine).toBe(true);
    });
  });

  describe('About field', () => {
    it('should update form when about value changes', () => {
      const aboutText = 'This is my about section';
      component.settingsForm.patchValue({ about: aboutText });

      expect(component.settingsForm.value.about).toBe(aboutText);
    });

    it('should mark form as dirty when about is changed', () => {
      const aboutControl = component.settingsForm.get('about');
      aboutControl?.setValue('Test about');
      aboutControl?.markAsDirty();

      expect(component.settingsForm.dirty).toBe(true);
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
        expect(component.settingsForm.value.about).toBe('About me text');
      }, 100);
    });

    it('should handle empty about field', () => {
      component.settingsForm.patchValue({ about: '' });

      expect(component.settingsForm.value.about).toBe('');
    });
  });

  describe('saveSettings', () => {
    beforeEach(() => {
      const mockPublicUser: PublicUser = {
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
        userId: 'user123',
        public: true,
      };
      compRef.setInput('publicUser', mockPublicUser);
      compRef.setInput('isPublicProfile', true);
    });

    it('should include about field when saving public user', () => {
      const aboutText = 'My bio';
      component.settingsForm.patchValue({
        about: aboutText,
        city: 'Berlin',
        displayName: 'New Name',
      });

      let emittedPublicUser: PublicUser | undefined;
      component.submitPublicUser.subscribe((user) => {
        emittedPublicUser = user;
      });

      component.saveSettings();

      expect(emittedPublicUser).toBeDefined();
      expect(emittedPublicUser?.about).toBe(aboutText);
    });

    it('should save empty string for about when not provided', () => {
      component.settingsForm.patchValue({
        city: 'Berlin',
      });

      let emittedPublicUser: PublicUser | undefined;
      component.submitPublicUser.subscribe((user) => {
        emittedPublicUser = user;
      });

      component.saveSettings();

      expect(emittedPublicUser).toBeDefined();
      expect(emittedPublicUser?.about).toBe('');
    });

    it('should not save if form is invalid', () => {
      component.settingsForm.patchValue({ nearby: -1 }); // Invalid value
      component.settingsForm.markAsDirty();

      let submitCalled = false;
      component.submitPublicUser.subscribe(() => {
        submitCalled = true;
      });

      component.saveSettings();

      expect(submitCalled).toBe(false);
    });

    it('should emit settings without about field', () => {
      component.settingsForm.patchValue({
        theme: 'dark',
        currency: 'USD',
        nearby: 5000,
        about: 'This should not be in settings',
      });

      let emittedSettings: Settings | undefined;
      component.submitSettings.subscribe((settings) => {
        emittedSettings = settings;
      });

      component.saveSettings();

      expect(emittedSettings).toBeDefined();
      expect(emittedSettings).not.toHaveProperty('about');
      expect(emittedSettings?.theme).toBe('dark');
      expect(emittedSettings?.currency).toBe('USD');
    });
  });

  describe('displayName computed', () => {
    it('should return "Anonymous" when no user or publicUser is provided', () => {
      expect(component.displayName()).toBe('Anonymous');
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

      expect(component.displayName()).toBe('Public Name');
    });
  });

  describe('settingsEffect', () => {
    it('should patch form with settings when settings input is provided', () => {
      const mockSettings: Settings = {
        pushNotifications: true,
        emailUpdates: true,
        theme: 'dark',
        currency: 'USD',
        nearby: 3000,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      compRef.setInput('settings', mockSettings);
      fixture.detectChanges();

      // Wait for afterRenderEffect
      setTimeout(() => {
        expect(component.settingsForm.value.theme).toBe('dark');
        expect(component.settingsForm.value.currency).toBe('USD');
        expect(component.settingsForm.value.nearby).toBe(3000);
      }, 100);
    });
  });

  describe('userImage computed', () => {
    it('should return undefined when no user is provided', () => {
      expect(component.userImage()).toBeUndefined();
    });

    it('should return photoUrl from user when available', () => {
      const user = {
        photoUrl: 'https://example.com/photo.jpg',
        providerData: [],
      };

      compRef.setInput('user', user);

      expect(component.userImage()).toBe('https://example.com/photo.jpg');
    });

    it('should return photoUrl from providerData when user photoUrl is not available', () => {
      const user = {
        photoUrl: null,
        providerData: [{ photoUrl: 'https://example.com/provider-photo.jpg' }],
      };

      compRef.setInput('user', user);

      expect(component.userImage()).toBe(
        'https://example.com/provider-photo.jpg',
      );
    });
  });

  describe('Form validation', () => {
    it('should be valid with default values', () => {
      expect(component.settingsForm.valid).toBe(true);
    });

    it('should be invalid when nearby is less than 1', () => {
      component.settingsForm.patchValue({ nearby: 0 });

      expect(component.settingsForm.valid).toBe(false);
    });

    it('should be valid with about field populated', () => {
      component.settingsForm.patchValue({ about: 'Some text' });

      expect(component.settingsForm.valid).toBe(true);
    });
  });

  describe('openConfirmationDialog', () => {
    it('should set isOpen to true', () => {
      component.openConfirmationDialog();

      expect(component.isOpen()).toBe(true);
    });
  });

  describe('handleGoPrivateConfirmation', () => {
    it('should emit goPrivate when role is GO_PRIVATE', () => {
      let emitted = false;
      component.goPrivate.subscribe(() => {
        emitted = true;
      });

      const event = {
        detail: { role: 'go-private' },
      } as CustomEvent<{ role: string }>;

      component.handleGoPrivateConfirmation(event);

      expect(emitted).toBe(true);
      expect(component.isOpen()).toBe(false);
    });

    it('should not emit goPrivate when role is STAY_PUBLIC', () => {
      let emitted = false;
      component.goPrivate.subscribe(() => {
        emitted = true;
      });

      const event = {
        detail: { role: 'stay-public' },
      } as CustomEvent<{ role: string }>;

      component.handleGoPrivateConfirmation(event);

      expect(emitted).toBe(false);
      expect(component.isOpen()).toBe(false);
    });
  });

  describe('onThemeChange', () => {
    it('should toggle dark class when theme is dark', () => {
      const event = { detail: { value: 'dark' } };

      component.onThemeChange(event);

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should toggle light class when theme is light', () => {
      const event = { detail: { value: 'light' } };

      component.onThemeChange(event);

      expect(document.documentElement.classList.contains('light')).toBe(true);
    });

    it('should not throw error when event detail value is empty', () => {
      const event = { detail: { value: '' } };

      expect(() => component.onThemeChange(event)).not.toThrow();
    });
  });
});
