import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DetailsContainer } from '../details.container';
import { DetailsService } from '../details.service';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { signal } from '@angular/core';
import { addNecessaryIcons } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { Bite } from 'model';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import {
  CoachMarkComponent,
  CoachMarkStateService,
} from 'bite-tribe/coach-mark';

jest.mock('@capacitor-firebase/analytics');

jest.mock('heic2any', () => jest.fn());

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(DetailsContainer.name, () => {
  let component: DetailsContainer;
  let fixture: ComponentFixture<DetailsContainer>;
  const biteSignal = signal<Bite | undefined>(undefined);
  const biteReloadSpy = jest.fn();
  const logEventMock = jest.fn();

  beforeEach(() => {
    biteSignal.set(undefined);
    biteReloadSpy.mockClear();
    logEventMock.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: DetailsService,
          useValue: {
            bite: {
              value: biteSignal,
              error: signal(undefined),
              reload: biteReloadSpy,
            },
            position: {
              value: signal(undefined),
              error: signal(undefined),
              reload: jest.fn(),
            },
            reviews: signal([]),
            currentPosition: {
              value: signal(undefined),
            },
            bucketlists: signal([]),
            userId: signal('user-1'),
            biteCreator: {
              value: signal(undefined),
              error: signal(undefined),
              reload: jest.fn(),
            },
            exchangeRates: signal({}),
            preferredCurrency: signal('EUR'),
            isAuthenticated: signal(true),
          },
        },
        {
          provide: CoachMarkStateService,
          useValue: {
            hasSeen: jest.fn(() => new Promise<boolean>(() => undefined)),
            markSeen: jest.fn(),
          },
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: AnalyticsService, useValue: { logEvent: logEventMock } },
      ],
    });

    fixture = TestBed.createComponent(DetailsContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('enables the centered Bite-details introduction after the Bite loads', () => {
    fixture.detectChanges();

    const mark = fixture.debugElement.query(By.directive(CoachMarkComponent))
      .componentInstance as CoachMarkComponent;

    expect(mark.surface()).toBe('bite-details');
    expect(mark.anchor()).toBeNull();
    expect(mark.anchorTestId()).toBeNull();
    expect(mark.enabled()).toBe(false);

    biteSignal.set({ id: 'bite-1', name: 'Pizza' } as Bite);
    fixture.detectChanges();

    expect(mark.enabled()).toBe(true);
  });

  describe('ionViewDidEnter', () => {
    let setCurrentScreenSpy: jest.SpyInstance;

    beforeEach(() => {
      setCurrentScreenSpy = jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');
    });

    it('should call FirebaseAnalytics.setCurrentScreen with correct screen name', () => {
      component.ionViewDidEnter();

      expect(setCurrentScreenSpy).toHaveBeenCalledWith({
        screenName: 'Bite Details',
      });
    });

    it('should log the bite_viewed analytics event', () => {
      component.ionViewDidEnter();

      expect(logEventMock).toHaveBeenCalledWith(AnalyticsEvent.BiteViewed);
    });

    it('should refresh bite when bite value already exists', () => {
      biteSignal.set({ id: 'bite-1' } as Bite);

      component.ionViewDidEnter();

      expect(biteReloadSpy).toHaveBeenCalled();
    });
  });
});
