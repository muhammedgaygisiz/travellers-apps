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

  it('queues the introduction, share, and navigation coach marks', () => {
    fixture.detectChanges();

    const marks = fixture.debugElement
      .queryAll(By.directive(CoachMarkComponent))
      .map(
        (debugElement) => debugElement.componentInstance as CoachMarkComponent,
      );

    expect(marks.map((mark) => mark.surface())).toEqual([
      'bite-details',
      'bite-details-share',
      'bite-details-navigation',
    ]);
    expect(marks[0].anchor()).toBeNull();
    expect(marks[0].anchorTestId()).toBeNull();
    expect(marks[0].enabled()).toBe(false);
    expect(marks[1].anchorTestId()).toBe('bite-details-share');
    expect(marks[1].enabled()).toBe(false);
    expect(marks[2].anchorTestId()).toBe('bite-details-navigation');
    expect(marks[2].enabled()).toBe(false);

    biteSignal.set({ id: 'bite-1', name: 'Pizza' } as Bite);
    fixture.detectChanges();

    expect(marks[0].enabled()).toBe(true);
    expect(marks[1].enabled()).toBe(false);
    expect(marks[2].enabled()).toBe(false);

    marks[0].settled.emit();
    fixture.detectChanges();

    expect(marks[1].enabled()).toBe(true);
    expect(marks[2].enabled()).toBe(false);

    marks[1].settled.emit();
    fixture.detectChanges();

    expect(marks[2].enabled()).toBe(true);
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
