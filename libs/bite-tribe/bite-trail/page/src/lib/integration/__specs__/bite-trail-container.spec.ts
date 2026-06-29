import { TestBed } from '@angular/core/testing';
import { BiteTrailContainerComponent } from '../bite-trail.container';
import { BiteTrailService } from '../bite-trail.service';
import { signal } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

jest.mock('@capacitor-firebase/analytics', () => ({
  FirebaseAnalytics: {
    setCurrentScreen: jest.fn(),
  },
}));

const mockBiteTrailService = {
  bites: signal([]),
  title: signal('Test Bite Trail'),
  sorting: signal('distance'),
  userId: signal('user-1'),
  isAuthenticated: signal(true),
  biteTrailId: signal('trail-1'),
  isFree: signal(false),
  savedBucketlistId: signal<string | null>(null),
  biteClicked: jest.fn(),
  likeButtonClicked: jest.fn(),
  sortingChange: jest.fn(),
  openMapView: jest.fn(),
  getForFree: jest.fn(),
  goToSavedBucketList: jest.fn(),
};

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(BiteTrailContainerComponent.name, () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTrailContainerComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: BiteTrailService, useValue: mockBiteTrailService },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(BiteTrailContainerComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('ionViewDidEnter', () => {
    it('should set current screen to Bite Trail', () => {
      jest.spyOn(FirebaseAnalytics, 'setCurrentScreen');
      const fixture = TestBed.createComponent(BiteTrailContainerComponent);
      fixture.componentInstance.ionViewDidEnter();
      expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
        screenName: 'Bite Trail',
      });
    });
  });
});
