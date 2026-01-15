import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageSettings } from '../settings.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { PublicUser, Settings } from 'model';

jest.mock('localization');

describe(PageSettings.name, () => {
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
      });
    });

    it('should mark form as pristine initially', () => {
      expect(component.settingsForm.pristine).toBe(true);
    });
  });

  describe('saveSettings', () => {
    let submitSettingsEmitSpy: jest.SpyInstance;

    beforeEach(() => {
      const mockPublicUser: PublicUser = {
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
        userId: 'user123',
        public: true,
      };
      compRef.setInput('publicUser', mockPublicUser);

      submitSettingsEmitSpy = jest.spyOn(component.submitSettings, 'emit');
    });

    it('should emit submitSettings with form values', () => {
      const mockSettings: Settings = {
        pushNotifications: true,
        emailUpdates: false,
        theme: 'dark',
        currency: 'USD',
        nearby: 5000,
        updatedAt: '2024-01-01T00:00:00Z',
      };

      component.settingsForm.setValue({
        pushNotifications: mockSettings.pushNotifications,
        emailUpdates: mockSettings.emailUpdates,
        theme: mockSettings.theme,
        currency: mockSettings.currency,
        nearby: mockSettings.nearby,
      });

      component.saveSettings();

      expect(submitSettingsEmitSpy).toHaveBeenCalledTimes(1);
    });

    it('should not emit if form is invalid', () => {
      component.settingsForm.patchValue({ nearby: 0 }); // Invalid value

      component.saveSettings();

      expect(submitSettingsEmitSpy).not.toHaveBeenCalled();
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

  describe('Form validation', () => {
    it('should be valid with default values', () => {
      expect(component.settingsForm.valid).toBe(true);
    });

    it('should be invalid when nearby is less than 1', () => {
      component.settingsForm.patchValue({ nearby: 0 });

      expect(component.settingsForm.valid).toBe(false);
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
