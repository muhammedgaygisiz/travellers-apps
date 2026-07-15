import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
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
  let dismiss: jest.Mock;

  beforeEach(() => {
    dismiss = jest.fn();

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: OnboardingService, useValue: { dismiss } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingContainerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('dismisses through the service when the page emits', () => {
    fixture.detectChanges();

    fixture.debugElement.nativeElement
      .querySelector('onboarding-page')
      .dispatchEvent(new CustomEvent('dismiss'));

    expect(dismiss).toHaveBeenCalledTimes(1);
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
