import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageSettings } from '../settings.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { PublicUser, Settings } from 'model';

const setupMockForWindowMatchMedia = (value?: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: value ?? false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

describe(PageSettings.name, () => {
  let component: PageSettings;
  let fixture: ComponentFixture<PageSettings>;
  let compRef: ComponentRef<PageSettings>;

  beforeEach(() => {
    // Mock window.matchMedia
    setupMockForWindowMatchMedia(false);

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

    it('should emit currency from form if provided', () => {
      const mockCurrency = 'JPY';

      component.settingsForm.patchValue({ currency: mockCurrency });

      component.saveSettings();

      expect(submitSettingsEmitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ currency: mockCurrency }),
      );
    });

    it('should emit default currency if none provided in form', () => {
      component.settingsForm.patchValue({ currency: '' });

      jest.spyOn(component.settingsForm, 'valid', 'get').mockReturnValue(true);

      component.saveSettings();

      expect(submitSettingsEmitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ currency: 'EUR' }),
      );
    });

    it('should emit nearby from form if provided', () => {
      const mockNearby = 1500;

      component.settingsForm.patchValue({ nearby: mockNearby });

      component.saveSettings();

      expect(submitSettingsEmitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ nearby: mockNearby }),
      );
    });

    it('should emit default nearby if none provided in form', () => {
      component.settingsForm.patchValue({ nearby: undefined as any });

      jest.spyOn(component.settingsForm, 'valid', 'get').mockReturnValue(true);

      component.saveSettings();

      expect(submitSettingsEmitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ nearby: 50 }),
      );
    });
  });

  describe('calculateTheme', () => {
    describe('given no theme', () => {
      it('should return dark when systemTheme is dark', () => {
        component.systemTheme.set('dark');

        expect(component.calculateTheme(null)).toBe('dark');
      });

      it('should return light when systemTheme is light', () => {
        component.systemTheme.set('light');

        expect(component.calculateTheme(null)).toBe('light');
      });
    });

    describe('given a theme', () => {
      it('should return dark when theme is dark', () => {
        expect(component.calculateTheme('dark')).toBe('dark');
      });

      it('should return light when theme is light', () => {
        expect(component.calculateTheme('light')).toBe('light');
      });
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

  describe('onCurrencySelected', () => {
    it('should patch currency in the form and dismiss modal', () => {
      const mockCurrencyCode = 'GBP';
      const mockModal = {
        dismiss: jest.fn(),
      } as any;

      component.onCurrencySelected(mockCurrencyCode, mockModal);

      expect(component.settingsForm.value.currency).toBe(mockCurrencyCode);
      expect(mockModal.dismiss).toHaveBeenCalled();
    });
  });

  describe('handleSystemThemeChange', () => {
    it('should set systemTheme signal on call', () => {
      const mockEvent = { matches: true } as MediaQueryListEvent;

      component.handleSystemThemeChange(mockEvent);

      expect(component.systemTheme()).toBe('dark');
    });
  });

  describe('getTheme', () => {
    it('should return dark when matches is true', () => {
      expect(component.getTheme(true)).toBe('dark');
    });

    it('should return light when matches is false', () => {
      expect(component.getTheme(false)).toBe('light');
    });
  });

  describe('Subscription Tier', () => {
    it('should default to free tier (0) when publicUser has no subscriptionTier', () => {
      const mockPublicUser: PublicUser = {
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
        userId: 'user123',
      };
      compRef.setInput('publicUser', mockPublicUser);
      fixture.detectChanges();

      expect(component.subscriptionTier()).toBe(0);
      expect(component.isFreeUser()).toBe(true);
      expect(component.isProUser()).toBe(false);
    });

    it('should identify free user when subscriptionTier is 0', () => {
      const mockPublicUser: PublicUser = {
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
        userId: 'user123',
        subscriptionTier: 0,
      };
      compRef.setInput('publicUser', mockPublicUser);
      fixture.detectChanges();

      expect(component.subscriptionTier()).toBe(0);
      expect(component.isFreeUser()).toBe(true);
      expect(component.isProUser()).toBe(false);
    });

    it('should identify pro user when subscriptionTier is 1', () => {
      const mockPublicUser: PublicUser = {
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
        userId: 'user123',
        subscriptionTier: 1,
      };
      compRef.setInput('publicUser', mockPublicUser);
      fixture.detectChanges();

      expect(component.subscriptionTier()).toBe(1);
      expect(component.isFreeUser()).toBe(false);
      expect(component.isProUser()).toBe(true);
    });

    it('should identify pro user when subscriptionTier is greater than 1', () => {
      const mockPublicUser: PublicUser = {
        displayName: 'Test User',
        email: 'test@example.com',
        photoUrl: 'photo.jpg',
        userId: 'user123',
        subscriptionTier: 2,
      };
      compRef.setInput('publicUser', mockPublicUser);
      fixture.detectChanges();

      expect(component.subscriptionTier()).toBe(2);
      expect(component.isFreeUser()).toBe(false);
      expect(component.isProUser()).toBe(true);
    });

    it('should handle undefined publicUser', () => {
      compRef.setInput('publicUser', undefined);
      fixture.detectChanges();

      expect(component.subscriptionTier()).toBe(0);
      expect(component.isFreeUser()).toBe(true);
      expect(component.isProUser()).toBe(false);
    });
  });
});
