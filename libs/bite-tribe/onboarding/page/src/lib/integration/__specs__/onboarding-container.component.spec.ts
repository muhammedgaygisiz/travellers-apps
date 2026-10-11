import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ONBOARDING_STEPS } from '../../steps/onboarding-steps';
import { OnboardingContainerComponent } from '../onboarding-container.component';
import { OnboardingService } from '../onboarding.service';
import { OnboardingPage } from '../../components/onboarding-page/onboarding.page';
import type { FollowSuggestion, PublicUser } from 'model';
import { FollowSuggestionsService } from 'bite-tribe/follow-suggestions-data-access';
import type { DisplayNameAvailabilityState } from '../../components/identity-step/identity-step.component';
import type { LocationPermissionState } from '../../components/location-step/location-step.component';
import type { PhotoLocationPermissionState } from '../../components/photos-step/photos-step.component';
import type { NotificationPermissionState } from '../../components/notification-step/notification-step.component';

jest.mock('@capacitor-firebase/analytics');

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(OnboardingContainerComponent.name, () => {
  let component: OnboardingContainerComponent;
  let fixture: ComponentFixture<OnboardingContainerComponent>;
  let serviceMock: {
    steps: ReturnType<typeof signal<typeof ONBOARDING_STEPS>>;
    currentIndex: ReturnType<typeof signal<number>>;
    canAdvance: ReturnType<typeof signal<boolean>>;
    isCurrentStepValid: ReturnType<typeof signal<boolean>>;
    currentStep: jest.Mock;
    profile: ReturnType<typeof signal<PublicUser | undefined>>;
    displayNameAvailability: ReturnType<
      typeof signal<DisplayNameAvailabilityState>
    >;
    selectedVisibility: ReturnType<typeof signal<boolean | null>>;
    selectedCurrency: ReturnType<typeof signal<string>>;
    favoriteCurrencies: ReturnType<typeof signal<readonly string[]>>;
    selectedLanguage: ReturnType<typeof signal<string>>;
    locationPermission: ReturnType<typeof signal<LocationPermissionState>>;
    homeCity: ReturnType<typeof signal<string>>;
    photoLocationPermission: ReturnType<
      typeof signal<PhotoLocationPermissionState>
    >;
    notificationPermission: ReturnType<
      typeof signal<NotificationPermissionState>
    >;
    initialize: jest.Mock;
    next: jest.Mock;
    back: jest.Mock;
    setCurrentStepValid: jest.Mock;
    updateIdentity: jest.Mock;
    checkDisplayNameAvailability: jest.Mock;
    updateVisibility: jest.Mock;
    updateCurrency: jest.Mock;
    toggleFavoriteCurrency: jest.Mock;
    updateLanguage: jest.Mock;
    requestLocation: jest.Mock;
    skipLocation: jest.Mock;
    updateHomeCity: jest.Mock;
    requestPhotoLocation: jest.Mock;
    skipPhotoLocation: jest.Mock;
    requestNotifications: jest.Mock;
    skipNotifications: jest.Mock;
  };

  const ana: FollowSuggestion = {
    userId: 'ana',
    displayName: 'Ana',
    biteCount: 3,
    reason: 'nearby',
  };
  let followSuggestionsMock: {
    suggestions: ReturnType<typeof signal<FollowSuggestion[]>>;
    pendingIds: ReturnType<typeof signal<ReadonlySet<string>>>;
    isLoading: ReturnType<typeof signal<boolean>>;
    request: jest.Mock;
    follow: jest.Mock;
    trackShown: jest.Mock;
  };

  beforeEach(() => {
    followSuggestionsMock = {
      suggestions: signal<FollowSuggestion[]>([]),
      pendingIds: signal<ReadonlySet<string>>(new Set()),
      isLoading: signal(false),
      request: jest.fn(),
      follow: jest.fn().mockResolvedValue(true),
      trackShown: jest.fn(),
    };
    serviceMock = {
      steps: signal(ONBOARDING_STEPS),
      currentIndex: signal(0),
      canAdvance: signal(false),
      isCurrentStepValid: signal(false),
      currentStep: jest.fn(() => ONBOARDING_STEPS[0]),
      profile: signal<PublicUser | undefined>(undefined),
      displayNameAvailability: signal<DisplayNameAvailabilityState>('idle'),
      selectedVisibility: signal<boolean | null>(false),
      selectedCurrency: signal('EUR'),
      favoriteCurrencies: signal<readonly string[]>([]),
      selectedLanguage: signal('en'),
      locationPermission: signal<LocationPermissionState>('idle'),
      homeCity: signal(''),
      photoLocationPermission: signal<PhotoLocationPermissionState>('idle'),
      notificationPermission: signal<NotificationPermissionState>('idle'),
      initialize: jest.fn().mockResolvedValue(undefined),
      next: jest.fn(),
      back: jest.fn(),
      setCurrentStepValid: jest.fn(),
      updateIdentity: jest.fn(),
      checkDisplayNameAvailability: jest.fn(),
      updateVisibility: jest.fn(),
      updateCurrency: jest.fn(),
      toggleFavoriteCurrency: jest.fn(),
      updateLanguage: jest.fn(),
      requestLocation: jest.fn(),
      skipLocation: jest.fn(),
      updateHomeCity: jest.fn(),
      requestPhotoLocation: jest.fn(),
      skipPhotoLocation: jest.fn(),
      requestNotifications: jest.fn(),
      skipNotifications: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: OnboardingService, useValue: serviceMock },
        { provide: FollowSuggestionsService, useValue: followSuggestionsMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingContainerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('initializes the assistant when the view enters', async () => {
    await component.ionViewWillEnter();

    expect(serviceMock.initialize).toHaveBeenCalledTimes(1);
  });

  it('advances through the service when the shell emits next', () => {
    fixture.detectChanges();

    fixture.debugElement.nativeElement
      .querySelector('onboarding-page')
      .dispatchEvent(new CustomEvent('next'));

    expect(serviceMock.next).toHaveBeenCalledTimes(1);
  });

  it('renders the identity step for the identity step id', () => {
    serviceMock.currentStep.mockReturnValue(ONBOARDING_STEPS[0]);

    fixture.detectChanges();

    expect(
      fixture.debugElement.nativeElement.querySelector(
        'onboarding-identity-step',
      ),
    ).toBeTruthy();
  });

  it('renders the visibility step for the visibility step id', () => {
    serviceMock.currentStep.mockReturnValue(ONBOARDING_STEPS[1]);
    serviceMock.currentIndex.set(1);

    fixture.detectChanges();

    expect(
      fixture.debugElement.nativeElement.querySelector(
        'onboarding-visibility-step',
      ),
    ).toBeTruthy();
  });

  it.each([
    [2, 'onboarding-currency-step'],
    [3, 'onboarding-language-step'],
    [4, 'onboarding-location-step'],
    [5, 'onboarding-photos-step'],
    [6, 'onboarding-notification-step'],
  ])('renders the step component for step index %i', (index, selector) => {
    serviceMock.currentStep.mockReturnValue(ONBOARDING_STEPS[index]);
    serviceMock.currentIndex.set(index);

    fixture.detectChanges();

    expect(
      fixture.debugElement.nativeElement.querySelector(selector),
    ).toBeTruthy();
  });

  it('renders the finish step on the final step', () => {
    serviceMock.currentStep.mockReturnValue(ONBOARDING_STEPS[7]);
    serviceMock.currentIndex.set(7);

    fixture.detectChanges();

    expect(
      fixture.debugElement.nativeElement.querySelector(
        'onboarding-finish-step',
      ),
    ).toBeTruthy();
    // Every step now has a real component, so the acknowledgement placeholder is
    // no longer reachable.
    expect(
      fixture.debugElement.nativeElement.querySelector(
        '[data-testid="onboarding-acknowledge"]',
      ),
    ).toBeNull();
  });

  describe('follow suggestions', () => {
    const finishStep = (): HTMLElement =>
      fixture.debugElement.nativeElement.querySelector(
        'onboarding-finish-step',
      );

    beforeEach(() => {
      serviceMock.currentStep.mockReturnValue(ONBOARDING_STEPS[7]);
      serviceMock.currentIndex.set(7);
    });

    it('asks for suggestions on reaching the finish step', () => {
      fixture.detectChanges();

      expect(followSuggestionsMock.request).toHaveBeenCalled();
    });

    it('does not ask before the steps are known', () => {
      serviceMock.currentStep.mockReturnValue(undefined);

      fixture.detectChanges();

      expect(followSuggestionsMock.request).not.toHaveBeenCalled();
    });

    it('does not ask before then', () => {
      serviceMock.currentStep.mockReturnValue(ONBOARDING_STEPS[0]);
      serviceMock.currentIndex.set(0);

      fixture.detectChanges();

      expect(followSuggestionsMock.request).not.toHaveBeenCalled();
    });

    it('follows from the finish step as the onboarding surface', () => {
      followSuggestionsMock.suggestions.set([ana]);
      fixture.detectChanges();

      (
        fixture.debugElement.nativeElement.querySelector(
          '[data-testid="follow-suggestion-follow"]',
        ) as HTMLElement
      ).click();

      expect(followSuggestionsMock.follow).toHaveBeenCalledWith(
        ana,
        'onboarding',
      );
      expect(followSuggestionsMock.trackShown).toHaveBeenCalledWith(
        'onboarding',
        1,
      );
      expect(finishStep()).toBeTruthy();
    });
  });

  it('routes currency, language, location, and notification events into the service', () => {
    serviceMock.currentStep.mockReturnValue(ONBOARDING_STEPS[2]);
    serviceMock.currentIndex.set(2);
    fixture.detectChanges();

    const page = fixture.debugElement.query(By.directive(OnboardingPage))
      .componentInstance as OnboardingPage;

    page.currencyChange.emit('JPY');
    page.favoriteCurrencyToggle.emit('USD');
    page.languageChange.emit('tr');
    page.enableLocation.emit();
    page.skipLocation.emit();
    page.enableNotifications.emit();
    page.skipNotifications.emit();

    expect(serviceMock.updateCurrency).toHaveBeenCalledWith('JPY');
    expect(serviceMock.toggleFavoriteCurrency).toHaveBeenCalledWith('USD');
    expect(serviceMock.updateLanguage).toHaveBeenCalledWith('tr');
    expect(serviceMock.requestLocation).toHaveBeenCalledTimes(1);
    expect(serviceMock.skipLocation).toHaveBeenCalledTimes(1);
    expect(serviceMock.requestNotifications).toHaveBeenCalledTimes(1);
    expect(serviceMock.skipNotifications).toHaveBeenCalledTimes(1);
  });

  it('goes back through the service when the shell emits back', () => {
    fixture.detectChanges();

    fixture.debugElement.nativeElement
      .querySelector('onboarding-page')
      .dispatchEvent(new CustomEvent('back'));

    expect(serviceMock.back).toHaveBeenCalledTimes(1);
  });

  describe('ionViewDidEnter', () => {
    it('should set current screen to Onboarding', () => {
      jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');

      component.ionViewDidEnter();

      expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
        screenName: 'Onboarding',
      });
    });
  });
});
