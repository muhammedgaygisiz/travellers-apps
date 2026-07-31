import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PageSettings, PushInstallationView } from '../settings.component';
import { IonModal, provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { ComponentRef } from '@angular/core';
import { PublicUser, Settings } from 'model';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

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

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(PageSettings.name, () => {
  let component: PageSettings;
  let fixture: ComponentFixture<PageSettings>;
  let compRef: ComponentRef<PageSettings>;

  beforeEach(() => {
    // Mock window.matchMedia
    setupMockForWindowMatchMedia(false);

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
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
        emailUpdates: false,
        theme: 'light',
        currency: 'EUR',
        favoriteCurrencies: [],
        language: 'en',
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
        location: false,
        emailUpdates: false,
        theme: 'dark',
        currency: 'USD',
        favoriteCurrencies: ['USD', 'EUR'],
        nearby: 5000,
        updatedAt: '2024-01-01T00:00:00Z',
        language: 'de',
      };

      component.settingsForm.setValue({
        emailUpdates: mockSettings.emailUpdates,
        theme: mockSettings.theme,
        currency: mockSettings.currency,
        favoriteCurrencies: mockSettings.favoriteCurrencies || [],
        language: mockSettings.language,
      });

      component.saveSettings();

      expect(submitSettingsEmitSpy).toHaveBeenCalledTimes(1);
    });

    it('should keep the location grant this page has no control for', () => {
      // The settings write replaces the document, so the grant recorded by
      // onboarding has to survive a save made from this form (#1023).
      compRef.setInput('settings', {
        location: true,
        emailUpdates: true,
        theme: 'dark',
        currency: 'USD',
        favoriteCurrencies: [],
        language: 'de',
      } satisfies Settings);
      fixture.detectChanges();

      component.saveSettings();

      expect(submitSettingsEmitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ location: true }),
      );
    });

    it('should not emit if form is invalid', () => {
      component.settingsForm.patchValue({ currency: undefined }); // Invalid value

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

    it('should emit favorite currencies from form', () => {
      component.settingsForm.patchValue({ favoriteCurrencies: ['USD', 'GBP'] });

      component.saveSettings();

      expect(submitSettingsEmitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ favoriteCurrencies: ['USD', 'GBP'] }),
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
        location: true,
        emailUpdates: true,
        theme: 'dark',
        currency: 'USD',
        favoriteCurrencies: ['USD'],
        nearby: 3000,
        updatedAt: '2024-01-01T00:00:00Z',
        language: 'de',
      };

      compRef.setInput('settings', mockSettings);
      fixture.detectChanges();

      // Wait for afterRenderEffect
      setTimeout(() => {
        expect(component.settingsForm.value.theme).toBe('dark');
        expect(component.settingsForm.value.currency).toBe('USD');
        expect(component.settingsForm.value.favoriteCurrencies).toEqual([
          'USD',
        ]);
      }, 100);
    });
  });

  describe('Form validation', () => {
    it('should be valid with default values', () => {
      expect(component.settingsForm.valid).toBe(true);
    });

    it('should be invalid when currency is undefined', () => {
      component.settingsForm.patchValue({ currency: undefined });

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
      } as unknown as IonModal;

      component.onCurrencySelected(mockCurrencyCode, mockModal);

      expect(component.settingsForm.value.currency).toBe(mockCurrencyCode);
      expect(mockModal.dismiss).toHaveBeenCalled();
    });
  });

  describe('onFavoriteCurrencyToggle', () => {
    it('should add currency to favorite currencies when missing', () => {
      component.settingsForm.patchValue({ favoriteCurrencies: ['EUR'] });

      component.onFavoriteCurrencyToggle('USD');

      expect(component.settingsForm.value.favoriteCurrencies).toEqual([
        'EUR',
        'USD',
      ]);
    });

    it('should remove currency from favorite currencies when present', () => {
      component.settingsForm.patchValue({ favoriteCurrencies: ['EUR', 'USD'] });

      component.onFavoriteCurrencyToggle('USD');

      expect(component.settingsForm.value.favoriteCurrencies).toEqual(['EUR']);
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

  describe('Push installations', () => {
    const installation = (
      overrides: Partial<PushInstallationView> = {},
    ): PushInstallationView => ({
      token: 'token-1',
      label: 'iPhone',
      details: 'iOS 26.5 · 1.0.1 (88)',
      enabled: true,
      isCurrentDevice: false,
      ...overrides,
    });

    const setInstallations = (
      installations: PushInstallationView[],
      permission = 'prompt',
    ): void => {
      compRef.setInput('pushInstallations', installations);
      compRef.setInput('pushPermission', permission);
      fixture.detectChanges();
    };

    const deviceRows = (): HTMLElement[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          '[data-testid="settings-notifications-device"]',
        ),
      );

    const byTestId = (testId: string): HTMLElement | null =>
      fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);

    it('should render one row per registered installation', () => {
      setInstallations([
        installation({ token: 'token-1', isCurrentDevice: true }),
        installation({ token: 'token-2', label: 'Pixel 7' }),
      ]);

      expect(deviceRows()).toHaveLength(2);
      // The FCM token is a delivery address, not something a user recognises.
      expect(fixture.nativeElement.textContent).not.toContain('token-1');
      expect(fixture.nativeElement.textContent).toContain('iPhone');
      expect(fixture.nativeElement.textContent).toContain('Pixel 7');
    });

    it('should mark the current installation', () => {
      setInstallations([installation({ isCurrentDevice: true })]);

      expect(
        deviceRows()[0].querySelector(
          '[data-testid="settings-notifications-current-device"]',
        ),
      ).not.toBeNull();
    });

    it('should fall back to a translated label for a legacy installation', () => {
      // A token registered before installation metadata existed still has to be
      // manageable, and must not be labelled with its raw token.
      setInstallations([installation({ label: '', details: '' })]);

      expect(
        deviceRows()[0].querySelector(
          '[data-testid="settings-notifications-unknown-device"]',
        ),
      ).not.toBeNull();
    });

    it('should offer the setup action only while this device has no token', () => {
      setInstallations([installation({ isCurrentDevice: false })]);

      expect(byTestId('settings-notifications-enable-device')).not.toBeNull();

      setInstallations([installation({ isCurrentDevice: true })]);

      expect(byTestId('settings-notifications-enable-device')).toBeNull();
    });

    it('should replace the setup action with a recovery route once the OS denied', () => {
      // The OS ignores further permission requests after a denial, so offering
      // the prompt again would be a button that does nothing.
      setInstallations([], 'denied');

      expect(byTestId('settings-notifications-enable-device')).toBeNull();
      expect(byTestId('settings-notifications-blocked')).not.toBeNull();
      expect(
        byTestId('settings-notifications-open-device-settings'),
      ).not.toBeNull();
    });

    it('should keep a registered row alongside the OS-blocked warning', () => {
      // A revoked OS permission stops delivery without changing what BiteTribe
      // was told to send, so both states stay visible and separate.
      setInstallations(
        [installation({ isCurrentDevice: true, enabled: true })],
        'denied',
      );

      expect(deviceRows()).toHaveLength(1);
      expect(byTestId('settings-notifications-blocked')).not.toBeNull();
    });

    it('should show a truthful unsupported state instead of a dead action', () => {
      setInstallations([], 'unsupported');

      expect(byTestId('settings-notifications-unsupported')).not.toBeNull();
      expect(byTestId('settings-notifications-enable-device')).toBeNull();
    });

    it('should say nothing beyond the unsupported line when there is no device at all', () => {
      // Web with no registered installation: the intro copy would promise a
      // choice that is not there, and the empty note would restate the line
      // above it.
      setInstallations([], 'unsupported');

      expect(byTestId('settings-notifications-unsupported')).not.toBeNull();
      expect(byTestId('settings-notifications-copy')).toBeNull();
      expect(byTestId('settings-notifications-empty')).toBeNull();
    });

    it('should state what this device can do before introducing the list', () => {
      // "Notifications are not available on this device" explains the absent
      // current-device row, so it has to be read before the list it explains.
      setInstallations([installation()], 'unsupported');

      const section = byTestId('settings-notifications') as HTMLElement;
      const order = Array.from(
        section.querySelectorAll(
          '[data-testid="settings-notifications-unsupported"], [data-testid="settings-notifications-copy"]',
        ),
      ).map((element) => element.getAttribute('data-testid'));

      expect(order).toEqual([
        'settings-notifications-unsupported',
        'settings-notifications-copy',
      ]);
    });

    it('should introduce the list only once there is one', () => {
      setInstallations([], 'prompt');

      expect(byTestId('settings-notifications-copy')).toBeNull();
      // On a platform that can register, the empty list is still worth stating
      // next to the setup action.
      expect(byTestId('settings-notifications-empty')).not.toBeNull();
      expect(byTestId('settings-notifications-enable-device')).not.toBeNull();

      setInstallations([installation()], 'prompt');

      expect(byTestId('settings-notifications-copy')).not.toBeNull();
    });

    it('should still list and manage other installations where push is unsupported', () => {
      // The list is account data. Signing in from the web build must not hide
      // the phones the user actually receives notifications on.
      setInstallations(
        [
          installation({ token: 'token-1', label: 'iPhone' }),
          installation({ token: 'token-2', label: 'Pixel 7' }),
        ],
        'unsupported',
      );

      expect(deviceRows()).toHaveLength(2);
      expect(deviceRows()[0].querySelector('ion-toggle')).not.toBeNull();
      expect(byTestId('settings-notifications-unsupported')).not.toBeNull();
    });

    it('should emit the token and the new state when a switch changes', () => {
      const toggleSpy = jest.spyOn(component.togglePushInstallation, 'emit');
      const row = installation({ token: 'token-9', enabled: true });

      component.onPushInstallationToggle(row, { detail: { checked: false } });

      expect(toggleSpy).toHaveBeenCalledWith({
        token: 'token-9',
        enabled: false,
      });
    });

    it('should ignore a change event that matches the current state', () => {
      // Ionic emits `ionChange` when the bound value is applied, so reloading
      // the list must not write every row back to Firestore.
      const toggleSpy = jest.spyOn(component.togglePushInstallation, 'emit');
      const row = installation({ enabled: true });

      component.onPushInstallationToggle(row, { detail: { checked: true } });

      expect(toggleSpy).not.toHaveBeenCalled();
    });
  });
});
