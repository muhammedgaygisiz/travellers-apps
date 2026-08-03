import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslocoService } from '@jsverse/transloco';
import {
  CoachMarkComponent,
  CoachMarkStateService,
} from 'bite-tribe/coach-mark';
import type { Bite } from 'model';
import { of } from 'rxjs';
import { BiteTribeHomeComponent } from '../../components/page/home.component';
import { BucketListContainer } from '../bucket-list.container';
import { HomeService } from '../home.service';

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: { reRenderOnLangChange: jest.fn() },
  langChanges$: of(),
};

const bitesBySelectedBucketlist = signal<Bite[]>([]);

const MockHomeService = {
  bitesBySelectedBucketlist,
  selectedBucketlistTitle: signal('My list'),
  triedOutBiteIds: signal<string[]>([]),
  userId: signal('user-1'),
  isAuthenticated: signal(true),
  isReloading: signal(false),
  hasErrorLoadingGpsPosition: signal(false),
  locationPermissionState: signal(undefined),
  logout: jest.fn(),
  likeButtonClicked: jest.fn(),
  biteClicked: jest.fn(),
  onAddButtonClicked: jest.fn(),
  onMenuNavigate: jest.fn(),
  onGotoEditClick: jest.fn(),
  openMapView: jest.fn(),
  refresh: jest.fn(),
  closeGpsError: jest.fn(),
  enableLocation: jest.fn(),
  toggleTriedOut: jest.fn(),
  rateNowClicked: jest.fn(),
};

describe(BucketListContainer.name, () => {
  let fixture: ComponentFixture<BucketListContainer>;

  const coachMark = (): CoachMarkComponent =>
    fixture.debugElement.query(By.directive(CoachMarkComponent))
      .componentInstance as CoachMarkComponent;

  beforeEach(() => {
    bitesBySelectedBucketlist.set([]);

    TestBed.configureTestingModule({
      imports: [BucketListContainer],
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
    }).overrideComponent(BucketListContainer, {
      remove: { imports: [BiteTribeHomeComponent] },
      add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
    });

    fixture = TestBed.createComponent(BucketListContainer);
    fixture.detectChanges();
  });

  it('anchors the swipe coach mark on the first bite of the list', () => {
    expect(coachMark().surface()).toBe('bucket-list-swipe');
    expect(coachMark().anchorTestId()).toBe('bite-tried-out-swipe');
  });

  it('holds the swipe coach mark back while the bucket list has no bites', () => {
    expect(coachMark().enabled()).toBe(false);
  });

  it('enables the swipe coach mark once the bucket list has a bite to swipe', () => {
    bitesBySelectedBucketlist.set([{ id: 'bite-1' } as Bite]);
    fixture.detectChanges();

    expect(coachMark().enabled()).toBe(true);
  });
});
