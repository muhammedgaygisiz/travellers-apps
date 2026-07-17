import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import {
  CoachMarkComponent,
  CoachMarkStateService,
} from 'bite-tribe/coach-mark';
import { of } from 'rxjs';
import { BiteTribeHomeComponent } from '../../components/page/home.component';
import { HomeContainer } from '../home.container';
import { HomeService } from '../home.service';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const MockHomeService = {
  sortedHomeBites: signal([]),
  allTags: signal([]),
  homeFilters: signal([]),
  userId: signal('user-1'),
  isAuthenticated: signal(true),
  isBitesLoading: signal(false),
  sorting: signal('distance'),
  homeDistance: signal<number | undefined>(undefined),
  preferedCurrency: signal('EUR'),
  maxPriceHome: signal(0),
  isReloading: signal(false),
  hasErrorLoadingGpsPosition: signal(false),
  networkStatus: signal(undefined),
  emailVerificationPromptVisible: signal(false),
  logout: jest.fn(),
  likeButtonClicked: jest.fn(),
  biteClicked: jest.fn(),
  onAddButtonClicked: jest.fn(),
  onMenuNavigate: jest.fn(),
  onGotoSearchClick: jest.fn(),
  openMapView: jest.fn(),
  sortingChange: jest.fn(),
  filtersChanged: jest.fn(),
  filtersCleared: jest.fn(),
  refresh: jest.fn(),
  closeGpsError: jest.fn(),
  rateNowClicked: jest.fn(),
  resendEmailVerification: jest.fn(),
  trackEmailVerificationPromptShown: jest.fn(),
};

describe(HomeContainer.name, () => {
  let fixture: ComponentFixture<HomeContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HomeContainer],
      providers: [
        { provide: HomeService, useValue: MockHomeService },
        {
          provide: CoachMarkStateService,
          useValue: {
            hasSeen: jest.fn(() => new Promise<boolean>(() => undefined)),
            markSeen: jest.fn(),
          },
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).overrideComponent(HomeContainer, {
      remove: { imports: [BiteTribeHomeComponent] },
      add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });

    fixture = TestBed.createComponent(HomeContainer);
    fixture.detectChanges();
  });

  it('queues the Home coach marks from the page intro to the footer', () => {
    const marks = fixture.debugElement
      .queryAll(By.directive(CoachMarkComponent))
      .map(
        (debugElement) => debugElement.componentInstance as CoachMarkComponent,
      );

    expect(marks.map((mark) => mark.surface())).toEqual([
      'home-feed',
      'home-menu',
      'home-feed-controls',
      'create-bite',
    ]);
    expect(marks[1].anchorTestId()).toBe('btn-menu');
    expect(marks[2].anchorTestId()).toBe('home-feed-controls');
    expect(marks[1].enabled()).toBe(false);
    expect(marks[2].enabled()).toBe(false);
    expect(marks[3].enabled()).toBe(false);

    marks[0].settled.emit();
    fixture.detectChanges();

    expect(marks[1].enabled()).toBe(true);
    expect(marks[2].enabled()).toBe(false);
    expect(marks[3].enabled()).toBe(false);

    marks[1].settled.emit();
    fixture.detectChanges();

    expect(marks[2].enabled()).toBe(true);
    expect(marks[3].enabled()).toBe(false);

    marks[2].settled.emit();
    fixture.detectChanges();

    expect(marks[3].enabled()).toBe(true);
  });
});
