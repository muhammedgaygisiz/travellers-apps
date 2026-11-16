import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { getIonicConfig } from 'utils';
import { CountryLeaderboardComponent } from '../country-leaderboard.component';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  getActiveLang: jest.fn(() => 'en'),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const countries = [
  { countryCode: 'CH', biteCount: 40 },
  { countryCode: 'BA', biteCount: 12 },
  { countryCode: 'TR', biteCount: 9 },
  { countryCode: 'IT', biteCount: 4 },
];

describe(CountryLeaderboardComponent.name, () => {
  let fixture: ComponentFixture<CountryLeaderboardComponent>;
  let component: CountryLeaderboardComponent;
  let ref: ComponentRef<CountryLeaderboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CountryLeaderboardComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CountryLeaderboardComponent);
    component = fixture.componentInstance;
    ref = fixture.componentRef;
  });

  it('puts the top 3 countries on the podium with their flags and lists the rest', () => {
    ref.setInput('ranking', { board: 'countries', countries });
    fixture.detectChanges();

    const entry = (rank: number): HTMLElement =>
      fixture.nativeElement.querySelector(
        `[data-testid="country-entry"][data-rank="${rank}"]`,
      );

    expect(entry(1).textContent).toContain('Switzerland');
    expect(entry(1).querySelector('.fi-ch')).not.toBeNull();
    expect(entry(2).textContent).toContain('Bosnia');
    expect(entry(4).tagName.toLowerCase()).toBe('ion-item');
    expect(component.podiumSlots().map((slot) => slot.place)).toEqual([
      2, 1, 3,
    ]);
  });

  it('opens a country’s Bites', () => {
    const opened: string[] = [];
    component.countryClick.subscribe((code) => opened.push(code));
    ref.setInput('ranking', { board: 'countries', countries });
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="country-entry"][data-rank="2"]',
      ) as HTMLElement
    ).click();

    expect(opened).toEqual(['BA']);
  });

  it('switches between this week, last week and all time', () => {
    const boards: string[] = [];
    component.boardChange.subscribe((board) => boards.push(board));

    component.selectTab('allTime');
    component.selectTab('week');
    component.selectWeek('countriesLastWeek');

    expect(boards).toEqual([
      'countriesAllTime',
      'countries',
      'countriesLastWeek',
    ]);
  });

  it('counts down on this week and dates last week', () => {
    ref.setInput('ranking', {
      board: 'countries',
      countries,
      start: Date.UTC(2026, 10, 9),
      end: Date.UTC(2026, 10, 16),
    });
    ref.setInput('now', Date.UTC(2026, 10, 15, 20));
    expect(component.weekEndsIn()).toBe('in 4 hours');

    ref.setInput('board', 'countriesLastWeek');
    ref.setInput('ranking', {
      board: 'countriesLastWeek',
      countries,
      start: Date.UTC(2026, 10, 9),
      end: Date.UTC(2026, 10, 16),
    });
    expect(component.lastWeekDates()).toMatch(/November 9\s*–\s*15/);
  });

  it('shows the empty text for an empty board, not a stale one', () => {
    ref.setInput('board', 'countriesAllTime');
    ref.setInput('ranking', { board: 'countries', countries });
    fixture.detectChanges();

    expect(component.entries()).toEqual([]);
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="country-leaderboard-empty"]',
      ),
    ).not.toBeNull();
  });

  it('shows a skeleton on a first load and keeps a loaded ranking while it refreshes (#2081)', () => {
    const skeleton = (): HTMLElement | null =>
      fixture.nativeElement.querySelector(
        '[data-testid="leaderboard-skeleton"]',
      );

    ref.setInput('isLoading', true);
    fixture.detectChanges();

    expect(skeleton()).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(
        '[data-testid="country-leaderboard-empty"]',
      ),
    ).toBeNull();

    ref.setInput('ranking', { board: 'countries', countries });
    fixture.detectChanges();

    expect(skeleton()).toBeNull();
    expect(
      fixture.nativeElement.querySelectorAll('[data-testid="country-entry"]')
        .length,
    ).toBe(countries.length);
  });
});
