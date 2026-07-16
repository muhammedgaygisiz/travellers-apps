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
import type { PublicUser } from 'model';
import type { DisplayNameAvailabilityState } from '../../components/identity-step/identity-step.component';
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
    steps: typeof ONBOARDING_STEPS;
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
    requestNotifications: jest.Mock;
    skipNotifications: jest.Mock;
  };

  beforeEach(() => {
    serviceMock = {
      steps: ONBOARDING_STEPS,
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
      requestNotifications: jest.fn(),
      skipNotifications: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: OnboardingService, useValue: serviceMock },
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
    [4, 'onboarding-notification-step'],
  ])('renders the step component for step index %i', (index, selector) => {
    serviceMock.currentStep.mockReturnValue(ONBOARDING_STEPS[index]);
    serviceMock.currentIndex.set(index);

    fixture.detectChanges();

    expect(
      fixture.debugElement.nativeElement.querySelector(selector),
    ).toBeTruthy();
  });

  it('keeps the acknowledgement placeholder for the steps still to come', () => {
    // Only the finish step (#1016) is still a placeholder.
    serviceMock.currentStep.mockReturnValue(ONBOARDING_STEPS[5]);
    serviceMock.currentIndex.set(5);

    fixture.detectChanges();

    expect(
      fixture.debugElement.nativeElement.querySelector(
        '[data-testid="onboarding-acknowledge"]',
      ),
    ).toBeTruthy();
  });

  it('routes currency, language, and notification events into the service', () => {
    serviceMock.currentStep.mockReturnValue(ONBOARDING_STEPS[2]);
    serviceMock.currentIndex.set(2);
    fixture.detectChanges();

    const page = fixture.debugElement.query(By.directive(OnboardingPage))
      .componentInstance as OnboardingPage;

    page.currencyChange.emit('JPY');
    page.favoriteCurrencyToggle.emit('USD');
    page.languageChange.emit('tr');
    page.enableNotifications.emit();
    page.skipNotifications.emit();

    expect(serviceMock.updateCurrency).toHaveBeenCalledWith('JPY');
    expect(serviceMock.toggleFavoriteCurrency).toHaveBeenCalledWith('USD');
    expect(serviceMock.updateLanguage).toHaveBeenCalledWith('tr');
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
