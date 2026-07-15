import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ONBOARDING_STEPS } from '../../steps/onboarding-steps';
import { OnboardingContainerComponent } from '../onboarding-container.component';
import { OnboardingService } from '../onboarding.service';

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
    initialize: jest.Mock;
    next: jest.Mock;
    back: jest.Mock;
    setCurrentStepValid: jest.Mock;
  };

  beforeEach(() => {
    serviceMock = {
      steps: ONBOARDING_STEPS,
      currentIndex: signal(0),
      canAdvance: signal(false),
      isCurrentStepValid: signal(false),
      initialize: jest.fn().mockResolvedValue(undefined),
      next: jest.fn(),
      back: jest.fn(),
      setCurrentStepValid: jest.fn(),
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
