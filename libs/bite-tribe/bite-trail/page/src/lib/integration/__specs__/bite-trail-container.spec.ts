import { TestBed } from '@angular/core/testing';
import { BiteTrailContainerComponent } from '../bite-trail.container';
import { BiteTrailService } from '../bite-trail.service';
import { signal } from '@angular/core';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { getIonicConfig } from 'utils';

jest.mock('localization');
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
  biteClicked: jest.fn(),
  restaurantClicked: jest.fn(),
  likeButtonClicked: jest.fn(),
  sortingChange: jest.fn(),
  openMapView: jest.fn(),
  getBiteTrailId: jest.fn().mockReturnValue('trail-1'),
};

describe(BiteTrailContainerComponent.name, () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiteTrailContainerComponent],
      providers: [
        provideIonicAngular(getIonicConfig()),
        { provide: BiteTrailService, useValue: mockBiteTrailService },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(BiteTrailContainerComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
