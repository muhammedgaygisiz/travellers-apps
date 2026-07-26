/* eslint-disable @typescript-eslint/no-empty-function */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { addNecessaryIcons } from 'utils';
import type { WeekRange } from 'model';
import { HomeService } from '../home.service';
import { WeeklyBitesContainer } from '../weekly-bites.container';

jest.mock('@capacitor-firebase/analytics');

addNecessaryIcons();

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn((): string => 'en'),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

// Monday 14 July 2025 00:00 – Sunday 20 July 2025 23:59:59.999, Europe/Zurich.
const WEEK: WeekRange = {
  weekStart: Date.UTC(2025, 6, 13, 22, 0, 0, 0),
  weekEnd: Date.UTC(2025, 6, 20, 21, 59, 59, 999),
};

describe('WeeklyBitesContainer', () => {
  let component: WeeklyBitesContainer;
  let fixture: ComponentFixture<WeeklyBitesContainer>;
  const weeklyBitesRange = signal<WeekRange | undefined>(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    MockTranslocoService.translate.mockImplementation((key: string) => key);
    MockTranslocoService.getActiveLang.mockReturnValue('en');
    weeklyBitesRange.set(undefined);

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        { provide: TranslocoService, useValue: MockTranslocoService },
        {
          provide: HomeService,
          useValue: {
            weeklyBites: signal([]),
            weeklyBitesLoading: signal(false),
            weeklyBitesSorting: signal('createdAt'),
            weeklyBitesRange,
            userId: signal('user-1'),
            hasErrorLoadingGpsPosition: signal(false),
            logout: (): void => {},
            likeButtonClicked: (): void => {},
            biteClicked: (): void => {},
            onMenuNavigate: (): void => {},
            weeklyBitesSortingChange: (): void => {},
            reloadWeeklyBites: (): void => {},
            closeGpsError: (): void => {},
            enableLocation: (): void => {},
            rateNowClicked: (): void => {},
          },
        },
      ],
    });

    fixture = TestBed.createComponent(WeeklyBitesContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('pageTitle', () => {
    it('should show the page name alone until the week is known', () => {
      // The deep link may resolve to a different week than the current one, so
      // no range is shown before the backend answers.
      expect(component.pageTitle()).toBe('weekly-bites');
    });

    it('should append the week the bites belong to', () => {
      weeklyBitesRange.set(WEEK);

      expect(component.pageTitle()).toBe('weekly-bites · Jul 14 – Jul 20');
    });
  });

  describe('ionViewDidEnter', () => {
    it('should set current screen to "Weekly Bites"', () => {
      const setCurrentScreenSpy = jest.spyOn(
        FirebaseAnalytics,
        'setCurrentScreen',
      );

      component.ionViewDidEnter();

      expect(setCurrentScreenSpy).toHaveBeenCalledWith({
        screenName: 'Weekly Bites',
      });
    });
  });
});
