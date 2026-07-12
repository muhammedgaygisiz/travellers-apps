import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RestaurantContainer } from '../restaurant-container.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { RestaurantService } from '../restaurant.service';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';

jest.mock('@capacitor-firebase/analytics');

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(RestaurantContainer.name, () => {
  let component: RestaurantContainer;
  let fixture: ComponentFixture<RestaurantContainer>;
  const logEventMock = jest.fn();

  beforeEach(() => {
    logEventMock.mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: RestaurantService,
          useValue: {},
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
        { provide: AnalyticsService, useValue: { logEvent: logEventMock } },
      ],
    });

    fixture = TestBed.createComponent(RestaurantContainer);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set current screen on ionViewDidEnter', () => {
    const { FirebaseAnalytics } = jest.requireMock(
      '@capacitor-firebase/analytics',
    );
    FirebaseAnalytics.setCurrentScreen = jest.fn();

    component.ionViewDidEnter();

    expect(FirebaseAnalytics.setCurrentScreen).toHaveBeenCalledWith({
      screenName: 'Restaurant',
    });
  });

  it('should log the restaurant_viewed event as verified on ionViewDidEnter', () => {
    component.ionViewDidEnter();

    expect(logEventMock).toHaveBeenCalledWith(AnalyticsEvent.RestaurantViewed, {
      verified: true,
    });
  });
});
