import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UnverifiedRestaurantContainer } from '../unverified-restaurant-container.component';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { RestaurantService } from '../restaurant.service';
import { TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';

jest.mock('@capacitor-firebase/analytics');

const MockTranslocoService = {
  translate: jest.fn((key: string): string => key),
  config: {
    reRenderOnLangChange: jest.fn(),
  },
  langChanges$: of(),
};

describe(UnverifiedRestaurantContainer.name, () => {
  let component: UnverifiedRestaurantContainer;
  let fixture: ComponentFixture<UnverifiedRestaurantContainer>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideIonicAngular(),
        {
          provide: RestaurantService,
          useValue: {},
        },
        { provide: TranslocoService, useValue: MockTranslocoService },
      ],
    });

    fixture = TestBed.createComponent(UnverifiedRestaurantContainer);
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
      screenName: 'Unverified Restaurant',
    });
  });
});
